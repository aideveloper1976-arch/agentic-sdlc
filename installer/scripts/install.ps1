<#
.SYNOPSIS
  ai-tools installer - clones every tool from its GitHub source, builds it,
  collects secrets, and generates opencode.json. Driven by tools.manifest.json.

.EXAMPLE
  .\scripts\install.ps1
.EXAMPLE
  .\scripts\install.ps1 -Only traceability-mcp,github-mcp
.EXAMPLE
  .\scripts\install.ps1 -WithOptional
.EXAMPLE
  .\scripts\install.ps1 -SecretsFile creds.env -NonInteractive
.EXAMPLE
  .\scripts\install.ps1 -TargetDir C:\ai-tools
.EXAMPLE
  .\scripts\install.ps1 -Clients opencode,vscode
#>
param(
  [string[]]$Only = @(),
  [switch]$WithOptional,
  [switch]$NonInteractive,
  [string]$SecretsFile,
  [string]$TargetDir,
  [string]$Clients = "claude,opencode,vscode,zed"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
if (-not $TargetDir) { $TargetDir = $RootDir }
$Manifest = Join-Path $RootDir "tools.manifest.json"
$GenConfigs = Join-Path $RootDir "scripts" "generate-configs.js"
$Failed = @()

# Several tools' package.json build scripts use POSIX shell syntax
# (mkdir -p, cp, chmod +x). npm on Windows runs scripts via cmd.exe by
# default, which chokes on that syntax - point it at bash (Git Bash) if present.
$bashCmd = Get-Command bash -ErrorAction SilentlyContinue
if ($bashCmd) {
  $env:npm_config_script_shell = $bashCmd.Source
} else {
  Write-Host "[ WARN ] bash not found on PATH - tools with POSIX-style build scripts may fail to build. Install Git for Windows to get bash." -ForegroundColor Yellow
}

function Info($msg) { Write-Host "[ INFO ] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "[  OK  ] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[ WARN ] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[ FAIL ] $msg" -ForegroundColor Red; $script:Failed += $msg }

if (-not (Test-Path $Manifest)) { throw "tools.manifest.json not found at $Manifest" }
$ManifestData = Get-Content $Manifest -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

# ---------- 1. Prerequisites ----------
function Check-Prereqs {
  Info "Checking prerequisites..."
  foreach ($cmd in @("node", "npm", "git")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
      throw "$cmd is required and was not found on PATH"
    }
  }
  $nodeMajor = [int]((node -e "console.log(process.versions.node.split('.')[0])").Trim())
  if ($nodeMajor -lt 18) { throw "Node.js v18+ required, found v$nodeMajor" }
  Ok "node $(node -v), npm $(npm -v), git $((git --version).Split(' ')[2])"

  foreach ($optional in @("docker", "trivy", "gitleaks", "pip-audit", "pnpm", "pip", "uv")) {
    if (Get-Command $optional -ErrorAction SilentlyContinue) {
      Ok "optional: $optional found"
    } else {
      Warn "optional: $optional not found (some tools degrade gracefully without it)"
    }
  }
}

# ---------- 2. Fetch source ----------
function Fetch-CustomRepo {
  $repo = $ManifestData.customRepo.url
  $branch = $ManifestData.customRepo.branch
  $script:CacheDir = Join-Path ([System.IO.Path]::GetTempPath()) ("agentic-sdlc-src-" + [System.Guid]::NewGuid().ToString("N"))
  Info "Cloning custom tools repo ($repo)..."
  git clone --depth 1 --branch $branch $repo $CacheDir *>$null
  if ($LASTEXITCODE -ne 0) { Fail "could not clone $repo - check access to the private repo"; throw "clone failed" }
  Ok "custom tools repo cloned"
}

function Fetch-Tool($tool) {
  $dest = Join-Path $TargetDir $tool.dir
  if ($tool.sourceType -eq "custom") {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item -Path (Join-Path $CacheDir $tool.subdir "*") -Destination $dest -Recurse -Force
    Ok "$($tool.name) fetched (custom, from monorepo)"
  } elseif ($tool.sourceType -eq "upstream") {
    if (Test-Path (Join-Path $dest ".git")) {
      Push-Location $dest
      git pull --ff-only *>$null
      $ok = $LASTEXITCODE -eq 0
      Pop-Location
      if ($ok) { Ok "$($tool.name) updated (upstream)" } else { Warn "$($tool.name): git pull failed, using existing checkout" }
    } else {
      if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
      git clone --depth 1 $tool.repo $dest *>$null
      if ($LASTEXITCODE -ne 0) { Fail "$($tool.name) clone failed"; return $false }
      Ok "$($tool.name) cloned (upstream: $($tool.repo))"
    }
  }
  return $true
}

# ---------- 3. Build ----------
function Build-Tool($tool) {
  $dest = Join-Path $TargetDir $tool.dir
  Info "Building $($tool.name)..."
  Push-Location $dest
  try {
    cmd /c $tool.buildCmd *>$null
    if ($LASTEXITCODE -ne 0) { throw "build command failed" }
    Ok "$($tool.name) built"
    return $true
  } catch {
    Fail "$($tool.name) build failed (cd $dest && $($tool.buildCmd))"
    return $false
  } finally {
    Pop-Location
  }
}

function Run-PostInstall($tool) {
  $dest = Join-Path $TargetDir $tool.dir
  foreach ($cmdStr in $tool.postInstall) {
    if ([string]::IsNullOrWhiteSpace($cmdStr)) { continue }
    Info "$($tool.name): $cmdStr"
    Push-Location $dest
    cmd /c $cmdStr *>$null
    if ($LASTEXITCODE -eq 0) { Ok "$($tool.name): $cmdStr done" } else { Warn "$($tool.name): $cmdStr failed (non-fatal)" }
    Pop-Location
  }
}

# ---------- 4. Secrets ----------
function Collect-Secrets {
  $envFile = Join-Path $TargetDir ".env"
  Info "Configuring secrets and settings..."

  if ($SecretsFile) {
    if (-not (Test-Path $SecretsFile)) { throw "-SecretsFile $SecretsFile not found" }
    Copy-Item $SecretsFile $envFile -Force
    Ok ".env populated from $SecretsFile"
    return
  }

  if (Test-Path $envFile) {
    Warn ".env already exists at $envFile - leaving it untouched. Delete it first to be re-prompted."
    return
  }

  $vars = $ManifestData.tools | ForEach-Object { $_.envVars } | Where-Object { $_ } | Sort-Object -Unique

  if ($NonInteractive) {
    $lines = $vars | ForEach-Object { "$_=" }
    Set-Content -Path $envFile -Value $lines
    Warn "-NonInteractive: wrote empty $envFile - fill in values before starting opencode"
    return
  }

  Write-Host ""
  Write-Host "Enter values for each setting (blank = leave empty, fill in later in .env):"
  $lines = @()
  foreach ($v in $vars) {
    if ($v -match "TOKEN|SECRET|PASSWORD|API_KEY") {
      $secure = Read-Host "  $v (secret, input hidden)" -AsSecureString
      $val = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    } else {
      $val = Read-Host "  $v"
    }
    $lines += "$v=$val"
  }
  Set-Content -Path $envFile -Value $lines
  Ok ".env written to $envFile (gitignored - never commit this file)"
}

# ---------- 5. Generate client MCP configs ----------
function Generate-ClientConfigs {
  Info "Generating MCP config for: $Clients..."
  $envFile = Join-Path $TargetDir ".env"
  node $GenConfigs --manifest $Manifest --env $envFile --target $TargetDir --clients $Clients
}

# ---------- Main ----------
Check-Prereqs
Fetch-CustomRepo

try {
  $toolNames = if ($Only.Count -gt 0) { $Only } else { $ManifestData.tools | ForEach-Object { $_.name } }

  foreach ($name in $toolNames) {
    $tool = $ManifestData.tools | Where-Object { $_.name -eq $name } | Select-Object -First 1
    if (-not $tool) { Warn "unknown tool: $name (skipped)"; continue }

    if ($tool.optional -and -not $WithOptional -and $Only.Count -eq 0) {
      Info "$($tool.name) is optional - skipped (use -WithOptional or -Only $($tool.name) to include it)"
      continue
    }

    if (-not (Fetch-Tool $tool)) { continue }
    if (-not (Build-Tool $tool)) { continue }
    Run-PostInstall $tool
  }
} finally {
  if ($CacheDir -and (Test-Path $CacheDir)) { Remove-Item -Recurse -Force $CacheDir }
}

Collect-Secrets
Generate-ClientConfigs

Write-Host ""
if ($Failed.Count -eq 0) {
  Ok "Install complete. cd $TargetDir; opencode"
} else {
  Warn "Install finished with $($Failed.Count) issue(s):"
  $Failed | ForEach-Object { Write-Host "  - $_" }
  exit 1
}
