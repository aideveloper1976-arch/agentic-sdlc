# 0002. Tools over prompts for correctness-critical work

## Status
Accepted

## Context
Models are good at judgement and poor at exactness. Asking an agent to "check contrast",
"scan for secrets" or "confirm the tests pass" invites confident, unverifiable answers.

## Decision
Anything with a right answer is an MCP tool with a typed (zod-validated) input and structured
output: WCAG contrast, secret and dependency scans, E2E and visual-regression runs, traceability
links and gap reports, document parsing. Agents decide *what* to check and interpret results;
tools produce the results.

## Consequences
- Results are reproducible and can be saved as evidence.
- The tool layer is testable on its own (unit tests plus an MCP smoke test of all servers).
- More code to maintain: 12 servers and 133 tools.
