# CLAUDE.md

## 주요 명령어

```bash
# 타입 체크 (파일별 체크는 불가함)
pnpm typecheck                         # 전체 타입체크 (기본)
pnpm typecheck packages/core-common    # 특정 패키지만
pnpm typecheck tests/orm               # 통합테스트만

# 린트
pnpm lint                              # 전체 린트 (기본)
pnpm lint packages/core-common         # 특정 패키지만
pnpm lint --fix                        # 자동 수정

# 테스트 (Vitest)
pnpm vitest run                              # 전체 테스트 (기본)
pnpm vitest run packages/core-common/tests   # 특정 패키지만

# 단일 테스트 파일 실행
pnpm vitest run packages/core-common/tests/types/date-only.spec.ts
```

## 아키텍처

### 패키지 의존성 (병렬 처리 순서)

| 순서 | 패키지 | 내부 의존 |
|:---:|--------|----------|
| 1 | core-common, eslint-plugin, claude, solid | 없음 |
| 2 | core-browser, core-node, excel, orm-common, storage, solid-demo | core-common, solid |
| 3 | cli, orm-node, service-common | core-node, orm-common |
| 4 | service-client | service-common |
| 5 | service-server | core-node, orm-node, service-common |

### 빌드 타겟

| 타겟 | 패키지 | 설명 |
|------|--------|------|
| scripts | claude | 스크립트 전용 |
| node | cli, core-node, eslint-plugin, orm-node, service-server, storage | Node.js 전용 |
| browser | core-browser, solid | 브라우저 전용 |
| neutral | core-common, excel, orm-common, service-client, service-common | Node/브라우저 공용 |
| client | solid-demo | 클라이언트 앱 |

**주의**: `neutral`/`browser` 패키지는 Node.js 내장 모듈 사용 불가

### 테스트 프로젝트 구성

| 프로젝트 | 환경 | 위치 | 특징 |
|---------|------|------|------|
| packages | Node | `packages/*/tests/` | 패키지 단위 테스트 |
| excel | Browser (Playwright) | `packages/excel/tests/` | Node 폴리필 필요 |
| orm | Node | `tests/orm/` | Docker DB 필요, 직렬 실행 |
| service | Node + Browser | `tests/service/` | 서버/클라이언트 통합 |

## 코드 컨벤션

### 스크립트 (`packages/*/scripts/`)

- 독립적으로 실행되는 진입점으로, 각 스크립트는 자체 완결성을 갖는다.
- 스크립트 간 코드 중복이 있더라도 공통 모듈로 분리하지 않는다.

### ESLint 커스텀 규칙

- `no-hard-private`: 하드 private(`#field`) 사용 제한
- `no-subpath-imports-from-simplysm`: 서브패스 임포트 금지
- `ts-no-throw-not-implemented-error`: NotImplementedError 사용 경고

## ORM DB 호환성

- MySQL: 8.0.14+
- MSSQL: 2012+
- PostgreSQL: 9.0+
