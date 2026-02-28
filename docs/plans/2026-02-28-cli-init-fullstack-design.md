# CLI init Full-Stack Project Scaffolding Design

## Summary

Redesign the `sd-cli init` command to generate a complete full-stack project based on simplysm-opus, instead of the current minimal skeleton. Remove the `add client` and `add server` commands entirely — users get everything at once and delete what they don't need.

## Reference Project

- Source: `D:\workspaces-13\simplysm-opus`
- Structure: monorepo with `client-admin`, `server`, `db-main` packages + e2e tests
- Features: Authentication, Employee CRUD, Role/Permission management, Excel import/export, audit logging, dev initialization

## Init Command Flow

### Inputs

1. **Project name** — extracted from folder name (validate: lowercase, numbers, hyphens only)
2. **Description** — prompted via readline
3. **Port** — server port number, prompted via readline

### Auto-generated

- **jwtSecret** — `${projectName}-${crypto.randomUUID().slice(0, 8)}`

### Steps

1. Check directory is empty (ignore dotfiles)
2. Validate project name
3. Prompt for description
4. Prompt for port
5. Generate jwtSecret
6. `renderTemplateDir("templates/init/", cwd, context)`
7. Run `pnpm install`
8. Display completion message

### Post-init

- `pnpm install` only (no git init)

## Template Variables

| Variable | Source | Usage |
|----------|--------|-------|
| `projectName` | Folder name | package.json names, DB name, import paths (`@projectName/*`), vitest DB |
| `description` | User input | Root package.json description |
| `port` | User input | `server/src/main.ts` port |
| `jwtSecret` | Auto-generated | `sd.config.ts` auth config |

## Template Directory Structure

```
templates/init/
├── package.json.hbs
├── sd.config.ts.hbs
├── pnpm-workspace.yaml              ← static
├── tsconfig.json                    ← static
├── eslint.config.ts.hbs             ← if @projectName/ imports
├── stylelint.config.ts              ← static
├── .prettierrc.yaml                 ← static
├── .prettierignore                  ← static
├── .npmrc                           ← static
├── .gitignore                       ← static
├── vitest.config.ts.hbs             ← projectName in DB config
├── mise.toml                        ← static
│
├── packages/
│   ├── db-main/
│   │   ├── package.json.hbs
│   │   └── src/                     ← all static (no projectName refs)
│   │       ├── index.ts
│   │       ├── MainDbContext.ts
│   │       ├── dataLogExt.ts
│   │       └── tables/ (6 files)
│   │
│   ├── server/
│   │   ├── package.json.hbs         ← @projectName deps, no nodemailer
│   │   ├── public-dev/dev/초기화.xlsx ← binary copy
│   │   └── src/
│   │       ├── main.ts.hbs          ← port, @projectName imports
│   │       ├── index.ts.hbs
│   │       └── services/
│   │           ├── AuthService.ts.hbs   ← no resetPassword, no nodemailer
│   │           ├── DevService.ts.hbs
│   │           ├── EmployeeService.ts.hbs
│   │           └── RoleService.ts.hbs
│   │
│   └── client-admin/
│       ├── package.json.hbs
│       ├── index.html.hbs
│       ├── tailwind.config.ts       ← static
│       ├── public/favicon.ico       ← binary copy
│       └── src/
│           ├── main.tsx.hbs
│           ├── App.tsx              ← static
│           ├── dev/DevDialog.tsx.hbs
│           ├── providers/
│           │   ├── AuthProvider.tsx.hbs       ← no resetPassword
│           │   ├── AppServiceProvider.tsx.hbs
│           │   ├── AppStructureProvider.tsx   ← static
│           │   └── configureSharedData.ts.hbs
│           └── views/
│               ├── auth/LoginView.tsx.hbs     ← no reset dialog
│               └── home/ (multiple .hbs files for @projectName imports)
│
└── tests/e2e/
    ├── vitest.setup.ts.hbs          ← DB config with projectName
    └── src/*.test.ts.hbs            ← @projectName imports
```

### File Classification Rules

- Contains `@simplysm-opus/` or other template variables → `.hbs`
- Binary files (xlsx, ico) → copy as-is
- No template variable references → static copy

## Key Template Files

### sd.config.ts.hbs

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const dbPort = Number(process.env["DB_PORT"] ?? 5432);
const dbDatabase = process.env["DB_DATABASE"] ?? "{{projectName}}";

const config: SdConfigFn = () => ({
  packages: {
    "db-main": { target: "neutral" },
    "client-admin": {
      target: "client",
      server: "server",
    },
    server: {
      target: "server",
      packageManager: "volta",
      pm2: {},
      configs: {
        orm: {
          default: {
            dialect: "postgresql",
            host: "localhost",
            port: dbPort,
            username: "postgres",
            password: "1234",
            database: dbDatabase,
          },
        },
        auth: {
          jwtSecret: "{{jwtSecret}}",
        },
      },
    },
  },
});

export default config;
```

Changes from simplysm-opus:
- `replaceDeps` removed
- `publish` removed (both client-admin and server)
- `smtp` config removed (no password reset)
- dev/prod ternary → single config (using dev values)
- Environment variable logic (`DB_PORT`, `DB_DATABASE`) preserved for vitest

### Root package.json.hbs

```json
{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "sd-cli dev",
    "build": "sd-cli build",
    "pub": "sd-cli publish",
    "typecheck": "sd-cli typecheck",
    "lint": "sd-cli lint",
    "check": "sd-cli check"
  },
  "devDependencies": {
    "@simplysm/sd-cli": "~13.0.70"
  }
}
```

## Password Reset Removal

| File | Change |
|------|--------|
| `AuthService.ts.hbs` | Remove `resetPassword` method, nodemailer import, smtp config type |
| `LoginView.tsx.hbs` | Remove reset password button and dialog |
| `sd.config.ts.hbs` | Remove smtp config block |
| `server/package.json.hbs` | Remove nodemailer, @types/nodemailer dependencies |
| `AppServiceProvider.tsx.hbs` | Remove resetPassword from auth service type (if present) |

## sd-cli Code Changes

### Files to Delete

| File | Reason |
|------|--------|
| `src/commands/add-client.ts` | add command removed |
| `src/commands/add-server.ts` | add command removed |
| `src/utils/config-editor.ts` | Only used by add commands |
| `templates/add-client/` (entire dir) | add command removed |
| `templates/add-server/` (entire dir) | add command removed |

### Files to Modify

**`src/sd-cli-entry.ts`**
- Remove `add` subcommand (client, server) registration from yargs

**`src/commands/init.ts`**
- Add description prompt (readline)
- Add port prompt (readline)
- Add jwtSecret auto-generation (`crypto.randomUUID()`)
- Update `renderTemplateDir` context: `{ projectName, description, port, jwtSecret }`
- Remove git init step
- Update completion message

**`templates/init/`**
- Replace all existing files (~12) with simplysm-opus based templates (~50+ files)

### Dependency Note

`ts-morph` was used by `config-editor.ts`. Check if other files still use it before removing from package.json.

## Preserved Features (unchanged from simplysm-opus)

- Employee entity naming (Employee, EmployeeService, EmployeeSheet, etc.)
- Korean UI labels and seed data (초기화.xlsx)
- Full authentication system (login, refresh, changePassword)
- Role/Permission management
- Employee CRUD with Excel import/export
- Audit logging (_Log, _DataLog)
- Dev initialization (DevService, DevDialog)
- e2e tests (login, employee CRUD)
- All 6 database tables (Employee, Role, RolePermission, EmployeeConfig, _Log, _DataLog)
