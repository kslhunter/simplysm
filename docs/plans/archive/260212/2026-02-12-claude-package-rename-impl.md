# @simplysm/sd-claude → @simplysm/claude Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `@simplysm/sd-claude` 패키지를 `@simplysm/claude`로 이름 변경하고, CLI 기반 install/uninstall을 `postinstall` 자동 실행으로 전환한다.

**Architecture:** 디렉토리를 `packages/sd-claude/` → `packages/claude/`로 이동하고, `src/` 전체를 제거한 뒤 `scripts/postinstall.mjs`로 대체한다. sd-cli의 init 명령에서 수동 호출을 제거하고, 루트 설정 파일들의 참조를 모두 업데이트한다.

**Tech Stack:** Node.js built-in modules (`fs`, `path`, `url`), pnpm workspace

---

### Task 1: 디렉토리 이동

**Files:**
- Rename: `packages/sd-claude/` → `packages/claude/`

**Step 1: git mv로 디렉토리 이름 변경**

```bash
git mv packages/sd-claude packages/claude
```

**Step 2: 커밋**

```bash
git add -A
git commit -m "rename: packages/sd-claude → packages/claude"
```

---

### Task 2: postinstall.mjs 생성

**Files:**
- Create: `packages/claude/scripts/postinstall.mjs`

**Step 1: postinstall.mjs 작성**

`packages/claude/scripts/postinstall.mjs` 파일을 생성한다. 기존 `src/commands/install.ts`의 로직을 Node.js 내장 모듈만으로 재작성한다.

```javascript
/**
 * devDependency 설치 시 자동 실행되어 .claude/sd-* 에셋을 프로젝트에 복사한다.
 * package.json의 postinstall 스크립트로 등록하여 사용.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(__dirname, "..");
  const sourceDir = path.join(pkgRoot, "claude");

  // INIT_CWD: pnpm/npm 명령이 실행된 원래 디렉토리 (프로젝트 루트)
  const projectRoot = process.env.INIT_CWD;
  if (!projectRoot) {
    console.log("[sd-claude] INIT_CWD가 설정되지 않아 건너뜁니다.");
    process.exit(0);
  }

  // 소스 디렉토리가 없으면 건너뜀 (모노레포 개발 환경에서는 claude/ 미존재)
  if (!fs.existsSync(sourceDir)) {
    process.exit(0);
  }

  // sd-* 항목 탐색
  const sourceEntries = [];

  // 루트 레벨: sd-*
  for (const name of fs.readdirSync(sourceDir)) {
    if (name.startsWith("sd-")) {
      sourceEntries.push(name);
    }
  }

  // 서브 디렉토리: */sd-*
  for (const dirent of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name.startsWith("sd-")) continue;
    const subPath = path.join(sourceDir, dirent.name);
    for (const name of fs.readdirSync(subPath)) {
      if (name.startsWith("sd-")) {
        sourceEntries.push(path.join(dirent.name, name));
      }
    }
  }

  if (sourceEntries.length === 0) {
    process.exit(0);
  }

  const targetDir = path.join(projectRoot, ".claude");

  // 기존 sd-* 삭제
  if (fs.existsSync(targetDir)) {
    // 루트 레벨 sd-*
    for (const name of fs.readdirSync(targetDir)) {
      if (name.startsWith("sd-")) {
        fs.rmSync(path.join(targetDir, name), { recursive: true });
      }
    }
    // 서브 디렉토리 */sd-*
    for (const dirent of fs.readdirSync(targetDir, { withFileTypes: true })) {
      if (!dirent.isDirectory() || dirent.name.startsWith("sd-")) continue;
      const subPath = path.join(targetDir, dirent.name);
      for (const name of fs.readdirSync(subPath)) {
        if (name.startsWith("sd-")) {
          fs.rmSync(path.join(subPath, name), { recursive: true });
        }
      }
    }
  }

  // 복사
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of sourceEntries) {
    const src = path.join(sourceDir, entry);
    const dest = path.join(targetDir, entry);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }

  // settings.json에 statusLine 설정
  const settingsPath = path.join(targetDir, "settings.json");
  const sdStatusLineCommand = "node .claude/sd-statusline.js";
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  }

  if (settings.statusLine == null) {
    settings.statusLine = { type: "command", command: sdStatusLineCommand };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  }

  console.log(`[@simplysm/claude] ${sourceEntries.length}개의 sd-* 항목을 설치했습니다.`);
} catch (err) {
  // postinstall 실패가 pnpm install 전체를 막지 않도록 에러 무시
  console.warn("[@simplysm/claude] postinstall 경고:", err.message);
}
```

**Step 2: 커밋**

```bash
git add packages/claude/scripts/postinstall.mjs
git commit -m "feat(claude): add postinstall.mjs for automatic asset installation"
```

---

### Task 3: package.json 업데이트

**Files:**
- Modify: `packages/claude/package.json`

**Step 1: package.json 재작성**

기존 내용을 다음으로 교체한다:

```json
{
  "name": "@simplysm/claude",
  "sideEffects": false,
  "version": "13.0.0-beta.21",
  "description": "Simplysm Claude Code skills/agents — auto-installs via postinstall",
  "author": "김석래",
  "repository": {
    "type": "git",
    "url": "https://github.com/kslhunter/simplysm.git",
    "directory": "packages/claude"
  },
  "license": "Apache-2.0",
  "files": [
    "scripts",
    "claude"
  ],
  "scripts": {
    "postinstall": "node scripts/postinstall.mjs",
    "prepack": "node scripts/sync-claude-assets.mjs"
  },
  "type": "module"
}
```

제거 항목: `bin`, `dependencies`, `devDependencies`, `dist` from files.

**Step 2: 커밋**

```bash
git add packages/claude/package.json
git commit -m "refactor(claude): simplify package.json — remove CLI, deps, add postinstall"
```

---

### Task 4: src/ 디렉토리 제거

**Files:**
- Delete: `packages/claude/src/sd-claude.ts`
- Delete: `packages/claude/src/commands/install.ts`
- Delete: `packages/claude/src/commands/uninstall.ts`

**Step 1: src/ 전체 삭제**

```bash
rm -rf packages/claude/src
```

**Step 2: dist/ 삭제 (있으면)**

```bash
rm -rf packages/claude/dist
```

**Step 3: 커밋**

```bash
git add -A
git commit -m "refactor(claude): remove TypeScript src/ (replaced by scripts/postinstall.mjs)"
```

---

### Task 5: sd-cli init 명령 수정

**Files:**
- Modify: `packages/sd-cli/src/commands/init.ts:85-88`
- Modify: `packages/sd-cli/templates/init/package.json.hbs:18`

**Step 1: init.ts에서 sd-claude install 호출 제거**

`packages/sd-cli/src/commands/init.ts`에서 5단계(sd-claude install)를 제거하고 주석 번호를 정리한다.

변경 전 (85-88행):
```typescript
  // 5. sd-claude install
  logger.info("sd-claude install 실행 중...");
  await spawn("pnpm", ["exec", "sd-claude", "install"], { cwd });
  logger.success("sd-claude install 완료");
```

변경 후: 해당 4줄 삭제. 위쪽 주석도 정리:
- `// 4. pnpm install` 유지 (번호 변경 없음 — 기존이 이미 4번)
- 함수 JSDoc의 `4. pnpm install + sd-cli install 실행` → `4. pnpm install 실행`

**Step 2: 템플릿 package.json 수정**

`packages/sd-cli/templates/init/package.json.hbs`에서 패키지명 변경:

변경 전:
```
    "@simplysm/sd-claude": "~13.0.0-beta.21",
```

변경 후:
```
    "@simplysm/claude": "~13.0.0-beta.21",
```

**Step 3: 커밋**

```bash
git add packages/sd-cli/src/commands/init.ts packages/sd-cli/templates/init/package.json.hbs
git commit -m "refactor(sd-cli): remove sd-claude install call from init, update template package name"
```

---

### Task 6: 루트 설정 파일 업데이트

**Files:**
- Modify: `sd.config.ts:17`
- Modify: `.gitignore:10`
- Modify: `eslint.config.ts:5`
- Modify: `vitest.config.ts:53`

**Step 1: sd.config.ts 수정**

변경 전:
```typescript
    "sd-claude": { target: "node", publish: "npm" },
```

변경 후:
```typescript
    "claude": { target: "node", publish: "npm" },
```

> 참고: `SdPackageConfig` 타입이 `target`을 필수로 요구하므로 `target: "node"` 유지. 빌드 시 `src/`가 없으면 빌드 단계를 건너뛸 수 있는지 확인 필요. 문제가 되면 빌드 시스템에서 별도 처리.

**Step 2: .gitignore 수정**

변경 전:
```
packages/sd-claude/claude
```

변경 후:
```
packages/claude/claude
```

**Step 3: eslint.config.ts 수정**

변경 전:
```typescript
  globalIgnores([".legacy-packages/**", "packages/sd-claude/claude/**"]),
```

변경 후:
```typescript
  globalIgnores([".legacy-packages/**", "packages/claude/claude/**"]),
```

**Step 4: vitest.config.ts 수정**

변경 전:
```typescript
            "packages/sd-claude/tests/**/*.spec.{ts,tsx,js}",
```

변경 후: 해당 줄 삭제 (테스트 파일이 더 이상 없으므로).

**Step 5: 커밋**

```bash
git add sd.config.ts .gitignore eslint.config.ts vitest.config.ts
git commit -m "chore: update root configs for sd-claude → claude rename"
```

---

### Task 7: sync-claude-assets.mjs 주석 업데이트

**Files:**
- Modify: `packages/claude/scripts/sync-claude-assets.mjs:1-3`

**Step 1: 파일 상단 주석 수정**

변경 전:
```javascript
/**
 * publish/pack 전에 실행되어 .claude/sd-* 에셋을 packages/sd-claude/claude/에 복사한다.
 * package.json의 prepack 스크립트로 등록하여 사용.
 */
```

변경 후:
```javascript
/**
 * publish/pack 전에 실행되어 .claude/sd-* 에셋을 packages/claude/claude/에 복사한다.
 * package.json의 prepack 스크립트로 등록하여 사용.
 */
```

**Step 2: 커밋**

```bash
git add packages/claude/scripts/sync-claude-assets.mjs
git commit -m "chore(claude): update comment path in sync-claude-assets.mjs"
```

---

### Task 8: README 업데이트

**Files:**
- Modify: `packages/claude/README.md`
- Modify: `README.md:48`
- Modify: `packages/sd-cli/README.md:214`

**Step 1: 패키지 README 재작성**

`packages/claude/README.md`를 다음으로 교체:

```markdown
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
```

**Step 2: 루트 README.md 수정**

변경 전:
```markdown
| [`@simplysm/sd-claude`](packages/sd-claude/README.md) | node | Claude Code skills/agents install/uninstall CLI |
```

변경 후:
```markdown
| [`@simplysm/claude`](packages/claude/README.md) | - | Claude Code skills/agents (auto-installs via postinstall) |
```

**Step 3: sd-cli README.md 수정**

변경 전:
```markdown
> **Note**: To install Claude Code skills/agents, use `sd-claude install` from the separate `@simplysm/sd-claude` package.
```

변경 후:
```markdown
> **Note**: Claude Code skills/agents are automatically installed via `@simplysm/claude` postinstall.
```

**Step 4: 커밋**

```bash
git add packages/claude/README.md README.md packages/sd-cli/README.md
git commit -m "docs: update READMEs for sd-claude → claude rename"
```

---

### Task 9: 검증

**Step 1: pnpm install 실행**

```bash
pnpm install
```

Expected: 성공. `@simplysm/claude`의 postinstall이 실행되지만, 모노레포에서는 `claude/` 디렉토리가 비어있으므로 조용히 건너뜀.

**Step 2: lint 검증**

```bash
pnpm lint packages/sd-cli
```

Expected: PASS

**Step 3: typecheck 검증**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: 문제가 있으면 수정 후 커밋**

```bash
git add -A
git commit -m "fix: resolve issues from claude package rename"
```
