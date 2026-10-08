/**
 * reversibility — undo journal, mutation log and daily vault snapshots.
 *
 * Design: adr/0005-optimize-for-reversibility-over-permission-prompts.md
 *
 * Never blocks a call: autonomy is the point (ADR-0005). Every failure in here is
 * swallowed, because a broken safety net must not take the session down — but a swallowed
 * failure is recorded in the mutation log so it is not silent.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import {
	backup,
	bashTargets,
	configFromEnv,
	expand,
	hashFile,
	inCorpus,
	logMutation,
	newestSnapshotAgeDays,
	pruneSnapshots,
	snapshotVaults,
	type Mutation,
} from "./core.ts";

interface Pending {
	tool: string;
	path: string;
	before: string | null;
	undo: string | null;
	note?: string;
}

export default function reversibility(pi: ExtensionAPI) {
	const cfg = configFromEnv();
	const pending = new Map<string, Pending[]>();
	let session = "?";

	const safe = <T>(fn: () => T): T | undefined => {
		try {
			return fn();
		} catch (e) {
			try {
				logMutation(cfg, { ts: new Date().toISOString(), tool: "reversibility", path: "", before: null, after: null, undo: null, note: `internal error: ${String(e)}`, session });
			} catch {
				/* nothing more to do */
			}
			return undefined;
		}
	};

	pi.on("session_start", (_event, ctx) => {
		session = ctx.sessionManager?.getSessionId?.() ?? "?";
		// Snapshot off the critical path: tar of ~5 MB, detached from the session.
		safe(() => {
			if (process.env.PA_NO_SNAPSHOT) return;
			const child = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", new URL("./snapshot-cli.ts", import.meta.url).pathname], {
				detached: true,
				stdio: "ignore",
				env: process.env,
			});
			child.unref();
			const age = newestSnapshotAgeDays(cfg);
			if (ctx.hasUI && age !== null && age > 2) ctx.ui.notify(`Newest vault snapshot is ${age.toFixed(0)} days old; a new one is being taken.`, "warning");
		});
	});

	pi.on("tool_call", (event, ctx) => {
		safe(() => {
			const cwd = ctx.cwd;
			const list: Pending[] = [];
			if (event.toolName === "write" || event.toolName === "edit") {
				const abs = expand(String((event.input as { path?: string }).path ?? ""), cwd);
				if (!inCorpus(abs, cfg)) return;
				const before = hashFile(abs);
				const b = backup(abs, cfg);
				list.push({ tool: event.toolName, path: abs, before, undo: b.kind === "saved" ? b.undo : null, note: b.kind === "skipped" ? `backup skipped: ${b.reason}` : undefined });
			} else if (event.toolName === "bash") {
				const cmd = String((event.input as { command?: string }).command ?? "");
				for (const abs of bashTargets(cmd, cwd)) {
					if (!inCorpus(abs, cfg)) continue;
					const before = hashFile(abs);
					const b = backup(abs, cfg);
					if (b.kind === "none") continue; // nothing exists to lose or to record
					list.push({ tool: "bash", path: abs, before, undo: b.kind === "saved" ? b.undo : null, note: b.kind === "skipped" ? `backup skipped: ${b.reason}` : `via: ${cmd.slice(0, 160)}` });
				}
			}
			if (list.length) pending.set(event.toolCallId, list);
		});
		return undefined; // never block
	});

	pi.on("tool_result", (event) => {
		safe(() => {
			const list = pending.get(event.toolCallId);
			if (!list) return;
			pending.delete(event.toolCallId);
			for (const p of list) {
				const rec: Mutation = {
					ts: new Date().toISOString(),
					tool: p.tool,
					path: p.path,
					before: p.before,
					after: hashFile(p.path),
					undo: p.undo,
					note: p.note,
					session,
					toolCallId: event.toolCallId,
				};
				if (event.isError) rec.note = `${rec.note ? `${rec.note}; ` : ""}tool reported error`;
				logMutation(cfg, rec);
			}
		});
	});

	// Prune rarely; it is cheap, but there is no reason to do it every launch.
	pi.on("session_shutdown", () => {
		safe(() => {
			if (!process.env.PA_NO_SNAPSHOT) pruneSnapshots(cfg);
		});
	});
}
