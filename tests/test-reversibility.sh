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

echo; echo "passed $pass(+core), failed $fail"; [ "$fail" -eq 0 ]
