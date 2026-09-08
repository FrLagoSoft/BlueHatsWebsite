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

exec "${BOXLANG_BIN:-boxlang}" --bx-config "$root/boxlang.json" "$@"
