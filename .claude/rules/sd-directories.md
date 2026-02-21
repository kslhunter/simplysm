# Directory Reference

- `.cache/`: Build cache (`eslint.cache`, `typecheck-{env}.tsbuildinfo`, `dts.tsbuildinfo`). Reset: delete `.cache/`
- `.tmp/playwright/`: Playwright MCP output directory
  - Screenshots/snapshots must always be saved to the `.tmp/playwright/` directory
  - When calling `browser_take_screenshot`, always prefix filename with `.tmp/playwright/` (e.g., `.tmp/playwright/screenshot.png`)
  - `PLAYWRIGHT_OUTPUT_DIR` only applies to auto-generated filenames; explicitly specified filenames are resolved relative to cwd
