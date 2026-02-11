# CLI `add` Command Design

## Summary

Separate the `init` command into two concerns:
- `init` — creates monorepo skeleton only (no packages)
- `add <type>` — adds packages to an existing project (repeatable)

Initial types: `add client`, `add server`. Structure is extensible for future types (e.g., `add library`).

## Motivation

- A project can have **multiple clients** (e.g., `client-web`, `client-admin`)
- Current `init` bundles client creation, making it impossible to add more clients later via CLI
- Separation of concerns: project setup vs. package addition

## Command Structure

### `sd-cli init`

Creates monorepo skeleton in an empty directory:

**Generated files:**
- `package.json`, `pnpm-workspace.yaml`, `sd.config.ts`, `tsconfig.json`
- `eslint.config.ts`, `.prettierrc.yaml`, `mise.toml`, `.gitignore`

**Key behaviors:**
- `sd.config.ts` starts with empty `packages: {}`
- Runs `pnpm install` + `sd-cli install` (Claude skills)
- Ends with guidance message: `"다음 단계: sd-cli add client 를 실행하여 클라이언트를 추가하세요."`

### `sd-cli add client`

Interactive prompts:
1. Name suffix (required, e.g., "web" → `client-web`)
2. Router usage (yes/no)

Creates `packages/client-{suffix}/` with SolidJS client template.

### `sd-cli add server`

Interactive prompts:
1. Name suffix (optional, default empty → `"server"`, otherwise `"server-{suffix}"`)
2. If clients exist: multi-select which clients this server serves

Creates `packages/server[-{suffix}]/` with basic Fastify `ServiceServer` template.

## Template Structure

```
templates/
  ├── init/                  ← monorepo skeleton only
  │     ├── package.json.hbs
  │     ├── sd.config.ts.hbs    ← packages: {} (empty)
  │     └── ...
  ├── add-client/            ← client package template
  │     └── __CLIENT__/
  │           ├── package.json.hbs
  │           ├── src/main.tsx.hbs
  │           └── ...
  └── add-server/            ← server package template
        └── __SERVER__/
              ├── package.json.hbs
              ├── src/main.ts.hbs
              └── ...
```

- `__CLIENT__` replaced with `client-{suffix}`
- `__SERVER__` replaced with `server` or `server-{suffix}`
- Existing `templates/init/packages/__CLIENT__/` moves to `templates/add-client/__CLIENT__/`

## `sd.config.ts` Auto-Modification

Uses **ts-morph** (TypeScript AST) to reliably insert into the `packages` object.

**Example result after `add client web` + `add server`:**
```typescript
packages: {
  "client-web": {
    target: "client",
  },
  "server": {
    target: "node",
    clients: {
      "client-web": {},
    },
  },
}
```

**Fallback:** If AST modification fails, print the code snippet to terminal for manual insertion.

## Common `add` Flow

1. Verify project root (`sd.config.ts` exists)
2. Run interactive prompts
3. Check `packages/{name}/` does not already exist (error if it does)
4. Generate directory from template (Handlebars)
5. Modify `sd.config.ts` via ts-morph (fallback: print snippet)
6. Run `pnpm install`

## Implementation Files

```
packages/cli/src/
  commands/
    init.ts          ← modify (remove client creation logic)
    add-client.ts    ← new
    add-server.ts    ← new
  utils/
    config-editor.ts ← new (ts-morph based sd.config.ts modifier)
    template.ts      ← existing (no changes)
```

**yargs registration in `sd-cli.ts`:**
```
sd-cli add client   → runAddClient()
sd-cli add server   → runAddServer()
```

## Dependencies

- `ts-morph` — new dependency for AST-based config file editing

## Error Handling

- `add` outside project root (no `sd.config.ts`) → error with guidance
- Package directory already exists → error, no overwrite
- `sd.config.ts` AST modification fails → fallback to printed code snippet
- Empty directory check for `init` (existing behavior preserved)
