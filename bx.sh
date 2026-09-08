#!/usr/bin/env bash
# Wrapper: load .env, then run boxlang with THIS repo's boxlang.json.
# The raw CLI does not auto-load a project boxlang.json.
#
#   ./bx.sh generate.bxs "Create an agent that reviews my app logs"
#   ./bx.sh backend/testPipeline.bxs
set -e
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

load_env() {
	[ -f "$1" ] || return 0
	while IFS= read -r line || [ -n "$line" ]; do
		line="${line%$'\r'}"
		case "$line" in ''|'#'*) continue ;; esac
		key="${line%%=*}"
		val="${line#*=}"
		val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
		export "${key// /}=$val"
	done < "$1"
}

load_env "$HOME/.box.env"
load_env "$root/.env"

# Exported (not just expanded) because the scripts run through this wrapper shell out
# to these binaries via ProcessBuilder and read them from the environment - see the
# matching block in bx.ps1. A bare name is fine here: ProcessBuilder resolves it from
# PATH on Linux/macOS, unlike Windows' .bat shims.
export BOXLANG_BIN="${BOXLANG_BIN:-boxlang}"
export BXAGENTS_BIN="${BXAGENTS_BIN:-bxAgents}"

exec "$BOXLANG_BIN" --bx-config "$root/boxlang.json" "$@"
