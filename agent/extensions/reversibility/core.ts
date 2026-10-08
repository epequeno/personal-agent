/**
 * reversibility core — pure(ish) filesystem logic, kept apart from the pi wiring in
 * index.ts so tests/test-reversibility.sh can exercise it without a model call.
 *
 * Design: adr/0005-optimize-for-reversibility-over-permission-prompts.md
 *
 *   undo/<date>/<abs path>@<HHMMSSmmm>   before-image of a corpus file
 *   journal/mutations.jsonl              one record per mutation: before/after hashes
 *   snapshots/<vault>-<date>.tar.gz      daily tar of each Obsidian vault
 */

import { createHash } from "node:crypto";
import {
	appendFileSync,
	copyFileSync,
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	unlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";

export interface Config {
	dataDir: string;
	/** Directories whose contents count as corpus. */
	roots: string[];
	/** Obsidian vaults to snapshot (subset of roots; not version-controlled). */
	vaults: string[];
}

export const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Config {
	const home = homedir();
	const code = env.PA_CODE_DIR ?? join(home, "code");
	const research = env.PA_RESEARCH_DIR ?? join(home, "Dropbox/eapsoftware-research");
	const personal = env.PA_PERSONAL_DIR ?? join(home, "Dropbox/obsidian/Personal");
	return {
		dataDir: env.PA_DATA_DIR ?? join(home, "personal-agent-data"),
		roots: [code, research, personal],
		vaults: [research, personal],
	};
}

export function expand(p: string, cwd: string): string {
	if (p === "~") p = homedir();
	else if (p.startsWith("~/")) p = join(homedir(), p.slice(2));
	return resolve(isAbsolute(p) ? p : join(cwd, p));
}

/** True for a path inside a corpus root; the data directory is never corpus. */
export function inCorpus(abs: string, cfg: Config): boolean {
	const under = (root: string) => abs === root || abs.startsWith(root.endsWith(sep) ? root : root + sep);
	if (under(resolve(cfg.dataDir))) return false;
	return cfg.roots.some((r) => under(resolve(r)));
}

export function hashFile(abs: string): string | null {
	try {
		if (!statSync(abs).isFile()) return null;
		return createHash("sha256").update(readFileSync(abs)).digest("hex");
	} catch {
		return null;
	}
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
export function dayOf(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function treeSize(abs: string, limit: number): number {
	let total = 0;
	const stack = [abs];
	while (stack.length) {
		const cur = stack.pop() as string;
		let st;
		try {
			st = lstatSync(cur);
		} catch {
			continue;
		}
		if (st.isDirectory()) {
			for (const e of readdirSync(cur)) stack.push(join(cur, e));
		} else total += st.size;
		if (total > limit) return total;
	}
	return total;
}

export type BackupResult =
	| { kind: "none" } // path does not exist yet: a create, nothing to preserve
	| { kind: "saved"; undo: string }
	| { kind: "skipped"; reason: string };

/** Copy the current contents of `abs` (file or directory) into undo/<date>/. */
export function backup(abs: string, cfg: Config, now = new Date()): BackupResult {
	let st;
	try {
		st = lstatSync(abs);
	} catch {
		return { kind: "none" };
	}
	if (treeSize(abs, MAX_BACKUP_BYTES) > MAX_BACKUP_BYTES) return { kind: "skipped", reason: "over size cap" };
	const stamp = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
	let dest = join(cfg.dataDir, "undo", dayOf(now), `${abs.replace(/^\/+/, "")}@${stamp}`);
	for (let i = 1; existsSync(dest); i++) dest = `${dest.replace(/\.\d+$/, "")}.${i}`;
	mkdirSync(dirname(dest), { recursive: true });
	try {
		if (st.isDirectory()) cpSync(abs, dest, { recursive: true });
		else copyFileSync(abs, dest);
	} catch (e) {
		return { kind: "skipped", reason: String(e) };
	}
	return { kind: "saved", undo: dest };
}

export interface Mutation {
	ts: string;
	tool: string;
	path: string;
	before: string | null;
	after: string | null;
	undo: string | null;
	note?: string;
	session?: string;
	toolCallId?: string;
}

export function logMutation(cfg: Config, rec: Mutation): void {
	const dir = join(cfg.dataDir, "journal");
	mkdirSync(dir, { recursive: true });
	appendFileSync(join(dir, "mutations.jsonl"), `${JSON.stringify(rec)}\n`, "utf8");
}

// --------------------------------------------------------------------------------------
// Bash: best-effort detection of corpus paths a shell command is about to change.
//
// This is NOT a sandbox. It tokenises, finds commands known to mutate files, and treats
// their path-like arguments and redirect targets as candidates. Anything cleverer (eval,
// xargs, a script that writes files, find -delete) is not seen. The residual risk is
// accepted explicitly in ADR-0005; daily snapshots are the net for what this misses.
// --------------------------------------------------------------------------------------

const MUTATORS = new Set(["rm", "rmdir", "mv", "cp", "tee", "truncate", "ln", "install", "shred", "unlink", "touch", "chmod"]);

function tokenise(cmd: string): string[] {
	const out: string[] = [];
	const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(&&|\|\||[;|&]|>>?|\S+?(?=>|[;|&]|\s|$))/g;
	// Shell metacharacters stay as separate tokens; quotes are stripped.
	for (const m of cmd.matchAll(re)) out.push(m[1] ?? m[2] ?? m[3]);
	return out;
}

export function bashTargets(cmd: string, cwd: string): string[] {
	const tokens = tokenise(cmd);
	const found = new Set<string>();
	const add = (t: string | undefined) => {
		if (!t || t.startsWith("-") || t === "/dev/null" || t.startsWith("/dev/") || t.startsWith("&")) return;
		if (/[*?$`]/.test(t)) return; // unexpanded globs/variables cannot be resolved here
		found.add(expand(t, cwd));
	};
	let i = 0;
	while (i < tokens.length) {
		const t = tokens[i];
		if (t === ">" || t === ">>") {
			add(tokens[i + 1]);
			i += 2;
			continue;
		}
		const name = basename(t);
		const sedInPlace = name === "sed" || name === "perl";
		if (MUTATORS.has(name) || sedInPlace) {
			let j = i + 1;
			const args: string[] = [];
			while (j < tokens.length && !["&&", "||", ";", "|", "&", ">", ">>"].includes(tokens[j])) args.push(tokens[j++]);
			if (!sedInPlace || args.some((a) => /^-[a-zA-Z]*i/.test(a) || a.startsWith("--in-place"))) {
				// for sed/perl, the script argument is not a path; paths that exist are filtered by caller
				args.forEach(add);
			}
			i = j;
			continue;
		}
		i++;
	}
	return [...found];
}

// --------------------------------------------------------------------------------------
// Snapshots
// --------------------------------------------------------------------------------------

export function snapshotName(vault: string, now: Date): string {
	return `${basename(vault).replace(/[^A-Za-z0-9._-]+/g, "_")}-${dayOf(now)}.tar.gz`;
}

/** Snapshot each vault once per day. Returns names written. */
export function snapshotVaults(cfg: Config, now = new Date()): string[] {
	const dir = join(cfg.dataDir, "snapshots");
	mkdirSync(dir, { recursive: true });
	const written: string[] = [];
	for (const vault of cfg.vaults) {
		if (!existsSync(vault)) continue;
		const name = snapshotName(vault, now);
		const out = join(dir, name);
		if (existsSync(out)) continue;
		const tmp = `${out}.tmp`;
		const r = spawnSync("tar", ["-czf", tmp, "-C", dirname(vault), basename(vault)], { encoding: "utf8" });
		if (r.status === 0) {
			spawnSync("mv", [tmp, out]);
			written.push(name);
		} else {
			spawnSync("rm", ["-f", tmp]);
		}
	}
	return written;
}

function isoWeek(d: Date): string {
	const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	const dayNum = t.getUTCDay() || 7;
	t.setUTCDate(t.getUTCDate() + 4 - dayNum);
	const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
	return `${t.getUTCFullYear()}-W${pad(Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7))}`;
}

/** Retention: every snapshot from the last 14 days, plus the oldest of each of the 8 earlier ISO weeks. */
export function pruneSnapshots(cfg: Config, now = new Date(), daily = 14, weekly = 8): string[] {
	const dir = join(cfg.dataDir, "snapshots");
	if (!existsSync(dir)) return [];
	const byVault = new Map<string, Array<{ file: string; date: Date }>>();
	for (const file of readdirSync(dir)) {
		const m = file.match(/^(.*)-(\d{4})-(\d{2})-(\d{2})\.tar\.gz$/);
		if (!m) continue;
		const list = byVault.get(m[1]) ?? [];
		list.push({ file, date: new Date(+m[2], +m[3] - 1, +m[4]) });
		byVault.set(m[1], list);
	}
	const removed: string[] = [];
	const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daily);
	for (const list of byVault.values()) {
		list.sort((a, b) => a.date.getTime() - b.date.getTime());
		const old = list.filter((s) => s.date < cutoff);
		const keep = new Set<string>();
		const weeks = new Map<string, string>(); // week -> oldest file (first seen, list is ascending)
		for (const s of old) if (!weeks.has(isoWeek(s.date))) weeks.set(isoWeek(s.date), s.file);
		[...weeks.values()].slice(-weekly).forEach((f) => keep.add(f));
		for (const s of old) {
			if (keep.has(s.file)) continue;
			unlinkSync(join(dir, s.file));
			removed.push(s.file);
		}
	}
	return removed;
}

/** Age in days of the newest snapshot, or null when there is none. */
export function newestSnapshotAgeDays(cfg: Config, now = new Date()): number | null {
	const dir = join(cfg.dataDir, "snapshots");
	if (!existsSync(dir)) return null;
	const times = readdirSync(dir)
		.filter((f) => f.endsWith(".tar.gz"))
		.map((f) => statSync(join(dir, f)).mtimeMs);
	return times.length ? (now.getTime() - Math.max(...times)) / 86400000 : null;
}
