# Code Execution MCP Server

Secure, production-grade MCP server for running development commands, executing tests, managing Docker environments, and inspecting project state.

## Security Model

### Command Allowlist

Only these commands are allowed:

| Command | Allowed Subcommands |
|---|---|
| `npm` | install, ci, test, run, build, exec, x, ls, list, audit, why |
| `pnpm` | install, ci, test, run, build, exec, dlx, ls, list, audit, why, add, remove, update |
| `yarn` | install, test, run, build, add, remove, upgrade, why, dlx, exec |
| `git` | status, diff, log, show, branch, checkout, add, commit, push, pull, fetch, merge, rebase, stash, tag, describe, rev-parse |
| `docker` | ps, logs, images, info, version, compose, context |
| `docker-compose` | up, down, ps, logs, build, pull, restart, stop, start |
| `go` | test, build, run, mod, vet, fmt, version |
| `node` | Any script file |
| `pytest` | Any arguments |

### Blocked Commands

- `rm -rf`, `sudo`, `chmod`, `chown`, `mkfs`, `dd`
- `curl` (any usage — use `node` fetch instead)
- `wget` piping to shell
- `bash -c`, `sh -c`, inline shell execution
- `eval`, `kill`, `pkill`
- `docker system prune`, `docker run` (arbitrary images), `docker exec -it` (interactive shells)
- Any command not in the allowlist

### Runtime Protections

- Working directory restricted to project root (configurable via `CODE_EXECUTION_ALLOWED_DIR`)
- Default timeout: 60s (configurable)
- Output truncated at 10k characters
- All inputs validated with Zod schemas

## Install

```bash
cd code-execution-mcp
npm install
npm run build
```

## Configure

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|---|---|---|
| `CODE_EXECUTION_ALLOWED_DIR` | Project root | Restrict execution to this directory |
| `CODE_EXECUTION_TIMEOUT_MS` | `60000` | Default command timeout |
| `CODE_EXECUTION_MAX_OUTPUT_CHARS` | `10000` | Max output characters |
| `CODE_EXECUTION_DOCKER_ENABLED` | `true` | Enable Docker tools |

## Run

```bash
npm start
```

## Tools

| Tool | Description |
|---|---|
| `run_command` | Execute a development command with security validation |
| `run_tests` | Auto-detect and run test suite |
| `install_dependencies` | Install project dependencies |
| `get_project_info` | Detect project language, framework, scripts |
| `read_logs` | Read local log files |
| `docker_compose_up` | Start compose services |
| `docker_compose_down` | Stop compose services |
| `docker_compose_build` | Build compose containers |
| `docker_ps` | List running containers |
| `docker_logs` | View container logs |
| `docker_compose_logs` | View compose service logs |
| `set_docker_context` | Switch docker context |
| `get_docker_context` | Show current docker context |

## OpenCode Configuration

```json
{
  "mcp": {
    "code_execution": {
      "type": "local",
      "command": ["node", "./code-execution-mcp/dist/index.js"],
      "env": {
        "CODE_EXECUTION_ALLOWED_DIR": "/path/to/project",
        "CODE_EXECUTION_TIMEOUT_MS": "60000",
        "CODE_EXECUTION_DOCKER_ENABLED": "true"
      },
      "enabled": true
    }
  }
}
```

## Agent Usage

```
Backend developer:
  call get_project_info to understand project setup
  call install_dependencies to bootstrap
  call run_tests to verify
  call run_command to build

DevOps:
  call docker_compose_up to start services
  call docker_ps to verify containers
  call docker_logs to inspect runtime
  call docker_compose_down to stop
```
