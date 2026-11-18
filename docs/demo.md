# Recording the demo

The README has a placeholder for a demo GIF. To record one:

1. Install [VHS](https://github.com/charmbracelet/vhs) (`brew install vhs`).
2. In a small sample project with `framework/` copied in, run `vhs docs/demo.tape`.
3. Save the output as `docs/assets/demo.gif` and replace the `<!-- DEMO -->` comment in the
   README with `![demo](docs/assets/demo.gif)`.

Good shots to capture: the routing-table confirmation, phases ticking off with checkpoint
paths, the code-review gate returning a blocking issue and the fix loop, and the final
traceability gap report.
