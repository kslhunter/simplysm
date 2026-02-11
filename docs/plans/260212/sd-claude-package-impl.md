# Extract `@simplysm/sd-claude` Package — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** CLI 패키지에서 Claude Code 스킬/에이전트 관련 코드를 분리하여 독립 패키지 `@simplysm/sd-claude`를 생성한다.

**Architecture:** `install.ts`, `uninstall.ts` 소스를 `packages/sd-claude/`로 이동하고, 새 bin 진입점(`sd-claude`)을 만든다. `cli` 패키지에서 해당 코드를 제거하고 빌드 설정을 갱신한다.

**Tech Stack:** TypeScript, yargs, consola, `@simplysm/core-node`

---

### Task 1: sd-claude 패키지 scaffolding 생성

**Files:**
- Create: `packages/sd-claude/package.json`

**Step 1: package.json 생성**

```json
{
  "name": "@simplysm/sd-claude",
  "sideEffects": false,
  "version": "13.0.0-beta.6",
  "description": "심플리즘 패키지 - Claude Code 스킬/에이전트 설치 도구",
  "author": "김석래",
  "repository": {
    "type": "git",
    "url": "https://github.com/kslhunter/simplysm.git",
    "directory": "packages/sd-claude"
  },
  "license": "Apache-2.0",
  "files": [
    "dist",
    "claude"
  ],
  "scripts": {
    "prepack": "node scripts/sync-claude-assets.mjs"
  },
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "sd-claude": "./dist/sd-claude.js"
  },
  "dependencies": {
    "@simplysm/core-node": "workspace:*",
    "consola": "^3.4.2",
    "yargs": "^18.0.0"
  },
  "devDependencies": {
    "@types/yargs": "^17.0.35"
  }
}
```

참고: `install.ts`가 `@simplysm/core-node`의 `fsGlob`, `fsExists`, `fsCopy`, `fsRm`, `fsMkdir`, `fsReadJson`, `fsWriteJson`를 사용하므로 의존성에 포함.

**Step 2: Commit**

```bash
git add packages/sd-claude/package.json
git commit -m "chore(sd-claude): add package scaffolding"
```

---

### Task 2: 커맨드 소스 파일 이동

**Files:**
- Create: `packages/sd-claude/src/commands/install.ts` (from `packages/cli/src/commands/install.ts`)
- Create: `packages/sd-claude/src/commands/uninstall.ts` (from `packages/cli/src/commands/uninstall.ts`)

**Step 1: install.ts 이동**

`packages/cli/src/commands/install.ts`를 `packages/sd-claude/src/commands/install.ts`로 복사한다.
logger 태그만 변경:

```typescript
// 변경 전
const logger = consola.withTag("sd:cli:install");
// 변경 후
const logger = consola.withTag("sd:claude:install");
```

**Step 2: uninstall.ts 이동**

`packages/cli/src/commands/uninstall.ts`를 `packages/sd-claude/src/commands/uninstall.ts`로 복사한다.
logger 태그만 변경:

```typescript
// 변경 전
const logger = consola.withTag("sd:cli:uninstall");
// 변경 후
const logger = consola.withTag("sd:claude:uninstall");
```

**Step 3: Commit**

```bash
git add packages/sd-claude/src/commands/
git commit -m "feat(sd-claude): move install/uninstall commands from cli"
```

---

### Task 3: sd-claude CLI 진입점 및 index.ts 생성

**Files:**
- Create: `packages/sd-claude/src/sd-claude.ts`
- Create: `packages/sd-claude/src/index.ts`

**Step 1: sd-claude.ts 생성**

기존 `sd-cli.ts`의 패턴을 따르되, install/uninstall 커맨드만 등록한다.

```typescript
#!/usr/bin/env node

import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { runInstall } from "./commands/install";
import { runUninstall } from "./commands/uninstall";
import path from "path";
import { fileURLToPath } from "url";
import { consola, LogLevels } from "consola";

/**
 * CLI 파서를 생성한다.
 * @internal 테스트용으로 export
 */
export function createCliParser(argv: string[]): Argv {
  return yargs(argv)
    .help("help", "도움말")
    .alias("help", "h")
    .option("debug", {
      type: "boolean",
      describe: "debug 로그 출력",
      default: false,
      global: true,
    })
    .middleware((args) => {
      if (args.debug) consola.level = LogLevels.debug;
    })
    .command(
      "install",
      "Claude Code 스킬/에이전트를 현재 프로젝트에 설치한다.",
      (cmd) => cmd.version(false).hide("help"),
      async () => {
        await runInstall({});
      },
    )
    .command(
      "uninstall",
      "현재 프로젝트에서 Claude Code 스킬/에이전트를 제거한다.",
      (cmd) => cmd.version(false).hide("help"),
      async () => {
        await runUninstall({});
      },
    )
    .demandCommand(1, "명령어를 지정해주세요.")
    .strict();
}

const cliEntryPath = process.argv.at(1);
if (cliEntryPath != null && fileURLToPath(import.meta.url) === path.resolve(cliEntryPath)) {
  await createCliParser(hideBin(process.argv)).parse();
}
```

**Step 2: index.ts 생성**

```typescript
export { runInstall, type InstallOptions } from "./commands/install";
export { runUninstall, type UninstallOptions } from "./commands/uninstall";
```

**Step 3: Commit**

```bash
git add packages/sd-claude/src/
git commit -m "feat(sd-claude): add CLI entry point and index exports"
```

---

### Task 4: sync-claude-assets.mjs 이동

**Files:**
- Create: `packages/sd-claude/scripts/sync-claude-assets.mjs` (from `packages/cli/scripts/sync-claude-assets.mjs`)

**Step 1: 스크립트 복사**

`packages/cli/scripts/sync-claude-assets.mjs`를 `packages/sd-claude/scripts/sync-claude-assets.mjs`로 복사한다.

주석만 경로 반영:
```javascript
// 변경 전
 * publish/pack 전에 실행되어 .claude/sd-* 에셋을 packages/cli/claude/에 복사한다.
// 변경 후
 * publish/pack 전에 실행되어 .claude/sd-* 에셋을 packages/sd-claude/claude/에 복사한다.
```

로직은 동일 — `process.cwd()`와 `../..`로 프로젝트 루트를 찾으므로 경로 수정 불필요.

**Step 2: Commit**

```bash
git add packages/sd-claude/scripts/
git commit -m "chore(sd-claude): move sync-claude-assets script from cli"
```

---

### Task 5: cli 패키지 정리

**Files:**
- Delete: `packages/cli/src/commands/install.ts`
- Delete: `packages/cli/src/commands/uninstall.ts`
- Delete: `packages/cli/scripts/sync-claude-assets.mjs`
- Modify: `packages/cli/src/sd-cli.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/package.json`

**Step 1: install.ts, uninstall.ts 삭제**

```bash
rm packages/cli/src/commands/install.ts
rm packages/cli/src/commands/uninstall.ts
```

**Step 2: sync-claude-assets.mjs 삭제**

```bash
rm packages/cli/scripts/sync-claude-assets.mjs
```

`packages/cli/scripts/` 디렉토리가 비어있으면 삭제:
```bash
rmdir packages/cli/scripts/
```

**Step 3: sd-cli.ts에서 install/uninstall 커맨드 제거**

`packages/cli/src/sd-cli.ts`에서:
- `import { runInstall }` 제거
- `import { runUninstall }` 제거
- `.command("install", ...)` 블록 제거
- `.command("uninstall", ...)` 블록 제거

**Step 4: index.ts에서 export 제거**

`packages/cli/src/index.ts`에서:
```typescript
// 이 두 줄 제거
export { runInstall, type InstallOptions } from "./commands/install";
export { runUninstall, type UninstallOptions } from "./commands/uninstall";
```

**Step 5: package.json 수정**

`packages/cli/package.json`에서:
- `"files"` 필드 전체 제거
- `"bin"` 에서 `"cli"` 항목 제거 (→ `"sd-cli"`만 남김)
- `"scripts"` 에서 `"prepack"` 제거 (scripts 객체가 비면 전체 제거)

**Step 6: Commit**

```bash
git add -u packages/cli/
git commit -m "refactor(cli): remove install/uninstall commands and claude assets"
```

---

### Task 6: 빌드 설정 및 .gitignore 갱신

**Files:**
- Modify: `.gitignore`
- Modify: `sd.config.ts`

**Step 1: .gitignore 수정**

```diff
- packages/cli/claude
+ packages/sd-claude/claude
```

**Step 2: sd.config.ts에 sd-claude 추가**

```typescript
"sd-claude": { target: "node", publish: "npm" },
```

알파벳순으로 적절한 위치에 삽입.

**Step 3: Commit**

```bash
git add .gitignore sd.config.ts
git commit -m "chore: update gitignore and build config for sd-claude package"
```

---

### Task 7: 의존성 설치 및 검증

**Step 1: pnpm install**

```bash
pnpm install
```

**Step 2: typecheck**

```bash
pnpm typecheck packages/sd-claude
pnpm typecheck packages/cli
```

Expected: 에러 없음

**Step 3: lint**

```bash
pnpm lint packages/sd-claude
pnpm lint packages/cli
```

Expected: 에러 없음

**Step 4: Commit (필요 시)**

typecheck/lint에서 수정이 필요하면 수정 후 커밋.
