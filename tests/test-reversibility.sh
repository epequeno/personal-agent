#!/usr/bin/env bash
# M3 acceptance test. Core logic is exercised directly; one model call proves the pi hook fires.
set -uo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { echo "  ok   $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1 ${2:-}"; fail=$((fail+1)); }
check() { if eval "$2"; then ok "$1"; else bad "$1"; fi; }

export PA_DATA_DIR="$T/data" PA_CODE_DIR="$T/code" PA_RESEARCH_DIR="$T/research" PA_PERSONAL_DIR="$T/personal"
mkdir -p "$T/code/proj" "$T/research/topic" "$T/personal/n" "$T/data" "$T/outside"
echo "original" > "$T/research/topic/note.md"
echo "keep" > "$T/outside/x.txt"

echo "core"
node --experimental-strip-types --no-warnings "$REPO/tests/reversibility-core.test.ts" "$T" || fail=$((fail+1))

echo; echo "pi hook (1 model call)"
CODE_OUT=$("$REPO/bin/pa" --print --session-id m3-hook "Use the write tool to overwrite $T/research/topic/note.md with the single line: changed. Then reply DONE." 2>/dev/null)
N=$(cat "$T/research/topic/note.md")
check "write took effect" '[ "$N" = "changed" ]'
IMG=$(find "$T/data/undo" -type f -name 'note.md@*' | head -1)
check "before-image captured" '[ -n "$IMG" ] && [ "$(cat "$IMG")" = "original" ]'
check "mutation logged with distinct hashes" 'python3 -c "
import json,sys
r=[json.loads(l) for l in open(\"$T/data/journal/mutations.jsonl\")]
m=[x for x in r if x[\"path\"].endswith(\"note.md\")]
sys.exit(0 if m and m[-1][\"before\"] and m[-1][\"after\"] and m[-1][\"before\"]!=m[-1][\"after\"] and m[-1][\"session\"]==\"m3-hook\" else 1)"'
"$REPO/bin/pa-undo" restore "$IMG" >/dev/null
check "pa-undo restores original" '[ "$(cat "$T/research/topic/note.md")" = "original" ]'

echo; echo "bash path (1 model call)"
echo "precious" > "$T/research/topic/doomed.md"
"$REPO/bin/pa" --print --session-id m3-bash "Use the bash tool to run exactly: rm $T/research/topic/doomed.md   Then reply DONE." >/dev/null 2>&1
check "bash rm took effect" '[ ! -e "$T/research/topic/doomed.md" ]'
IMG2=$(find "$T/data/undo" -type f -name 'doomed.md@*' | head -1)
check "bash rm before-image captured" '[ -n "$IMG2" ] && [ "$(cat "$IMG2")" = "precious" ]'
check "bash rm logged" 'grep -q "doomed.md" "$T/data/journal/mutations.jsonl"'

echo; echo "outbox, headless auto-apply (1 model call)"
mkdir -p "$T/research/batch"
PA_OUTBOX_N=1 "$REPO/bin/pa" --print --session-id m3-ob1 "Use the write tool three times to create $T/research/batch/a.md, b.md and c.md, each containing the word hi. Then reply DONE." >/dev/null 2>&1
check "all three files written (auto-apply)" '[ -f "$T/research/batch/a.md" ] && [ -f "$T/research/batch/b.md" ] && [ -f "$T/research/batch/c.md" ]'
check "plan written and marked auto-applied" 'grep -lq "auto-applied" "$T"/data/outbox/*.md'

echo; echo "outbox, headless deny policy (1 model call)"
mkdir -p "$T/research/deny"
PA_OUTBOX_N=1 PA_OUTBOX_POLICY=deny "$REPO/bin/pa" --print --session-id m3-ob2 "Use the write tool to create $T/research/deny/a.md, then $T/research/deny/b.md, then $T/research/deny/c.md, each containing hi. If one is refused, do not try another way; just reply DONE." >/dev/null 2>&1
check "first file allowed" '[ -f "$T/research/deny/a.md" ]'
check "later files held" '[ ! -f "$T/research/deny/c.md" ]'
check "plan marked denied" 'grep -lq "denied (headless policy)" "$T"/data/outbox/*.md'

echo; echo "passed $pass(+core), failed $fail"; [ "$fail" -eq 0 ]
