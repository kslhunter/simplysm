# execa Migration Design

## Background

프로젝트 전반의 `child_process` 사용을 `execa`로 교체한다.

### 동기

1. **크로스 플랫폼 불안정**: 파일마다 `shell: true/false` 분기가 다르거나 누락
2. **불필요한 래퍼**: execa 내장 기능(Promise, Windows shell, 에러 포맷)을 `spawn.ts`에서 수동 구현 → 기술부채
3. **통일성**: 앞으로 execa만 사용하도록 표준화

## Scope

- **교체 대상**: child_process를 사용하는 모든 파일 (5개 파일)
- **제외**: `server.worker.ts`의 pm2.config.cjs 문자열 템플릿 (`require("child_process")` 텍스트 출력)
- **CLAUDE.md**: 수정하지 않음 (사용자가 별도 관리)

## Dependencies

- `execa` v9 (ESM-only — 프로젝트 전체가 ESM이므로 호환성 문제 없음)
- `sd-cli`: dependencies에 추가
- `tests/orm`: devDependencies에 추가

## File-by-File Migration

### 1. `sd-cli/src/utils/spawn.ts` → 삭제

80줄 커스텀 래퍼 제거. execa가 모든 기능을 내장.

### 2. `sd-cli/src/sd-cli.ts`

| Before | After |
|--------|-------|
| `import { exec, spawn } from "child_process"` | `import { execa } from "execa"` |
| `spawn("node", [...], { stdio: "inherit" })` + event listeners | `execa("node", [...], { stdio: "inherit" })` |
| `exec(command, callback)` fire-and-forget | `execa({ shell: true })\`${command}\`.catch(...)` |

### 3. `sd-cli/src/commands/check.ts`

| Before | After |
|--------|-------|
| `cpSpawn("pnpm", args, { shell: true, stdio: "pipe" })` + manual Promise wrapping | `execa("pnpm", args, { stdout: "pipe", stderr: "pipe" })` |

### 4. `sd-cli/src/workers/server.worker.ts`

| Before | After |
|--------|-------|
| `import cp from "child_process"` | `import { execaSync } from "execa"` |
| `cp.execSync("node -v").toString().trim()` | `execaSync("node", ["-v"]).stdout` |
| pm2.config.cjs 문자열 템플릿 | **변경 없음** |

### 5. `tests/orm/vitest.setup.ts`

| Before | After |
|--------|-------|
| `execSync(\`docker compose ...\`, { stdio: "inherit" })` | `execaSync("docker", ["compose", ...], { stdio: "inherit" })` |
| `execSync(\`docker compose ... exec ...\`, { stdio: "pipe" })` | `execaSync("docker", ["compose", ..., "exec", ...])` |

## ESLint Rule

`packages/lint` ESLint 설정에 추가:

```js
"no-restricted-imports": ["error", {
  paths: [
    { name: "child_process", message: "Use 'execa' instead of 'child_process'" },
    { name: "node:child_process", message: "Use 'execa' instead of 'child_process'" }
  ]
}]
```

## spawn.ts 사용처 정리

`spawn.ts`를 import하는 파일을 찾아 모두 execa 직접 호출로 교체한 뒤 파일 삭제.
