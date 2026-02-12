# @simplysm/claude

Simplysm Claude Code skills and agents. Automatically installs via `postinstall` when added as a dev dependency.

## Installation

```bash
pnpm add -D @simplysm/claude
# or
npm install --save-dev @simplysm/claude
```

Skills and agents are automatically installed to `.claude/` on `pnpm install` / `npm install`.

## How It Works

When installed as a dependency, the `postinstall` script:

1. Copies `sd-*` assets (skills, agents, rules) to the project's `.claude/` directory
2. Configures `statusLine` in `.claude/settings.json`
3. Existing `sd-*` entries are replaced with the latest version

Updates also trigger reinstallation (`pnpm up @simplysm/claude`).

## Note

- If using `pnpm install --ignore-scripts`, the postinstall won't run
- If using `onlyBuiltDependencies` in `pnpm-workspace.yaml`, add `@simplysm/claude` to the list

## License

Apache-2.0
