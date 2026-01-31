# 개발 가이드

> 생성일: 2026-01-31

## 사전 요구사항

- **Node.js**: 20.x 이상
- **pnpm**: 최신 버전
- **Docker**: ORM 통합 테스트용 (선택사항)

## 설치

```bash
# 저장소 클론
git clone https://github.com/kslhunter/simplysm.git
cd simplysm

# 의존성 설치
pnpm install

# Playwright 브라우저 설치 (postinstall에서 자동 실행)
# 수동 설치: npx playwright install
```

## 개발 명령어

### 빌드 및 개발

```bash
# Watch 모드 (빌드 + .d.ts 생성)
pnpm watch

# 특정 패키지만 watch
pnpm watch solid solid-demo

# client 타겟 패키지는 Vite dev server로 실행
```

### 타입 체크

```bash
# 전체 타입 체크
pnpm typecheck

# 특정 패키지만
pnpm typecheck packages/core-common
```

### 린팅

```bash
# 전체 린트
pnpm lint

# 특정 경로만
pnpm lint packages/core-common

# 자동 수정
pnpm lint --fix
```

### 테스트

```bash
# 모든 테스트
pnpm vitest

# 특정 프로젝트만
pnpm vitest --project=node      # Node 환경
pnpm vitest --project=browser   # 브라우저 환경
pnpm vitest --project=solid     # SolidJS 컴포넌트
pnpm vitest --project=orm       # ORM 통합 (Docker 필요)
pnpm vitest --project=service   # Service 통합

# 특정 패키지만
pnpm vitest packages/core-common

# Watch 모드
pnpm vitest --watch
```

## 테스트 환경

| 프로젝트 | 환경 | 대상 | 특이사항 |
|---------|------|------|----------|
| node | Node.js | packages/*/tests/**/*.spec.ts (node 패키지) | - |
| browser | Playwright Chromium | packages/*/tests/**/*.spec.ts (browser 패키지) | Viewport 1920x1080 |
| solid | Playwright + vite-plugin-solid | packages/solid/tests/**/*.spec.tsx | vanilla-extract 포함 |
| orm | Node.js + Docker | tests/orm/**/*.spec.ts | DB 컨테이너 필요 |
| service | Playwright | tests/service/**/*.spec.ts | 서버 자동 시작 |

## 코드 컨벤션

### TypeScript

- `strict: true` 필수
- `verbatimModuleSyntax: true` - 타입 import는 `import type` 사용
- ECMAScript private 필드(`#field`) 금지 → `private _field` 사용
- Node.js `Buffer` 금지 → `Uint8Array` 사용

### Import 규칙

```typescript
// ✅ 올바른 import
import { SomeClass } from "@simplysm/core-common";
import type { SomeType } from "@simplysm/core-common";

// ❌ 잘못된 import (src 경로 직접 참조 금지)
import { SomeClass } from "@simplysm/core-common/src/some-file";
```

### ESLint 규칙

- `no-console` - console 사용 금지 (consola 사용)
- `eqeqeq` - 항상 `===`/`!==` 사용
- `no-shadow` - 변수 섀도잉 금지
- async 함수에 await 필수

### SolidJS 컨벤션

- React 패턴 금지 (`useState` → `createSignal`)
- JSX import source: `solid-js`
- vanilla-extract 스타일링

## 패키지 의존성 규칙

```
core-common (최하위)
    ↑
core-browser / core-node
    ↑
orm-common / service-common
    ↑
orm-node / service-server / service-client
    ↑
solid (최상위)
```

- 하위 패키지는 상위 패키지를 import할 수 없음
- 동일 레벨 패키지 간 import 주의

## 캐시 관리

```bash
# 캐시 디렉토리
.cache/
├── eslint.cache         # ESLint 캐시
├── typecheck-*.tsbuildinfo  # 타입체크 incremental
└── dts.tsbuildinfo      # .d.ts 생성 정보

# 캐시 초기화
rm -rf .cache/
```

## 디버깅

### VS Code 설정

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Test",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "--project=node", "${relativeFile}"],
  "console": "integratedTerminal"
}
```

### 로깅

```typescript
import { createConsola } from "consola";

const logger = createConsola().withTag("my-module");
logger.debug("Debug message");
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
```

## 새 패키지 추가

1. `packages/` 디렉토리에 폴더 생성
2. `package.json` 생성 (name: `@simplysm/패키지명`)
3. `src/index.ts` 생성
4. `sd.config.ts`에 빌드 타겟 추가
5. `tsconfig.json` paths에 별칭 추가

## 릴리스

```bash
# 버전 업데이트 (root package.json)
# 현재: 13.0.0-beta.0

# 빌드 확인
pnpm typecheck
pnpm lint
pnpm vitest run

# npm 배포 (각 패키지별)
cd packages/core-common && npm publish
```
