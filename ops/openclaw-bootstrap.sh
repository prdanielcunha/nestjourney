#!/usr/bin/env bash
set -euo pipefail

# NestJourney / OpenClaw bootstrap
# Idempotent, non-interactive baseline for a Linux operator host.

log() { printf '[nestjourney-bootstrap] %s\n' "$*"; }

have() { command -v "$1" >/dev/null 2>&1; }

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif have sudo && sudo -n true >/dev/null 2>&1; then
    sudo -n "$@"
  else
    return 125
  fi
}

apt_install() {
  if ! have apt-get; then
    return 124
  fi
  as_root apt-get update -y
  as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
}

ensure_base_tools() {
  local missing=()
  for cmd in git curl jq; do
    have "$cmd" || missing+=("$cmd")
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    log "Installing base packages: ${missing[*]}"
    apt_install "${missing[@]}" || {
      log "Unable to install base packages non-interactively on this host."
      return 1
    }
  fi
}

node_major() {
  if ! have node; then
    echo 0
    return
  fi
  node -p 'Number(process.versions.node.split(".")[0])'
}

ensure_node() {
  local major
  major="$(node_major)"
  if [ "$major" -ge 22 ]; then
    log "Node $(node -v) already satisfies the project baseline."
    return
  fi

  log "Node >=22 is required; installing/upgrading Node.js."

  # Prefer an existing nvm installation because distro nodejs packages can be too old.
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    mkdir -p "$NVM_DIR"
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi

  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install 24
  nvm alias default 24
  nvm use 24
}

ensure_gh() {
  if have gh; then
    return
  fi
  log "Installing GitHub CLI."
  apt_install gh || {
    log "GitHub CLI package was not available from the configured apt sources."
    return 1
  }
}

ensure_npm_clis() {
  log "Installing/updating operator CLIs."
  npm install -g @openai/codex@latest vercel@latest firebase-tools@14.25.1
}

verify_auth() {
  if have gh; then
    gh auth status >/dev/null 2>&1 && log "GitHub CLI authentication: OK" || log "GitHub CLI authentication: not currently active"
  fi

  if have vercel; then
    vercel whoami >/dev/null 2>&1 && log "Vercel CLI authentication: OK" || log "Vercel CLI authentication: not currently active"
  fi

  if have firebase; then
    firebase projects:list --json >/dev/null 2>&1 && log "Firebase CLI authentication: OK" || log "Firebase CLI authentication: not currently active"
  fi

  if have codex; then
    log "Codex CLI installed: $(codex --version 2>/dev/null || true)"
  fi
}

install_project() {
  if [ ! -f package-lock.json ]; then
    log "Run this script from the NestJourney repository root."
    return 1
  fi

  log "Installing project dependencies from lockfile."
  npm ci

  log "Running deterministic quality gate."
  npm run check
  npm run test:rules
}

main() {
  ensure_base_tools
  ensure_node
  ensure_gh
  ensure_npm_clis
  verify_auth
  install_project
  log "Bootstrap complete."
}

main "$@"
