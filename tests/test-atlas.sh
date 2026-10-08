#!/usr/bin/env bash
# Acceptance test for bin/pa-atlas. Fixture corpora, no model calls.
set -uo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { echo "  ok   $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }
check() { if eval "$2"; then ok "$1"; else bad "$1"; fi; }

C="$T/code"; R="$T/research"; P="$T/personal"
mkdir -p "$C/empty-repo" "$C/pushed" "$C/plain" "$R/topic" "$R/_parked" "$P/notes" "$C/pushed/_archive"
git -C "$C/empty-repo" init -q; echo x > "$C/empty-repo/a.txt"
git -C "$C/pushed" init -q; echo x > "$C/pushed/a.txt"
git -C "$C/pushed" add -A && git -C "$C/pushed" -c user.name=t -c user.email=t@t commit -qm x
printf '# Roadmap\n- [ ] ship it\n- [x] done\n' > "$C/pushed/ROADMAP.md"
echo "TODO: blocked on vendor" > "$C/pushed/_archive/old.md"
echo "// TODO: fix me" > "$C/plain/a.js"
echo "note" > "$R/topic/n.md"; echo "n" > "$P/notes/n.md"
echo "mentions pushed only" > "$R/_Home.md"

export PA_CODE_DIR="$C" PA_RESEARCH_DIR="$R" PA_PERSONAL_DIR="$P" PA_HOME_NOTE="$R/_Home.md"
OUT="$T/atlas"
"$HERE/bin/pa-atlas" --out "$OUT" >/dev/null
IDX="$OUT/index.md"

check "every project appears in the index" 'for n in empty-repo pushed plain topic notes; do grep -q "\[$n\]" "$IDX" || exit 1; done'
check "underscore dirs are not projects"   '! grep -q "_parked" "$IDX"'
check "empty repo flagged at-risk"         'grep "\[empty-repo\]" "$IDX" | grep -q "at-risk:no-commits"'
check "no-remote repo flagged"             'grep "\[pushed\]" "$IDX" | grep -q "at-risk:no-remote"'
check "non-repo in code flagged"           'grep "\[plain\]" "$IDX" | grep -q "not-a-repo"'
check "at-risk sorts first"                '[ "$(grep -n "\[empty-repo\]" "$IDX" | cut -d: -f1)" -lt "$(grep -n "\[plain\]" "$IDX" | cut -d: -f1)" ]'
check "roadmap next item on card"          'grep -q "ship it" "$OUT/code--pushed.md"'
check "checked item not listed"            '! grep -q "done" "$OUT/code--pushed.md"'
check "archive dir ignored"                '! grep -q "vendor" "$OUT/code--pushed.md"'
check "TODO found in plain source"         'grep -q "fix me" "$OUT/code--plain.md"'
check "not-in-home flag"                   'grep "\[plain\]" "$IDX" | grep -q "not-in-home"'
check "rerun is stable"                    'N=$(date +%s); "$HERE/bin/pa-atlas" --out "$OUT" --now $N >/dev/null; cp "$IDX" "$T/a"; "$HERE/bin/pa-atlas" --out "$OUT" --now $N >/dev/null; cmp -s "$IDX" "$T/a"'
echo; echo "passed $pass, failed $fail"; [ "$fail" -eq 0 ]
