# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-18

First public release.

### Added
- Framework for OpenCode: `methodology-engine` plugin, 15 agents, 9 slash commands, 40 skills,
  phase rules in `AGENTS.md`, example configuration with environment-variable secrets.
- 12 MCP servers exposing 133 tools: security, test automation, UX/HCI, UX intelligence,
  traceability, document intake, browser research, web downloader, code execution,
  monitoring, GitHub and Atlassian.
- Installer for macOS, Linux and Windows that writes MCP config for OpenCode, Claude Code,
  VS Code and Zed.
- Tests: 30 server unit tests, 19 framework tests including end-to-end routing through the
  plugin hooks, and an MCP smoke test that boots every server.
- CI: build, typecheck, tests and smoke test on Node 20 and 22; gitleaks; CodeQL; Dependabot.
- Documentation: architecture, lifecycle, model routing, tool catalogue, ADRs, verification
  status, getting started, case study.

### Fixed
- Plugin failed to load in current OpenCode because the module exported a non-function value.
- Capability routing compared tier objects to strings, so every role fell back to the first
  model alphabetically.
- Agent assignment ignored `model_strength` and ordered Claude models first; agent `model:`
  pins were treated as configured models even when they weren't.

### Security
- All shell commands default to `ask` in every agent definition.
