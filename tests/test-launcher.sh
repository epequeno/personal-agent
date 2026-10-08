#!/usr/bin/env bash
#
# Launcher acceptance test (M0).
#
# Verifies the behaviour that M0's acceptance criteria name, without making any
# model calls: a stub `pi` on PATH records its argv, cwd, and environment.
#
#   ./tests/test-launcher.sh
#
# Covers:
#   - PI_CODING_AGENT_DIR / PI_CODING_AGENT_SESSION_DIR point where the design says
#   - home-by-default working directory
#   - --here keeps the caller's directory
#   - daily session id is applied, and skipped when a session is chosen explicitly
#   - the private data skeleton is created

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/bin"
cat > "$TMP/bin/pi" <<'STUB'
#!/usr/bin/env bash
{
  echo "ARGV=$*"
  echo "CWD=$PWD"
  echo "AGENT_DIR=${PI_CODING_AGENT_DIR:-}"
  echo "SESSION_DIR=${PI_CODING_AGENT_SESSION_DIR:-}"
} > "${STUB_OUT:?}"
STUB
chmod +x "$TMP/bin/pi"

export PATH="$TMP/bin:$PATH"
export PA_DATA_DIR="$TMP/data"
export STUB_OUT="$TMP/out.txt"

pass=0; fail=0
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n        expected: %s\n        actual:   %s\n' "$1" "$2" "$3"; fail=$((fail + 1))
  fi
}
TODAY="$(date +%F)"

echo "launcher acceptance test"
echo

# 1. Home by default
( cd "$TMP" && "$REPO/bin/pa" >/dev/null 2>&1 )
check "default cwd is the agent home"   "$REPO"                          "$(grep '^CWD=' "$TMP/out.txt" | cut -d= -f2-)"
check "agent dir is the repo's agent/"  "$REPO/agent"                    "$(grep '^AGENT_DIR=' "$TMP/out.txt" | cut -d= -f2-)"
check "session dir is under PA_DATA_DIR" "$TMP/data/sessions"            "$(grep '^SESSION_DIR=' "$TMP/out.txt" | cut -d= -f2-)"
case "$(cat "$TMP/out.txt")" in
  *"ARGV=--session-id pa-$TODAY"*) check "daily session id applied" "yes" "yes" ;;
  *) check "daily session id applied" "yes" "no" ;;
esac

# 2. --here keeps the caller's directory
( cd "$TMP" && "$REPO/bin/pa" --here >/dev/null 2>&1 )
check "--here keeps caller cwd" "$TMP" "$(grep '^CWD=' "$TMP/out.txt" | cut -d= -f2-)"

# 3. --here does not leak into pi's argv
case "$(cat "$TMP/out.txt")" in
  *--here*) check "--here stripped from argv" "no" "yes" ;;
  *) check "--here stripped from argv" "no" "no" ;;
esac

# 4. Explicit session selection suppresses the daily id
( cd "$TMP" && "$REPO/bin/pa" -c >/dev/null 2>&1 )
case "$(cat "$TMP/out.txt")" in
  *"--session-id"*) check "-c suppresses daily session id" "no" "yes" ;;
  *) check "-c suppresses daily session id" "no" "no" ;;
esac

# 5. --pi escape hatch skips the mkdir/cd prologue
rm -rf "$TMP/data"
( cd "$TMP" && "$REPO/bin/pa" --pi config >/dev/null 2>&1 )
check "--pi cwd is the caller's"        "$TMP" "$(grep '^CWD=' "$TMP/out.txt" | cut -d= -f2-)"
if [ -d "$TMP/data" ]; then
  check "--pi does not create data dir" "no data dir" "data dir created"
else
  check "--pi does not create data dir" "no data dir" "no data dir"
fi
case "$(cat "$TMP/out.txt")" in
  *"ARGV=config"*) check "--pi strips itself from argv" "yes" "yes" ;;
  *) check "--pi strips itself from argv" "yes" "no" ;;
esac

# 6. Data skeleton
( cd "$TMP" && "$REPO/bin/pa" >/dev/null 2>&1 )
missing=""
for d in sessions memory atlas briefs journal undo snapshots outbox; do
  [ -d "$TMP/data/$d" ] || missing="$missing $d"
done
check "data skeleton complete" "" "$missing"

echo
printf 'passed %d, failed %d\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
