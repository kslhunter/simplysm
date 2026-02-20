# Directory Reference

- `.cache/`: Build cache (`eslint.cache`, `typecheck-{env}.tsbuildinfo`, `dts.tsbuildinfo`). Reset: delete `.cache/`
- `.playwright-mcp/`: Playwright MCP output directory
  - Screenshots/snapshots must always be saved to the `.playwright-mcp/` directory
  - When calling `browser_take_screenshot`, always prefix filename with `.playwright-mcp/` (e.g., `.playwright-mcp/screenshot.png`)
  - `PLAYWRIGHT_OUTPUT_DIR` only applies to auto-generated filenames; explicitly specified filenames are resolved relative to cwd
