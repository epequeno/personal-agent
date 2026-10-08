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
	bashRecursiveDelete,
	bashTargets,
	diffAgainst,
	configFromEnv,
	expand,
	hashFile,
	inCorpus,
	logMutation,
	needsOutbox,
	outboxThreshold,
	setPlanOutcome,
	writePlan,
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
	const threshold = outboxThreshold();
	let seen = new Set<string>(); // distinct corpus files mutated in the current prompt
	let approved = false; // the user approved a held change; covers the rest of the prompt

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

	pi.on("input", (event) => {
		if (event.source === "extension") return;
		seen = new Set();
		approved = false;
	});

	pi.on("tool_call", async (event, ctx) => {
		let held: { plan: string; reasons: string[]; added: string[] } | undefined;
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
					// A path that does not exist yet is a create: nothing to back up, but it still counts.
					list.push({ tool: "bash", path: abs, before, undo: b.kind === "saved" ? b.undo : null, note: b.kind === "skipped" ? `backup skipped: ${b.reason}` : `via: ${cmd.slice(0, 160)}` });
				}
			}
			if (!list.length) return;
			const targets = list.map((p) => p.path);
			const recursive = event.toolName === "bash" && bashRecursiveDelete(String((event.input as { command?: string }).command ?? ""));
			const verdict = needsOutbox(targets, seen, threshold, recursive);
			if (verdict.needed && !approved) {
				let detail: string;
				if (event.toolName === "write") detail = diffAgainst(targets[0], String((event.input as { content?: string }).content ?? ""));
				else detail = JSON.stringify(event.input, null, 2);
				const plan = writePlan(cfg, { session, toolCallId: event.toolCallId, tool: event.toolName, reasons: verdict.reasons, targets, detail });
				held = { plan, reasons: verdict.reasons, added: targets.filter((t) => !seen.has(t)) };
			}
			pending.set(event.toolCallId, list);
			for (const t of targets) seen.add(t);
		});

		if (!held) return undefined;
		const { plan, reasons, added } = held;
		const undoCount = () => added.forEach((t) => seen.delete(t));
		const summary = `Large or destructive change held: ${reasons.join("; ")}.\nPlan: ${plan}`;
		if (ctx.hasUI) {
			const ok = await ctx.ui.confirm("Apply this change?", summary);
			safe(() => setPlanOutcome(plan, ok ? "approved by user" : "denied by user"));
			if (ok) {
				approved = true;
				return undefined;
			}
			pending.delete(event.toolCallId);
			undoCount();
			return { block: true, reason: `The user declined this change. Plan saved at ${plan}.` };
		}
		if (process.env.PA_OUTBOX_POLICY === "deny") {
			safe(() => setPlanOutcome(plan, "denied (headless policy)"));
			pending.delete(event.toolCallId);
			undoCount();
			return { block: true, reason: `Held by outbox policy (${reasons.join("; ")}). Plan saved at ${plan}; ask the user to apply it.` };
		}
		safe(() => setPlanOutcome(plan, "auto-applied (no UI); undo images captured"));
		approved = true;
		return undefined;
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
