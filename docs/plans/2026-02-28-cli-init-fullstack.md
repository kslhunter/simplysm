# CLI init Full-Stack Project Scaffolding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Redesign `sd-cli init` to generate a complete full-stack project (auth, CRUD, roles, e2e) based on simplysm-opus, and remove `add client`/`add server` commands.

**Architecture:** Replace existing minimal init templates with full simplysm-opus templates using Handlebars. Modify init.ts to accept description/port inputs and auto-generate jwtSecret. Remove add commands entirely.

**Tech Stack:** Handlebars templates, yargs CLI, Node.js crypto

---

### Task 1: Delete obsolete files and modify CLI entry

**Files:**
- Delete: `packages/sd-cli/src/commands/add-client.ts`
- Delete: `packages/sd-cli/src/commands/add-server.ts`
- Delete: `packages/sd-cli/src/utils/config-editor.ts`
- Delete: `packages/sd-cli/templates/add-client/` (entire directory)
- Delete: `packages/sd-cli/templates/add-server/` (entire directory)
- Delete: all files in `packages/sd-cli/templates/init/` (will be replaced in later tasks)
- Modify: `packages/sd-cli/src/sd-cli-entry.ts`

**Step 1: Delete obsolete source files**

```bash
rm packages/sd-cli/src/commands/add-client.ts
rm packages/sd-cli/src/commands/add-server.ts
rm packages/sd-cli/src/utils/config-editor.ts
rm -rf packages/sd-cli/templates/add-client
rm -rf packages/sd-cli/templates/add-server
rm -rf packages/sd-cli/templates/init/*
```

**Step 2: Remove `add` command from sd-cli-entry.ts**

In `packages/sd-cli/src/sd-cli-entry.ts`, remove lines 262-285 (the `.command("add", ...)` block):

```typescript
// DELETE THIS ENTIRE BLOCK:
    .command("add", "Add package to project", (cmd) =>
      cmd
        .version(false)
        .hide("help")
        .command(
          "client",
          "Add client package",
          (subCmd) => subCmd.version(false).hide("help"),
          async () => {
            const { runAddClient } = await import("./commands/add-client.js");
            await runAddClient({});
          },
        )
        .command(
          "server",
          "Add server package",
          (subCmd) => subCmd.version(false).hide("help"),
          async () => {
            const { runAddServer } = await import("./commands/add-server.js");
            await runAddServer({});
          },
        )
        .demandCommand(1, "Please specify package type. (client, server)"),
    )
```

**Step 3: Commit**

```bash
git add -A packages/sd-cli/src/commands/add-client.ts packages/sd-cli/src/commands/add-server.ts packages/sd-cli/src/utils/config-editor.ts packages/sd-cli/templates/ packages/sd-cli/src/sd-cli-entry.ts
git commit -m "refactor(sd-cli): remove add commands and clean up old init templates"
```

---

### Task 2: Modify init.ts command

**Files:**
- Modify: `packages/sd-cli/src/commands/init.ts`

**Step 1: Rewrite init.ts**

Replace the entire content of `packages/sd-cli/src/commands/init.ts` with:

```typescript
import path from "path";
import fs from "fs";
import crypto from "crypto";
import readline from "readline";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { execa } from "execa";
import { findPackageRoot } from "../utils/package-utils";

//#region Types

export interface InitOptions {}

//#endregion

//#region Utilities

function isValidScopeName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

//#endregion

//#region Main

/**
 * Initializes a new Simplysm project in the current directory.
 *
 * 1. Check if directory is empty
 * 2. Validate project name (folder name)
 * 3. Prompt for description, port
 * 4. Generate jwtSecret
 * 5. Render Handlebars template
 * 6. Run pnpm install
 */
export async function runInit(_options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:init");

  // 1. Check if directory is empty (exclude dotfiles/dotfolders)
  const entries = fs.readdirSync(cwd).filter((e) => !e.startsWith("."));
  if (entries.length > 0) {
    consola.error("Directory is not empty. Please run this from an empty directory.");
    process.exitCode = 1;
    return;
  }

  // 2. Validate project name
  const projectName = path.basename(cwd);
  if (!isValidScopeName(projectName)) {
    consola.error(
      `Project name "${projectName}" is not valid. Only lowercase letters, numbers, and hyphens are allowed.`,
    );
    process.exitCode = 1;
    return;
  }

  // 3. Prompt for description
  const description = await prompt("Project description: ");

  // 4. Prompt for port
  const portInput = await prompt("Server port (default: 40080): ");
  const port = portInput !== "" ? Number(portInput) : 40080;
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    consola.error("Invalid port number.");
    process.exitCode = 1;
    return;
  }

  // 5. Generate jwtSecret
  const jwtSecret = `${projectName}-${crypto.randomUUID().slice(0, 8)}`;

  // 6. Render template
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "init");

  const context = { projectName, description, port, jwtSecret };

  logger.info("Creating project files...");
  await renderTemplateDir(templateDir, cwd, context);
  logger.success("Project files created successfully");

  // 7. Run pnpm install
  logger.info("Running pnpm install...");
  await execa("pnpm", ["install"], { cwd });
  logger.success("pnpm install completed");

  // 8. Completion message
  consola.box(
    [
      "Project created!",
      "",
      "Next steps:",
      "  pnpm dev              Start dev server",
      "  pnpm build            Production build",
    ].join("\n"),
  );
}

//#endregion
```

**Step 2: Commit**

```bash
git add packages/sd-cli/src/commands/init.ts
git commit -m "feat(sd-cli): rewrite init command with description, port, jwtSecret prompts"
```

---

### Task 3: Create root-level template files

**Files:**
- Create: `packages/sd-cli/templates/init/package.json.hbs`
- Create: `packages/sd-cli/templates/init/sd.config.ts.hbs`
- Create: `packages/sd-cli/templates/init/tsconfig.json.hbs`
- Create: `packages/sd-cli/templates/init/pnpm-workspace.yaml`
- Create: `packages/sd-cli/templates/init/eslint.config.ts`
- Create: `packages/sd-cli/templates/init/stylelint.config.ts`
- Create: `packages/sd-cli/templates/init/.prettierrc.yaml`
- Create: `packages/sd-cli/templates/init/.prettierignore`
- Create: `packages/sd-cli/templates/init/.npmrc`
- Create: `packages/sd-cli/templates/init/.gitignore`
- Create: `packages/sd-cli/templates/init/vitest.config.ts`
- Create: `packages/sd-cli/templates/init/mise.toml`

**Step 1: Create package.json.hbs**

```json
{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "sd-cli dev",
    "build": "sd-cli build",
    "pub": "sd-cli publish",
    "pub:no-build": "sd-cli publish --no-build",
    "---": "",
    "typecheck": "sd-cli typecheck",
    "lint": "sd-cli lint",
    "lint:fix": "sd-cli lint --fix",
    "check": "sd-cli check",
    "vitest": "vitest"
  },
  "devDependencies": {
    "@simplysm/lint": "~13.0.71",
    "@simplysm/sd-cli": "~13.0.71",
    "@types/node": "^20.19.35",
    "eslint": "^9.39.3",
    "prettier": "^3.8.1",
    "stylelint": "^16.26.1",
    "typescript": "^5.9.3",
    "vite-tsconfig-paths": "^6.1.1",
    "vitest": "^4.0.18"
  }
}
```

**Step 2: Create sd.config.ts.hbs**

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
    "server": {
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

**Step 3: Create tsconfig.json.hbs**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable", "WebWorker"],
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "strict": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noImplicitAny": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "useDefineForClassFields": true,
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "importHelpers": true,
    "baseUrl": ".",
    "paths": {
      "@{{projectName}}/*": ["packages/*/src/index.ts"]
    }
  },
  "include": [
    "*.ts",
    "packages/*/*.ts",
    "packages/*/src/**/*.ts",
    "packages/*/src/**/*.tsx",
    "packages/*/tests/**/*.ts",
    "packages/*/tests/**/*.tsx",
    "tests/**/*.ts"
  ]
}
```

**Step 4: Create static root files**

Copy these files exactly from simplysm-opus (no template variables):

- `pnpm-workspace.yaml` — exact copy from D:\workspaces-13\simplysm-opus\pnpm-workspace.yaml
- `eslint.config.ts` — exact copy from D:\workspaces-13\simplysm-opus\eslint.config.ts
- `stylelint.config.ts` — exact copy
- `.prettierrc.yaml` — exact copy
- `.prettierignore` — exact copy
- `.npmrc` — exact copy
- `.gitignore` — exact copy
- `vitest.config.ts` — exact copy
- `mise.toml` — exact copy

**Step 5: Commit**

```bash
git add packages/sd-cli/templates/init/
git commit -m "feat(sd-cli): add root-level init template files"
```

---

### Task 4: Create db-main package templates

**Files:**
- Create: `packages/sd-cli/templates/init/packages/db-main/package.json.hbs`
- Create: `packages/sd-cli/templates/init/packages/db-main/src/index.ts` (static)
- Create: `packages/sd-cli/templates/init/packages/db-main/src/MainDbContext.ts` (static)
- Create: `packages/sd-cli/templates/init/packages/db-main/src/dataLogExt.ts` (static)
- Create: `packages/sd-cli/templates/init/packages/db-main/src/tables/Employee.ts` (static)
- Create: `packages/sd-cli/templates/init/packages/db-main/src/tables/Role.ts` (static)
- Create: `packages/sd-cli/templates/init/packages/db-main/src/tables/RolePermission.ts` (static)
- Create: `packages/sd-cli/templates/init/packages/db-main/src/tables/EmployeeConfig.ts` (static)
- Create: `packages/sd-cli/templates/init/packages/db-main/src/tables/_Log.ts` (static)
- Create: `packages/sd-cli/templates/init/packages/db-main/src/tables/_DataLog.ts` (static)

**Step 1: Create package.json.hbs**

```json
{
  "name": "@{{projectName}}/db-main",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@simplysm/core-common": "~13.0.71",
    "@simplysm/orm-common": "~13.0.71"
  }
}
```

**Step 2: Copy static source files**

Copy these files exactly from `D:\workspaces-13\simplysm-opus\packages\db-main\src\`:
- `index.ts`
- `MainDbContext.ts`
- `dataLogExt.ts`
- `tables/Employee.ts`
- `tables/Role.ts`
- `tables/RolePermission.ts`
- `tables/EmployeeConfig.ts`
- `tables/_Log.ts`
- `tables/_DataLog.ts`

None of these contain `@simplysm-opus` references (they use relative imports and `@simplysm/orm-common`).

**Step 3: Commit**

```bash
git add packages/sd-cli/templates/init/packages/db-main/
git commit -m "feat(sd-cli): add db-main package init templates"
```

---

### Task 5: Create server package templates

**Files:**
- Create: `packages/sd-cli/templates/init/packages/server/package.json.hbs`
- Create: `packages/sd-cli/templates/init/packages/server/src/main.ts.hbs`
- Create: `packages/sd-cli/templates/init/packages/server/src/index.ts`
- Create: `packages/sd-cli/templates/init/packages/server/src/services/AuthService.ts.hbs`
- Create: `packages/sd-cli/templates/init/packages/server/src/services/DevService.ts.hbs`
- Create: `packages/sd-cli/templates/init/packages/server/src/services/EmployeeService.ts.hbs`
- Create: `packages/sd-cli/templates/init/packages/server/src/services/RoleService.ts.hbs`
- Copy: `packages/sd-cli/templates/init/packages/server/public-dev/dev/초기화.xlsx` (binary)

**Step 1: Create package.json.hbs**

Based on simplysm-opus server/package.json but:
- Replace `@simplysm-opus` → `@\{{projectName}}`
- Remove `nodemailer` and `@types/nodemailer`

```json
{
  "name": "@{{projectName}}/server",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "dependencies": {
    "@{{projectName}}/db-main": "workspace:*",
    "@simplysm/core-common": "~13.0.71",
    "@simplysm/excel": "^13.0.71",
    "@simplysm/orm-common": "~13.0.71",
    "@simplysm/orm-node": "~13.0.71",
    "@simplysm/service-server": "~13.0.71",
    "bcrypt": "^6.0.0",
    "pg": "^8.19.0",
    "pg-copy-streams": "^7.0.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0"
  }
}
```

**Step 2: Create main.ts.hbs**

Based on simplysm-opus server/src/main.ts but:
- Replace `@simplysm-opus/db-main` → `@\{{projectName}}/db-main`
- Replace `port: 40080` → `port: {{port}}`
- Remove RoleService import (it's not in the services array in main.ts anyway... let me check)

Actually, looking at the original main.ts, RoleService is NOT imported or used in main.ts. The services are: OrmService, AuthService, DevService, EmployeeService. So main.ts.hbs:

```typescript
import path from "path";
import { fileURLToPath } from "url";
import { env } from "@simplysm/core-common";
import { createServiceServer, getConfig, OrmService } from "@simplysm/service-server";
import { AuthService } from "./services/AuthService";
import { DevService } from "./services/DevService";
import { EmployeeService } from "./services/EmployeeService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = await getConfig<Record<string, \{ jwtSecret: string }>>(
  path.resolve(__dirname, ".config.json"),
);

if (config?.["auth"]?.jwtSecret == null || config["auth"].jwtSecret === "") {
  throw new Error(
    "Missing 'auth.jwtSecret' in .config.json. Server cannot start without JWT secret.",
  );
}

export const server = createServiceServer(\{
  rootPath: __dirname,
  port: {{port}},
  auth: config["auth"],
  services: env.DEV
    ? [OrmService, AuthService, DevService, EmployeeService]
    : [OrmService, AuthService, EmployeeService],
});

if (!env.DEV) \{
  await server.listen();
}
```

Wait, this has a problem. Handlebars will try to interpret `{ jwtSecret` as a helper. I need to escape braces in Handlebars. Looking at the template system, it uses `noEscape: true` but that only affects HTML entity escaping, not Handlebars syntax.

In Handlebars, literal `{` and `}` in code need to be handled. Actually, single braces `{` are fine - Handlebars only interprets `{{` as template syntax. So `{ jwtSecret: string }` with single braces is fine.

But `{{port}}` would be interpreted as a template variable, which is what we want.

The issue is in lines like `Record<string, { jwtSecret: string }>` - the `{` here is a single brace, so Handlebars won't interpret it.

Actually wait, I need to recheck. Looking at the Handlebars docs: Handlebars expressions are `{{ }}`. A single `{` is not a Handlebars expression. So all JavaScript/TypeScript `{` `}` are fine.

Let me reconsider the main.ts.hbs. The only template variables are in:
- `port: {{port}}`

That's clean. Let me verify there aren't accidental `{{` in the TypeScript code... Looking at `Record<string, { jwtSecret: string }>` - nope, single braces.

OK so the template content should be the original file content with:
1. `@simplysm-opus/db-main` → `@{{projectName}}/db-main`
2. `port: 40080` → `port: {{port}}`

**Step 3: Create index.ts (static)**

Copy exactly from simplysm-opus (no @simplysm-opus references, just local exports).

**Step 4: Create AuthService.ts.hbs**

Based on simplysm-opus AuthService.ts but:
- Replace `@simplysm-opus/db-main` → `@\{{projectName}}/db-main`
- Remove `import nodemailer from "nodemailer"`
- Remove `import crypto from "crypto"`
- Remove `ISmtpConfig` interface
- Remove `validateEmailInput` function
- Remove entire `resetPassword` method
- Remove `resetPassword` from the return object

**Step 5: Create DevService.ts.hbs**

Based on simplysm-opus DevService.ts with `@simplysm-opus/db-main` → `@\{{projectName}}/db-main`.

**Step 6: Create EmployeeService.ts.hbs**

Based on simplysm-opus EmployeeService.ts with `@simplysm-opus/db-main` → `@\{{projectName}}/db-main`.

**Step 7: Create RoleService.ts.hbs**

Based on simplysm-opus RoleService.ts with `@simplysm-opus/db-main` → `@\{{projectName}}/db-main`.

**Step 8: Copy binary file**

Copy `D:\workspaces-13\simplysm-opus\packages\server\public-dev\dev\초기화.xlsx` to `packages/sd-cli/templates/init/packages/server/public-dev/dev/초기화.xlsx`.

**Step 9: Commit**

```bash
git add packages/sd-cli/templates/init/packages/server/
git commit -m "feat(sd-cli): add server package init templates"
```

---

### Task 6: Create client-admin package templates

**Files:** ~23 files in `packages/sd-cli/templates/init/packages/client-admin/`

**Overview of what needs `@simplysm-opus` → `@{{projectName}}` replacement:**
- `package.json.hbs` — package name and dependencies
- `index.html.hbs` — title
- `src/main.tsx.hbs` — `@simplysm-opus/db-main` import
- `src/providers/AuthProvider.tsx.hbs` — `@simplysm-opus/server` import
- `src/providers/AppServiceProvider.tsx.hbs` — `@simplysm-opus/server`, `@simplysm-opus/db-main` imports
- `src/providers/configureSharedData.ts.hbs` — `@simplysm-opus/db-main` import
- `src/views/auth/LoginView.tsx` — modified: remove password reset (becomes static, no @simplysm-opus refs)
- `src/views/home/main/MainView.tsx.hbs` — `simplysm-opus` text in heading
- `src/views/home/my-info/MyInfoDetail.tsx.hbs` — `@simplysm-opus/db-main` import
- `src/views/home/base/employee/EmployeeSheet.tsx.hbs` — `@simplysm-opus/db-main` import
- `src/views/home/base/employee/EmployeeDetail.tsx.hbs` — `@simplysm-opus/db-main` import
- `src/views/home/base/role-permission/RolePermissionDetail.tsx.hbs` — `@simplysm-opus/db-main` import
- `src/views/home/base/role-permission/RoleSheet.tsx.hbs` — `@simplysm-opus/db-main` import
- `src/views/home/base/role-permission/RoleDetail.tsx.hbs` — `@simplysm-opus/db-main` import
- `src/views/home/system/system-log/SystemLogSheet.tsx.hbs` — `@simplysm-opus/db-main` import

**Static files (copy as-is):**
- `tailwind.config.ts`
- `src/main.css`
- `src/App.tsx`
- `src/dev/DevDialog.tsx`
- `src/providers/AppStructureProvider.tsx`
- `src/views/not-found/NotFoundView.tsx`
- `src/views/home/HomeView.tsx`
- `src/views/home/base/role-permission/RolePermissionView.tsx`

**Binary files (copy as-is):**
- `public/favicon.ico`
- `public/assets/logo.png`
- `public/assets/logo-landscape.png`

**Step 1: Create package.json.hbs**

```json
{
  "name": "@{{projectName}}/client-admin",
  "version": "1.0.0",
  "description": "{{description}}",
  "type": "module",
  "private": true,
  "dependencies": {
    "@{{projectName}}/db-main": "workspace:*",
    "@simplysm/core-browser": "~13.0.71",
    "@simplysm/core-common": "~13.0.71",
    "@simplysm/excel": "^13.0.71",
    "@simplysm/orm-common": "~13.0.71",
    "@simplysm/service-client": "~13.0.71",
    "@simplysm/solid": "~13.0.71",
    "@solid-primitives/event-listener": "^2.4.5",
    "@solidjs/router": "^0.15.4",
    "@tabler/icons-solidjs": "^3.37.1",
    "clsx": "^2.1.1",
    "consola": "^3.4.2",
    "solid-js": "^1.9.11",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.19"
  }
}
```

**Step 2: Create index.html.hbs**

Copy from simplysm-opus but replace `<title>Simplysm OPUS</title>` → `<title>{{projectName}}</title>`.

**Step 3: Create .hbs template files**

For each file listed in the `.hbs` section above:
1. Copy the original file from simplysm-opus
2. Replace all `@simplysm-opus/` with `@{{projectName}}/`
3. For MainView.tsx.hbs, also replace `simplysm-opus` text in the heading with `{{projectName}}`

**Step 4: Create LoginView.tsx (modified — no password reset)**

Based on simplysm-opus LoginView.tsx but:
- Remove `import { PasswordResetDialog } from "./PasswordResetDialog";`
- Remove `import { useDialog } from "@simplysm/solid";` (only if not used elsewhere — actually `dialog` is only used for password reset, so remove it from imports. Keep it in the import list since it was listed there but check if `useDialog` is still referenced. After removing handlePasswordReset, it's not. Remove `useDialog` from the import list)
- Remove `const dialog = useDialog();`
- Remove the `handlePasswordReset` function
- Remove the `<FormGroup.Item>` containing the "비밀번호 재발급" link (lines 136-140)
- Do NOT include PasswordResetDialog.tsx in templates at all

Since LoginView.tsx has no `@simplysm-opus` references after removing password reset, it becomes a static file (no .hbs needed).

**Step 5: Copy static and binary files**

Copy directly from simplysm-opus without modification.

**Step 6: Commit**

```bash
git add packages/sd-cli/templates/init/packages/client-admin/
git commit -m "feat(sd-cli): add client-admin package init templates"
```

---

### Task 7: Create e2e test templates

**Files:**
- Create: `packages/sd-cli/templates/init/tests/e2e/package.json.hbs`
- Create: `packages/sd-cli/templates/init/tests/e2e/vitest.setup.ts.hbs`
- Create: `packages/sd-cli/templates/init/tests/e2e/src/e2e.spec.ts` (static)
- Create: `packages/sd-cli/templates/init/tests/e2e/src/login.ts` (static)
- Create: `packages/sd-cli/templates/init/tests/e2e/src/employee-crud.ts` (static)

**Step 1: Create package.json.hbs**

```json
{
  "name": "@{{projectName}}-test/e2e",
  "version": "1.0.0",
  "description": "{{projectName}} E2E tests",
  "type": "module",
  "private": true,
  "dependencies": {
    "@{{projectName}}/db-main": "workspace:*",
    "@simplysm/orm-node": "~13.0.71",
    "bcrypt": "^6.0.0",
    "playwright": "^1.58.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0"
  }
}
```

**Step 2: Create vitest.setup.ts.hbs**

Copy from simplysm-opus but:
- Replace `@simplysm-opus/db-main` → `@{{projectName}}/db-main`
- Replace `database: "simplysm-opus-test"` → `database: "{{projectName}}-test"`

**Step 3: Copy static test files**

Copy from simplysm-opus without modification:
- `src/e2e.spec.ts`
- `src/login.ts`
- `src/employee-crud.ts`

None of these contain `@simplysm-opus` references.

**Step 4: Commit**

```bash
git add packages/sd-cli/templates/init/tests/
git commit -m "feat(sd-cli): add e2e test init templates"
```

---

### Task 8: Verify

**Step 1: Run sd-check on sd-cli package**

```bash
pnpm run check packages/sd-cli
```

Expected: PASS — no typecheck or lint errors.

**Step 2: Verify template file count**

Verify that `templates/init/` contains the expected number of files (~57 files across all directories).
