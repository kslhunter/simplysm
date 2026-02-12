# @simplysm/sd-claude

CLI tool for installing and uninstalling Simplysm Claude Code skills and agents. Standalone package — does not require `@simplysm/sd-cli`.

## Installation

```bash
npm install --save-dev @simplysm/sd-claude
# or
pnpm add -D @simplysm/sd-claude
```

Or run directly with `npx`:

```bash
npx @simplysm/sd-claude install
```

## Commands

The CLI binary name is `sd-claude`. All commands support the `--debug` option to output detailed logs.

### install

Installs Claude Code skills/agents to the current project. Reads `sd-*` assets from the package's `claude/` directory and copies them to the project's `.claude/`. Existing `sd-*` entries are completely removed before new ones are copied. Also adds `statusLine` configuration to `.claude/settings.json`.

```bash
sd-claude install
```

### uninstall

Removes `sd-*` skills/agents from the current project's `.claude/`. Also removes `statusLine` configuration from `.claude/settings.json`.

```bash
sd-claude uninstall
```

## License

Apache-2.0
