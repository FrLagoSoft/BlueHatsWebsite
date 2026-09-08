# Wrapper: load .env, then run boxlang with THIS repo's boxlang.json.
# The raw CLI does not auto-load a project boxlang.json, and its own .env
# loader is unreliable on Windows CMD - so we do both here.
#
#   .\bx.ps1 generate.bxs "Create an agent that reviews my app logs"
#   .\bx.ps1 backend\testPipeline.bxs
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Import-EnvFile($path) {
	if (-not (Test-Path $path)) { return }
	Get-Content $path | ForEach-Object {
		$line = $_.Trim()
		if ($line -eq "" -or $line.StartsWith("#")) { return }
		$eq = $line.IndexOf("=")
		if ($eq -lt 1) { return }
		$name = $line.Substring(0, $eq).Trim()
		$value = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
		[Environment]::SetEnvironmentVariable($name, $value, "Process")
	}
}

Import-EnvFile (Join-Path $HOME ".box.env")
Import-EnvFile (Join-Path $root ".env")

# Scripts run through this wrapper (generate.bxs, backend/testPipeline.bxs) shell out
# to boxlang/bxAgents via ProcessBuilder, which - unlike a shell - cannot resolve a
# bare command name on Windows; it needs the actual resolved file, extension included.
# Resolve both here so those scripts can read server.system.environment.* instead of
# hardcoding a platform-specific path (same approach as serve.ps1).
$boxlangCmd = Get-Command boxlang -ErrorAction SilentlyContinue
$env:BOXLANG_BIN = if ($boxlangCmd) { $boxlangCmd.Source } else { "C:\boxlang\bin\boxlang.bat" }

# bxAgents' shim isn't on PATH by default - it lives under the BoxLang home, not the
# bin dir PATH points at - so fall back to that location explicitly.
$bxAgentsCmd = Get-Command bxAgents -ErrorAction SilentlyContinue
$env:BXAGENTS_BIN = if ($bxAgentsCmd) { $bxAgentsCmd.Source } else { "C:\boxlang\home\bin\bxAgents.bat" }

& $env:BOXLANG_BIN --bx-config "$root\boxlang.json" @args
exit $LASTEXITCODE
