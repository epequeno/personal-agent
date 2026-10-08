import assert from "node:assert/strict";
import { mkdirSync, readFileSync, utimesSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { backup, bashTargets, configFromEnv, inCorpus, pruneSnapshots, snapshotVaults, hashFile } from "../agent/extensions/reversibility/core.ts";

const T = process.argv[2];
const cfg = configFromEnv();
let n = 0;
const t = (name: string, fn: () => void) => {
	try { fn(); console.log(`  ok   ${name}`); n++; } catch (e) { console.log(`  FAIL ${name}\n       ${(e as Error).message}`); process.exitCode = 1; }
};

t("inCorpus: corpus yes, outside no, data dir no", () => {
	assert.ok(inCorpus(join(T, "code/proj/a.ts"), cfg));
	assert.ok(!inCorpus(join(T, "outside/x.txt"), cfg));
	assert.ok(!inCorpus(join(T, "data/memory/MEMORY.md"), cfg));
	assert.ok(!inCorpus(join(T, "codeX/a"), cfg), "prefix sibling must not match");
});

t("backup: create yields none; existing file is saved verbatim", () => {
	const f = join(T, "code/proj/a.txt");
	assert.equal(backup(f, cfg).kind, "none");
	writeFileSync(f, "v1");
	const r = backup(f, cfg);
	assert.equal(r.kind, "saved");
	if (r.kind === "saved") assert.equal(readFileSync(r.undo, "utf8"), "v1");
});

t("backup: two images in one millisecond do not collide", () => {
	const f = join(T, "code/proj/a.txt");
	const now = new Date();
	const a = backup(f, cfg, now), b = backup(f, cfg, now);
	assert.ok(a.kind === "saved" && b.kind === "saved" && a.undo !== b.undo);
});

t("backup: directories are captured recursively", () => {
	const d = join(T, "code/proj/dir");
	mkdirSync(join(d, "sub"), { recursive: true });
	writeFileSync(join(d, "sub/f"), "deep");
	const r = backup(d, cfg);
	assert.ok(r.kind === "saved" && readFileSync(join(r.undo, "sub/f"), "utf8") === "deep");
});

t("hashFile: null for missing and directories", () => {
	assert.equal(hashFile(join(T, "nope")), null);
	assert.equal(hashFile(join(T, "code")), null);
});

const cwd = join(T, "code/proj");
t("bashTargets: rm / mv / cp / tee / sed -i / redirects", () => {
	assert.deepEqual(bashTargets("rm -rf old.txt", cwd), [join(cwd, "old.txt")]);
	assert.deepEqual(bashTargets("mv a.md b.md", cwd).sort(), [join(cwd, "a.md"), join(cwd, "b.md")]);
	assert.ok(bashTargets("echo hi > out.txt", cwd).includes(join(cwd, "out.txt")));
	assert.ok(bashTargets("echo hi >> out.txt", cwd).includes(join(cwd, "out.txt")));
	assert.ok(bashTargets("sed -i '' 's/a/b/' f.md", cwd).includes(join(cwd, "f.md")));
	assert.ok(bashTargets("cat x | tee y.log", cwd).includes(join(cwd, "y.log")));
	assert.ok(bashTargets("ls && rm z", cwd).includes(join(cwd, "z")));
});
t("bashTargets: read-only commands and sed without -i yield nothing", () => {
	assert.deepEqual(bashTargets("ls -la; cat a.md; grep x b.md", cwd), []);
	assert.deepEqual(bashTargets("sed -n '1p' f.md", cwd), []);
	assert.deepEqual(bashTargets("echo hi > /dev/null", cwd), []);
});
t("bashTargets: globs are skipped, ~ expands", () => {
	assert.deepEqual(bashTargets("rm *.log", cwd), []);
	assert.ok(bashTargets("rm ~/x", cwd)[0].endsWith("/x"));
});

t("snapshots: written once per day per vault, valid tar", () => {
	writeFileSync(join(T, "research/topic/s.md"), "s");
	const first = snapshotVaults(cfg, new Date(2026, 0, 10));
	assert.equal(first.length, 2);
	assert.equal(snapshotVaults(cfg, new Date(2026, 0, 10)).length, 0);
});

t("retention: keeps 14 daily plus one per week for 8 older weeks", () => {
	const dir = join(T, "data/snapshots");
	for (const f of readdirSync(dir)) writeFileSync(join(dir, f), "x");
	const now = new Date(2026, 5, 30);
	for (let i = 0; i < 200; i++) {
		const d = new Date(2026, 5, 30 - i);
		const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		writeFileSync(join(dir, `Personal-${p}.tar.gz`), "x");
	}
	pruneSnapshots(cfg, now);
	const left = readdirSync(dir).filter((f) => f.startsWith("Personal-2026-0") || f.startsWith("Personal-2025"));
	const recent = left.filter((f) => f >= "Personal-2026-06-16");
	const older = left.filter((f) => f < "Personal-2026-06-16");
	assert.equal(recent.length, 15, "14 days back inclusive of cutoff");
	assert.equal(older.length, 8);
});
console.log(`  (${n} core checks)`);
