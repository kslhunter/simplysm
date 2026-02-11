# CLI `init` Command Design

## Overview

Add an `sd-cli init` command that scaffolds a new Simplysm application project (monorepo + SolidJS client package) in the current directory.

## User Flow

```
$ mkdir myapp && cd myapp
$ sd-cli init

? 클라이언트 이름을 입력하세요 (client-___): admin
? 라우터를 사용하시겠습니까? (Y/n): Y

✔ 프로젝트 파일 생성 완료
▸ pnpm install 실행 중...
✔ pnpm install 완료
▸ sd-cli install 실행 중...
✔ sd-cli install 완료

🎉 프로젝트가 생성되었습니다!

  pnpm dev client-admin    개발 서버 실행
```

### Input Collection

| Input | Source | Example |
|-------|--------|---------|
| Project name | `path.basename(process.cwd())` | `myapp` |
| Client suffix | Interactive prompt (text input) | `admin` |
| Use router | Interactive prompt (confirm) | `true` |

### Preconditions

- Current directory must be empty (error otherwise)
- Project name (directory name) must be valid npm scope name

### Post-init Steps (automatic)

1. `pnpm install`
2. `sd-cli install` (Claude Code skills)

## Generated File Structure

```
myapp/
├── package.json                    # Workspace root, scripts
├── pnpm-workspace.yaml             # packages: ["packages/*"]
├── sd.config.ts                    # { "client-admin": { target: "client" } }
├── tsconfig.json                   # strict, paths, JSX
├── eslint.config.ts                # @simplysm/eslint-plugin
├── .prettierrc.yaml                # printWidth: 120, semi: true, etc.
├── .prettierignore                 # *.md
├── .gitignore                      # node_modules, dist, .cache, etc.
├── mise.toml                       # Tool version management (Node.js)
│
└── packages/
    └── client-admin/               # @myapp/client-admin
        ├── package.json            # Dependencies (solid-js, @simplysm/solid, etc.)
        ├── index.html              # SPA entry point
        ├── tailwind.config.ts      # simplysmPreset
        ├── public/
        │   └── favicon.ico         # Default favicon (binary copy)
        └── src/
            ├── main.tsx            # App render entry point
            ├── App.tsx             # Root component with Providers
            ├── main.css            # @simplysm/solid base + tailwind
            ├── appStructure.ts     # 🔀 Only when router=true
            └── pages/
                └── HomePage.tsx    # Empty default page
```

### Router-dependent Files

| File | Router=true | Router=false |
|------|-------------|--------------|
| `main.tsx` | `HashRouter` + `lazy()` routing | Simple `render()` |
| `App.tsx` | Receives `RouteSectionProps` | Directly includes `HomePage` |
| `appStructure.ts` | Generated | Not generated |

## Template Architecture

### Template Directory (in CLI package)

```
packages/cli/
├── src/
│   ├── sd-cli.ts                    # Register init command
│   ├── commands/
│   │   └── init.ts                  # runInit() implementation
│   └── utils/
│       └── template.ts              # renderTemplateDir() utility
│
└── templates/
    └── init/
        ├── package.json.hbs
        ├── pnpm-workspace.yaml.hbs
        ├── sd.config.ts.hbs
        ├── tsconfig.json.hbs
        ├── eslint.config.ts.hbs
        ├── .prettierrc.yaml.hbs
        ├── .prettierignore.hbs
        ├── .gitignore.hbs
        ├── mise.toml.hbs
        │
        └── packages/
            └── __CLIENT__/          # → client-{suffix}
                ├── package.json.hbs
                ├── index.html.hbs
                ├── tailwind.config.ts.hbs
                ├── public/
                │   └── favicon.ico  # Binary: copy as-is
                └── src/
                    ├── main.tsx.hbs
                    ├── App.tsx.hbs
                    ├── main.css.hbs
                    ├── appStructure.ts.hbs
                    └── pages/
                        └── HomePage.tsx.hbs
```

### Template Processing Rules

- `.hbs` extension → Handlebars compile, save without `.hbs`
- No `.hbs` extension (e.g., `favicon.ico`) → Copy as-is (binary safe)
- `__CLIENT__` directory marker → Replaced with `client-{suffix}`
- File-level conditional: If entire `.hbs` content is wrapped in `{{#if router}}...{{/if}}` and renders to empty string → Skip file creation

### Handlebars Context

```typescript
{
  projectName: "myapp",        // from path.basename(cwd)
  clientSuffix: "admin",       // from prompt
  clientName: "client-admin",  // computed
  router: true,                // from prompt
}
```

## Implementation Details

### Command Registration (`sd-cli.ts`)

```typescript
.command("init", "새 프로젝트 초기화", {}, async () => {
  const { runInit } = await import("./commands/init.js");
  await runInit();
})
```

### Command Implementation (`commands/init.ts`)

```typescript
export async function runInit() {
  // 1. Validate current directory is empty
  // 2. Validate project name (dirname) is valid npm scope
  // 3. Interactive prompts (inquirer)
  //    - Client suffix (input)
  //    - Router usage (confirm)
  // 4. Render templates & write files
  //    - renderTemplateDir(templateDir, destDir, context)
  // 5. Post-processing
  //    - spawn: pnpm install
  //    - spawn: sd-cli install
  // 6. Print success message with next steps
}
```

### Template Utility (`utils/template.ts`)

```typescript
async function renderTemplateDir(
  srcDir: string,
  destDir: string,
  context: Record<string, unknown>,
): Promise<void>
```

- Recursively walks `srcDir`
- Applies directory name substitution (`__CLIENT__` → `client-{suffix}`)
- For `.hbs` files: compile with Handlebars, skip if result is empty/whitespace
- For other files: copy as-is
- Reusable for future `add` commands (server, db)

### New Dependencies

| Package | Purpose |
|---------|---------|
| `handlebars` | Template rendering |
| `@inquirer/prompts` | Interactive prompts (`input`, `confirm`) |

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Directory not empty | Error message + exit |
| Invalid project name | Error message + exit |
| Ctrl+C during prompt | Graceful exit (inquirer default) |
| `pnpm install` failure | Error output, generated files preserved |

## Future Extensibility

- **`sd-cli add server`** — Add server package using `templates/add-server/`
- **`sd-cli add db`** — Add DB package using `templates/add-db/`
- All `add` commands reuse `renderTemplateDir()` utility
- Template directory structure makes it easy to add/modify boilerplate without touching TypeScript code
