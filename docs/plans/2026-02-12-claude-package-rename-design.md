# @simplysm/sd-claude → @simplysm/claude 패키지 리팩토링

## 목표

`@simplysm/sd-claude` 패키지를 `@simplysm/claude`로 이름을 변경하고, CLI 기반의 수동 install/uninstall 방식에서 `postinstall` 자동 실행 방식으로 전환한다.

## 변경 사항

### 1. 패키지 구조 변경

**디렉토리**: `packages/sd-claude/` → `packages/claude/` (git mv)

**변경 후 구조:**
```
packages/claude/
├── scripts/
│   ├── postinstall.mjs              # NEW: 에셋 설치 로직 (Node.js 내장 모듈만 사용)
│   └── sync-claude-assets.mjs       # 기존 유지 (prepack)
├── claude/                          # 기존 유지 (gitignored, prepack으로 채워짐)
└── package.json
```

**제거:**
- `src/` 전체 (sd-claude.ts, index.ts, commands/)
- `dist/` 전체
- 모든 dependencies (`@simplysm/core-node`, `consola`, `yargs`, `@types/yargs`)
- `bin` 필드

**package.json:**
```json
{
  "name": "@simplysm/claude",
  "scripts": {
    "postinstall": "node scripts/postinstall.mjs",
    "prepack": "node scripts/sync-claude-assets.mjs"
  },
  "files": ["scripts", "claude"]
}
```

### 2. postinstall.mjs 로직

1. `process.env.INIT_CWD`에서 프로젝트 루트 획득
2. 패키지의 `claude/` 디렉토리에서 `sd-*` 에셋 수집
3. 프로젝트 `.claude/`의 기존 `sd-*` 항목 정리
4. 새 에셋 복사
5. `.claude/settings.json`에 statusLine 등록
6. 전체를 try-catch로 감싸서 실패해도 pnpm install을 막지 않음

Node.js 내장 모듈만 사용: `fs`, `path`, `url`

### 3. sd-cli 변경

**init.ts:**
- `pnpm exec sd-claude install` 호출 제거 (postinstall이 대체)

**templates/init/package.json.hbs:**
- `@simplysm/sd-claude` → `@simplysm/claude`

### 4. 루트 설정 업데이트

| 파일 | 변경 내용 |
|------|----------|
| `sd.config.ts` | `"sd-claude": { target: "node", publish: "npm" }` → `"claude": { publish: "npm" }` (target 불필요 또는 유지 필요 확인) |
| `README.md` | 패키지 목록 이름 변경 |
| `.gitignore` | `packages/sd-claude/claude` → `packages/claude/claude` |
| `eslint.config.ts` | `packages/sd-claude/claude/**` → `packages/claude/claude/**` |

### 5. uninstall 없음

패키지 제거 시 `.claude/`의 `sd-*` 에셋은 수동 정리. npm preuninstall의 신뢰성 문제로 자동 정리 미구현.

## 주의사항

- postinstall 에러가 전체 `pnpm install`을 실패시키지 않도록 try-catch 처리
- `pnpm install --ignore-scripts` 사용 시 postinstall 미실행 → 문서 안내
- `pnpm up` 시에도 postinstall 실행됨 (업데이트 시 자동 재설치)
- sd.config.ts에서 target 없는 패키지 지원 여부 확인 필요
