/**
 * memory — durable, file-based, cross-session memory for personal-agent.
 *
 * Design: adr/0006-store-durable-facts-as-file-based-memory.md
 *
 * Durable facts live in two flat files under $PA_DATA_DIR/memory:
 *
 *   MEMORY.md   environment facts, project conventions, tool quirks   ceiling 2200 chars
 *   USER.md     who Steven is, and how he wants to work               ceiling 1375 chars
 *
 * Entries are separated by a line containing only `§`. The structure around the entries is
 * regenerated on every write; entry bodies are only ever changed by an explicit replace or
 * remove. That keeps the files hand-editable (which is the point) while keeping writes safe.
 *
 * The injected copy is a FROZEN SNAPSHOT taken at session start. A write during a session
 * updates disk immediately but does not alter what that session sees, so the prompt prefix
 * stays stable and cached. The snapshot refreshes on the next session start — which is why
 * a fact written now becomes visible in the next session, not this one.
 */

import {
	appendFileSync,
	closeSync,
	existsSync,
	fsyncSync,
	mkdirSync,
	openSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

// --------------------------------------------------------------------------------------
// Storage
// --------------------------------------------------------------------------------------

type Target = "memory" | "user";

const TARGETS: Target[] = ["memory", "user"];
const CEILING: Record<Target, number> = { memory: 2200, user: 1375 };
const FILENAME: Record<Target, string> = { memory: "MEMORY.md", user: "USER.md" };
const SEPARATOR = "\n\n§\n\n";

const HEADER: Record<Target, string> = {
	memory:
		"# Agent memory\n\n" +
		"Durable facts worth carrying across sessions. Managed by the `memory` tool.\n" +
		"Entries are separated by a line containing only `§`. Text outside entries is regenerated.",
	user:
		"# User profile\n\n" +
		"Who Steven is, and how he wants to work. Managed by the `memory` tool.\n" +
		"Entries are separated by a line containing only `§`. Text outside entries is regenerated.",
};

function dataDir(): string {
	return process.env.PA_DATA_DIR ?? join(homedir(), "personal-agent-data");
}
function memoryDir(): string {
	return join(dataDir(), "memory");
}
function pathFor(target: Target): string {
	return join(memoryDir(), FILENAME[target]);
}

function readRaw(target: Target): string {
	const path = pathFor(target);
	if (!existsSync(path)) return HEADER[target];
	try {
		const raw = readFileSync(path, "utf8");
		return raw.trim() ? raw : HEADER[target];
	} catch {
		return HEADER[target];
	}
}

/** Entries are the `§`-separated blocks, excluding the leading heading block. */
function entries(target: Target): string[] {
	return readRaw(target)
		.split(/^[ \t]*§[ \t]*$/m)
		.map((block) => block.trim())
		.filter((block) => block.length > 0 && !block.startsWith("# "));
}

function usedChars(target: Target): number {
	return entries(target).join(SEPARATOR).length;
}

/** Write entries back, regenerating the surrounding structure atomically. */
function writeEntries(target: Target, list: string[]): void {
	const dir = memoryDir();
	mkdirSync(dir, { recursive: true });
	const path = pathFor(target);
	const body = list.length ? `${HEADER[target]}${SEPARATOR}${list.join(SEPARATOR)}\n` : `${HEADER[target]}\n`;
	const tmp = `${path}.tmp-${process.pid}`;
	const fd = openSync(tmp, "w");
	try {
		writeFileSync(fd, body, "utf8");
		fsyncSync(fd); // durability before the rename makes the swap atomic
	} finally {
		closeSync(fd);
	}
	renameSync(tmp, path);
}

// --------------------------------------------------------------------------------------
// Injection scanning
//
// Memory is injected into every future system prompt, so a bad entry is not a bad note —
// it is a persistent instruction. These checks reject text that would act on the agent
// rather than inform it. Adapted from the pattern set in
// Dropbox/eapsoftware-research/persistent-memory-systems-research.md (§1a).
// --------------------------------------------------------------------------------------

const BLOCKED: Array<{ pattern: RegExp; why: string }> = [
	{ pattern: /\b(ignore|disregard|forget|override)\b[^.]{0,40}\b(previous|prior|above|earlier|system)\b/i, why: "instruction override" },
	{ pattern: /\byou are (now|no longer)\b|\bfrom now on,? you\b|\bact as (if|though) you\b/i, why: "role hijack" },
	{ pattern: /\b(system prompt|system message|developer message)\b/i, why: "prompt-structure tampering" },
	{ pattern: /\b(curl|wget|nc|ncat|scp)\b[^\n]{0,80}(\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)|process\.env)/i, why: "credential exfiltration" },
	{ pattern: /authorized_keys|id_rsa|\/\.ssh\/|\.aws\/credentials/i, why: "credential or key access" },
	{ pattern: /\brm\s+-rf?\s+\/(?!\w)/i, why: "destructive command" },
];

function scan(text: string): string | undefined {
	for (const { pattern, why } of BLOCKED) {
		if (pattern.test(text)) return `rejected as ${why}: matches ${pattern}`;
	}
	return undefined;
}

function guard(target: Target, text: string): void {
	const trimmed = text.trim();
	if (!trimmed) throw new Error("text must not be empty");
	const reason = scan(trimmed);
	if (reason) {
		throw new Error(
			`Refusing to store this in ${target} — ${reason}. Memory is injected into every future system prompt, so it must describe facts, never instructions to the agent.`,
		);
	}
	// A single entry must never blow the ceiling on its own.
	if (trimmed.length > CEILING[target]) {
		throw new Error(`Entry is ${trimmed.length} chars, over the whole ${target} ceiling of ${CEILING[target]}. Condense it.`);
	}
}

function findMatch(target: Target, needle: string): number[] {
	const lower = needle.trim().toLowerCase();
	if (!lower) throw new Error("old_text must not be empty");
	return entries(target).reduce<number[]>((hits, entry, index) => {
		if (entry.toLowerCase().includes(lower)) hits.push(index);
		return hits;
	}, []);
}

function resolveUnique(target: Target, needle: string): number {
	const hits = findMatch(target, needle);
	const list = entries(target);
	if (hits.length === 0) {
		throw new Error(`No ${target} entry contains ${JSON.stringify(needle)}. Use action "list" to see current entries.`);
	}
	if (hits.length > 1) {
		const preview = hits.map((i) => `[${i}] ${list[i].slice(0, 80)}`).join("\n");
		throw new Error(`old_text is ambiguous — ${hits.length} entries match. Use a longer, unique substring:\n${preview}`);
	}
	return hits[0];
}

// --------------------------------------------------------------------------------------
// Snapshot injection
// --------------------------------------------------------------------------------------

type Snapshot = { memory: string[]; user: string[]; takenAt: number };

function takeSnapshot(): Snapshot {
	return { memory: entries("memory"), user: entries("user"), takenAt: Date.now() };
}

function render(snapshot: Snapshot): string {
	const parts: string[] = [];
	if (snapshot.memory.length) parts.push(`What you remember:\n- ${snapshot.memory.join("\n- ")}`);
	if (snapshot.user.length) parts.push(`Who you are working for:\n- ${snapshot.user.join("\n- ")}`);
	if (!parts.length) return "";
	parts.push(
		`Ceilings: memory ${CEILING.memory} chars, user ${CEILING.user} chars. ` +
			"Use the `memory` tool to add, replace, or remove entries; when a ceiling is reached, consolidate before adding.",
	);
	return parts.join("\n\n");
}

// --------------------------------------------------------------------------------------
// Journal
// --------------------------------------------------------------------------------------

function journalPath(): string {
	const day = new Date().toISOString().slice(0, 10);
	return join(dataDir(), "journal", `${day}.md`);
}

function appendJournal(block: string): void {
	const path = journalPath();
	mkdirSync(join(dataDir(), "journal"), { recursive: true });
	const header = existsSync(path) ? "" : `# ${new Date().toISOString().slice(0, 10)}\n`;
	appendFileSync(path, `${header}\n${block}\n`, "utf8");
}

// --------------------------------------------------------------------------------------
// Extension
// --------------------------------------------------------------------------------------

export default function memoryExtension(pi: ExtensionAPI) {
	// The frozen snapshot. Taken at load so the first turn is covered even if
	// session_start does not fire first; refreshed on every session boundary.
	let snapshot = takeSnapshot();
	let prompts: string[] = [];
	let memoryTouched = false;
	let proposed = false;
	// Captured at session start for the journal.
	let meta = { id: "?", cwd: "", model: "unknown" };

	pi.on("session_start", (_event, ctx) => {
		snapshot = takeSnapshot();
		prompts = [];
		memoryTouched = false;
		proposed = false;
		meta = {
			id: ctx.sessionManager?.getSessionId?.() ?? "?",
			cwd: ctx.sessionManager?.getCwd?.() ?? ctx.cwd,
			model: ctx.model?.id ?? "unknown",
		};
	});

	// Injection point: a named prompt section, which pi renders XML-wrapped. Using a
	// section rather than a whole-prompt replacement is what keeps the cached prefix
	// stable across turns.
	//
	// PA_MEMORY_TRACE=<path> appends one JSON line per turn with the exact injected text.
	// This is how the frozen-snapshot property is verified: the injected text must be
	// byte-identical across turns of a session even when disk changed in between.
	const tracePath = process.env.PA_MEMORY_TRACE;

	pi.on("before_agent_start", (event) => {
		const text = render(snapshot);
		const sections = (event.systemPromptOptions.sections ??= {});
		if (text) sections.memory = text;
		else delete sections.memory;
		if (tracePath) {
			try {
				appendFileSync(tracePath, `${JSON.stringify({ at: Date.now(), chars: text.length, text })}\n`, "utf8");
			} catch {
				// Tracing must never affect a run.
			}
		}
	});

	pi.on("input", (event) => {
		if (event.source === "extension") return;
		const text = event.text.trim();
		if (text) prompts.push(text.length > 200 ? `${text.slice(0, 200)}…` : text);
	});

	// Propose a memory write at the end of a substantive session that recorded nothing.
	// Notification only — no model call, no injected message, so this costs nothing.
	pi.on("agent_settled", (_event, ctx) => {
		if (proposed || memoryTouched || prompts.length < 3 || !ctx.hasUI) return;
		proposed = true;
		ctx.ui.notify("Nothing was written to memory this session. `/remember <fact>` if something generalisable came up.", "info");
	});

	pi.on("session_shutdown", (event) => {
		if (!prompts.length) return;
		const time = new Date().toISOString().slice(11, 16);
		const block = [
			`## ${time} — session \`${meta.id}\` (${event.reason})`,
			"",
			`- ${prompts.length} prompt(s), model ${meta.model}, cwd ${meta.cwd}`,
			memoryTouched ? "- memory written" : "- memory untouched",
			"",
			...prompts.map((p) => `- ${p.replace(/\n+/g, " ⏎ ")}`),
		].join("\n");
		try {
			appendJournal(block);
		} catch {
			// Journaling must never take the session down.
		}
	});

	pi.registerTool(
		defineTool({
			name: "memory",
			label: "Memory",
			description:
				"Read and maintain durable memory that persists across sessions. " +
				"`user` holds who Steven is and how he wants to work; `memory` holds environment facts, " +
				"project conventions, and tool quirks. Entries are capped in total size, so consolidate " +
				"when a ceiling is reached rather than appending indefinitely.",
			promptSnippet: "memory: add, replace, remove, or list durable cross-session facts",
			promptGuidelines: [
				"Use `memory` when a durable fact emerges that should survive this session.",
				"Prefer `replace` over adding a near-duplicate; the ceilings are small on purpose.",
				"Never store instructions, secrets, or anything that would only matter today.",
			],
			parameters: Type.Object({
				action: Type.Union([Type.Literal("add"), Type.Literal("replace"), Type.Literal("remove"), Type.Literal("list")], {
					description: "What to do.",
				}),
				target: Type.Union([Type.Literal("memory"), Type.Literal("user")], {
					description: "Which file: `user` for Steven and his preferences, `memory` for everything else.",
				}),
				text: Type.Optional(
					Type.String({ description: "For `add`: the new entry. For `replace`: the replacement entry." }),
				),
				old_text: Type.Optional(
					Type.String({ description: "For `replace`/`remove`: a short substring unique to the entry to change." }),
				),
			}),
			execute(_toolCallId, params) {
				const { action, target } = params as { action: string; target: Target; text?: string; old_text?: string };
				const list = entries(target);
				let summary: string;

				if (action === "list") {
					const body = list.length ? list.map((e, i) => `[${i}] ${e}`).join("\n\n") : "(empty)";
					return Promise.resolve({
						content: [
							{
								type: "text",
								text: `${target}: ${list.length} entr${list.length === 1 ? "y" : "ies"}, ${usedChars(target)}/${CEILING[target]} chars\n\n${body}`,
							},
						],
						details: { action, target, entries: list.length, used: usedChars(target), limit: CEILING[target] },
					});
				}

				if (action === "add") {
					if (!params.text) throw new Error("`add` requires `text`.");
					guard(target, params.text);
					const entry = params.text.trim();
					if (list.some((e) => e.trim() === entry)) {
						throw new Error(`Already stored verbatim in ${target}; nothing to do.`);
					}
					const projected = usedChars(target) + SEPARATOR.length + entry.length;
					if (projected > CEILING[target]) {
						throw new Error(
							`Adding this would use ${projected} of ${CEILING[target]} chars in ${target}. ` +
								`Consolidate first: list entries, then replace or remove the least valuable ones.`,
						);
					}
					writeEntries(target, [...list, entry]);
					memoryTouched = true;
					summary = `Added to ${target} (${projected}/${CEILING[target]} chars).`;
				} else if (action === "replace") {
					if (!params.text || !params.old_text) throw new Error("`replace` requires both `text` and `old_text`.");
					guard(target, params.text);
					const index = resolveUnique(target, params.old_text);
					const next = [...list];
					next[index] = params.text.trim();
					const projected = next.join(SEPARATOR).length;
					if (projected > CEILING[target]) {
						throw new Error(`Replacement would use ${projected} of ${CEILING[target]} chars in ${target}. Condense it.`);
					}
					writeEntries(target, next);
					memoryTouched = true;
					summary = `Replaced entry ${index} in ${target} (${projected}/${CEILING[target]} chars).`;
				} else if (action === "remove") {
					if (!params.old_text) throw new Error("`remove` requires `old_text`.");
					const index = resolveUnique(target, params.old_text);
					const next = list.filter((_, i) => i !== index);
					writeEntries(target, next);
					memoryTouched = true;
					summary = `Removed entry ${index} from ${target} (${usedChars(target)}/${CEILING[target]} chars).`;
				} else {
					throw new Error(`Unknown action ${JSON.stringify(action)}. Use add, replace, remove, or list.`);
				}

				return Promise.resolve({
					content: [{ type: "text", text: summary }],
					details: { action, target, entries: entries(target).length, used: usedChars(target), limit: CEILING[target] },
				});
			},
		}),
	);
}
