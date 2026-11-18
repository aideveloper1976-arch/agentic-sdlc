#!/usr/bin/env bash
# ai-tools installer — clones every tool from its GitHub source, builds it,
# collects secrets, and generates MCP server configuration for Claude Code,
# OpenCode, VS Code, and Zed. Driven by tools.manifest.json.
#
# Usage:
#   ./scripts/install.sh                      interactive install of all non-optional tools
#   ./scripts/install.sh --only traceability-mcp,github-mcp
#   ./scripts/install.sh --with-optional       also install graphify/mcp-chrome/notebooklm-mcp-cli/remotion-media-mcp
#   ./scripts/install.sh --secrets-file creds.env --non-interactive
#   ./scripts/install.sh --target-dir /path/to/install
#   ./scripts/install.sh --clients opencode,vscode   only generate config for these clients (default: claude,opencode,vscode,zed)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT_DIR/tools.manifest.json"
GEN_CONFIGS="$ROOT_DIR/scripts/generate-configs.js"
TARGET_DIR="$ROOT_DIR"
ONLY=""
WITH_OPTIONAL=0
NON_INTERACTIVE=0
SECRETS_FILE=""
CLIENTS="claude,opencode,vscode,zed"
FAILED=()
CACHE_DIR=""

# node (native Windows binary under Git Bash) needs Windows-style paths, not
# MSYS POSIX paths like /c/Projects/..., when they're embedded in -e strings.
to_winpath() {
  # Forward slashes on purpose: this value gets embedded in a double-quoted
  # JS string for `node -e`, where a literal backslash (e.g. C:\tools...)
  # would be parsed as an escape sequence (\t => tab). Node's fs accepts
  # forward-slash paths natively on Windows.
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1" | tr '\\' '/'
  else
    echo "$1" | sed -E 's#^/([a-zA-Z])/#\1:/#'
  fi
}

info()  { printf "\r[ \033[00;34mINFO\033[0m ] %s\n" "$1"; }
ok()    { printf "\r[ \033[00;32m OK \033[0m ] %s\n" "$1"; }
warn()  { printf "\r[ \033[00;33mWARN\033[0m ] %s\n" "$1"; }
fail()  { printf "\r[ \033[00;31mFAIL\033[0m ] %s\n" "$1"; FAILED+=("$1"); }

while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --with-optional) WITH_OPTIONAL=1; shift ;;
    --non-interactive) NON_INTERACTIVE=1; shift ;;
    --secrets-file) SECRETS_FILE="$2"; shift 2 ;;
    --target-dir) TARGET_DIR="$2"; shift 2 ;;
    --clients) CLIENTS="$2"; shift 2 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Several tools' package.json build scripts use POSIX shell syntax
# (mkdir -p, cp, chmod +x). npm on Windows runs scripts via cmd.exe by
# default, which chokes on that syntax — point it at bash instead.
if command -v bash >/dev/null 2>&1; then
  export npm_config_script_shell="$(command -v bash)"
fi

mkdir -p "$TARGET_DIR"
MANIFEST_WIN="$(to_winpath "$MANIFEST")"
node -e "JSON.parse(require('fs').readFileSync('$MANIFEST_WIN','utf8'))" \
  || { echo "tools.manifest.json is missing or invalid at $MANIFEST"; exit 1; }

manifest_get() {
  # $1 = jq-ish node expression fragment applied to each tool, prints one line per tool
  node -e "
    const m = JSON.parse(require('fs').readFileSync('$MANIFEST_WIN','utf8'));
    for (const t of m.tools) { $1 }
  "
}

# ---------- 1. Prerequisites ----------
check_prereqs() {
  info "Checking prerequisites..."
  command -v node >/dev/null 2>&1 || { echo "Node.js v18+ is required: https://nodejs.org/"; exit 1; }
  command -v npm  >/dev/null 2>&1 || { echo "npm is required (bundled with Node.js)"; exit 1; }
  command -v git  >/dev/null 2>&1 || { echo "git is required"; exit 1; }
  NODE_MAJOR="$(node -e 'console.log(process.versions.node.split(".")[0])')"
  if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Node.js v18+ required, found v$NODE_MAJOR"; exit 1
  fi
  ok "node $(node -v), npm $(npm -v), git $(git --version | awk '{print $3}')"

  for optional in docker trivy gitleaks pip-audit pnpm pip uv; do
    if command -v "$optional" >/dev/null 2>&1; then
      ok "optional: $optional found"
    else
      warn "optional: $optional not found (some tools degrade gracefully without it)"
    fi
  done
}

# ---------- 2. Fetch source ----------
fetch_custom_repo() {
  local repo branch
  repo="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MANIFEST_WIN','utf8')).customRepo.url)")"
  branch="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MANIFEST_WIN','utf8')).customRepo.branch)")"
  CACHE_DIR="$(mktemp -d)"
  info "Cloning custom tools repo ($repo)..."
  git clone --depth 1 --branch "$branch" "$repo" "$CACHE_DIR/agentic-sdlc-src" >/dev/null 2>&1 \
    && ok "custom tools repo cloned" \
    || { fail "could not clone $repo — check access to the private repo"; exit 1; }
}

fetch_tool() {
  local name="$1" dir="$2" sourceType="$3" subdir="$4" repo="$5"
  local dest="$TARGET_DIR/$dir"
  case "$sourceType" in
    custom)
      mkdir -p "$dest"
      cp -r "$CACHE_DIR/agentic-sdlc-src/$subdir/." "$dest/"
      ok "$name fetched (custom, from monorepo)"
      ;;
    upstream)
      if [ -d "$dest/.git" ]; then
        (cd "$dest" && git pull --ff-only >/dev/null 2>&1) && ok "$name updated (upstream)" || warn "$name: git pull failed, using existing checkout"
      else
        rm -rf "$dest"
        git clone --depth 1 "$repo" "$dest" >/dev/null 2>&1 && ok "$name cloned (upstream: $repo)" || { fail "$name clone failed"; return 1; }
      fi
      ;;
  esac
}

# ---------- 3. Build ----------
build_tool() {
  local name="$1" dir="$2" buildCmd="$3"
  local dest="$TARGET_DIR/$dir"
  info "Building $name..."
  (cd "$dest" && eval "$buildCmd" >/dev/null 2>&1) \
    && ok "$name built" \
    || { fail "$name build failed (cd $dest && $buildCmd)"; return 1; }
}

run_post_install() {
  local name="$1" dir="$2"; shift 2
  local dest="$TARGET_DIR/$dir"
  for cmd in "$@"; do
    [ -z "$cmd" ] && continue
    info "$name: $cmd"
    (cd "$dest" && eval "$cmd" >/dev/null 2>&1) && ok "$name: $cmd done" || warn "$name: $cmd failed (non-fatal)"
  done
}

# ---------- 4. Secrets ----------
collect_secrets() {
  local env_file="$TARGET_DIR/.env"
  info "Configuring secrets and settings..."

  if [ -n "$SECRETS_FILE" ]; then
    [ -f "$SECRETS_FILE" ] || { echo "--secrets-file $SECRETS_FILE not found"; exit 1; }
    cp "$SECRETS_FILE" "$env_file"
    chmod 600 "$env_file" 2>/dev/null || true
    ok ".env populated from $SECRETS_FILE"
    return
  fi

  if [ -f "$env_file" ]; then
    warn ".env already exists at $env_file — leaving it untouched. Delete it first to be re-prompted."
    return
  fi

  # Unique, de-duplicated var list across all installed tools
  local vars
  vars="$(manifest_get "if (t.envVars) t.envVars.forEach(v => console.log(v))" | sort -u)"

  if [ "$NON_INTERACTIVE" = "1" ]; then
    : > "$env_file"
    while IFS= read -r v; do [ -n "$v" ] && echo "$v=" >> "$env_file"; done <<< "$vars"
    chmod 600 "$env_file" 2>/dev/null || true
    warn "--non-interactive: wrote empty $env_file — fill in values before starting opencode"
    return
  fi

  : > "$env_file"
  echo
  echo "Enter values for each setting (blank = leave empty, fill in later in .env):"
  while IFS= read -r v; do
    [ -z "$v" ] && continue
    case "$v" in
      *TOKEN*|*SECRET*|*PASSWORD*|*API_KEY*)
        printf "  %s (secret, input hidden): " "$v"
        read -r -s val; echo
        ;;
      *)
        printf "  %s: " "$v"
        read -r val
        ;;
    esac
    echo "$v=$val" >> "$env_file"
  done <<< "$vars"
  chmod 600 "$env_file" 2>/dev/null || true
  ok ".env written to $env_file (chmod 600, gitignored — never commit this file)"
}

# ---------- 5. Generate client MCP configs ----------
generate_client_configs() {
  info "Generating MCP config for: $CLIENTS..."
  local manifest_win target_win env_win gen_win
  manifest_win="$(to_winpath "$MANIFEST")"
  target_win="$(to_winpath "$TARGET_DIR")"
  env_win="$(to_winpath "$TARGET_DIR/.env")"
  gen_win="$(to_winpath "$GEN_CONFIGS")"
  node "$gen_win" --manifest "$manifest_win" --env "$env_win" --target "$target_win" --clients "$CLIENTS"
}

# ---------- Main ----------
check_prereqs
fetch_custom_repo

TOOL_LIST="$(manifest_get "console.log(t.name)")"
if [ -n "$ONLY" ]; then
  TOOL_LIST="$(echo "$ONLY" | tr ',' '\n')"
fi

while IFS= read -r name; do
  [ -z "$name" ] && continue
  meta="$(manifest_get "if (t.name==='$name') console.log(JSON.stringify(t))")"
  [ -z "$meta" ] && { warn "unknown tool: $name (skipped)"; continue; }

  isOptional="$(node -e "console.log(!!($meta).optional)")"
  if [ "$isOptional" = "true" ] && [ "$WITH_OPTIONAL" != "1" ] && [ -z "$ONLY" ]; then
    info "$name is optional — skipped (use --with-optional or --only $name to include it)"
    continue
  fi

  dir="$(node -e "console.log(($meta).dir)")"
  sourceType="$(node -e "console.log(($meta).sourceType)")"
  subdir="$(node -e "console.log(($meta).subdir || '')")"
  repo="$(node -e "console.log(($meta).repo || '')")"
  buildCmd="$(node -e "console.log(($meta).buildCmd)")"
  postInstall=()
  postInstallCount=0
  while IFS= read -r cmd; do
    postInstall+=("$cmd")
    postInstallCount=$((postInstallCount + 1))
  done < <(node -e "(($meta).postInstall||[]).forEach(c=>console.log(c))")

  fetch_tool "$name" "$dir" "$sourceType" "$subdir" "$repo" || continue
  build_tool "$name" "$dir" "$buildCmd" || continue
  if [ "$postInstallCount" -gt 0 ]; then
    run_post_install "$name" "$dir" "${postInstall[@]}"
  else
    run_post_install "$name" "$dir"
  fi
done <<< "$TOOL_LIST"

rm -rf "$CACHE_DIR"

collect_secrets
generate_client_configs

echo
if [ ${#FAILED[@]} -eq 0 ]; then
  ok "Install complete. cd $TARGET_DIR && opencode"
else
  warn "Install finished with ${#FAILED[@]} issue(s):"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi
