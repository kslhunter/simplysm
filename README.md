# Simplysm

TypeScript 기반의 풀스택 프레임워크 모노레포.
pnpm 워크스페이스로 관리되며, SolidJS UI 컴포넌트, ORM, 서비스 통신, Excel 처리 등 다양한 패키지를 제공합니다.

## 설계 철학

- **표준 패턴 우선** — TypeScript/JavaScript/SolidJS의 관용적 패턴을 활용하여 러닝커브를 낮춥니다.
- **명시적이고 예측 가능한 코드** — 암묵적 동작보다 명시적 코드를 선호합니다.
- **점진적 학습** — 각 패키지를 독립적으로 사용할 수 있어 필요한 부분만 학습하고 적용할 수 있습니다.

## 패키지

### Core

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [`@simplysm/core-common`](packages/core-common/README.md) | neutral | 공통 유틸리티, 커스텀 타입(`DateTime`, `DateOnly`, `Time`, `Uuid`), 에러 클래스 |
| [`@simplysm/core-browser`](packages/core-browser/README.md) | browser | 브라우저 전용 확장 |
| [`@simplysm/core-node`](packages/core-node/README.md) | node | Node.js 유틸리티 (파일시스템, 워커) |

### ORM

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [`@simplysm/orm-common`](packages/orm-common/README.md) | neutral | ORM 쿼리 빌더, 테이블 스키마 정의 |
| [`@simplysm/orm-node`](packages/orm-node/README.md) | node | DB 커넥션 (MySQL, MSSQL, PostgreSQL) |

### Service

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [`@simplysm/service-common`](packages/service-common/README.md) | neutral | 서비스 프로토콜, 타입 정의 |
| [`@simplysm/service-client`](packages/service-client/README.md) | neutral | WebSocket 클라이언트 |
| [`@simplysm/service-server`](packages/service-server/README.md) | node | Fastify 기반 HTTP/WebSocket 서버 |

### UI

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [`@simplysm/solid`](packages/solid/README.md) | browser | SolidJS UI 컴포넌트 + Tailwind CSS |

### 도구

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [`@simplysm/cli`](packages/cli/README.md) | node | 빌드, 린트, 타입체크 CLI 도구 |
| [`@simplysm/eslint-plugin`](packages/eslint-plugin/README.md) | node | ESLint 커스텀 규칙 |
| [`@simplysm/excel`](packages/excel/README.md) | neutral | Excel(.xlsx) 읽기/쓰기 |
| [`@simplysm/storage`](packages/storage/README.md) | node | FTP/SFTP 클라이언트 |

### Capacitor 플러그인

| 패키지 | 설명 |
|--------|------|
| [`@simplysm/capacitor-plugin-auto-update`](packages/capacitor-plugin-auto-update/README.md) | 자동 업데이트 |
| [`@simplysm/capacitor-plugin-broadcast`](packages/capacitor-plugin-broadcast/README.md) | 브로드캐스트 |
| [`@simplysm/capacitor-plugin-file-system`](packages/capacitor-plugin-file-system/README.md) | 파일 시스템 |
| [`@simplysm/capacitor-plugin-usb-storage`](packages/capacitor-plugin-usb-storage/README.md) | USB 스토리지 |

## 시작하기

### 사전 요구사항

- Node.js 20+
- pnpm

### 설치

```bash
pnpm install
```

### 개발

```bash
# Watch 모드 (라이브러리 빌드 + .d.ts 생성, 변경 감지)
pnpm watch

# Dev 모드 (클라이언트: Vite dev server, 서버: 빌드)
pnpm dev

# 특정 패키지만
pnpm watch solid
pnpm build solid
```

### 빌드

```bash
pnpm build
```

### 린트 & 타입체크

```bash
pnpm lint
pnpm lint --fix
pnpm typecheck
```

### 테스트

[Vitest](https://vitest.dev/)를 사용합니다.

```bash
pnpm vitest                     # 전체
pnpm vitest --project=node      # Node 환경
pnpm vitest --project=browser   # 브라우저 환경
pnpm vitest --project=solid     # SolidJS 컴포넌트
pnpm vitest --project=orm       # ORM 통합 테스트 (Docker DB 필요)
pnpm vitest --project=service   # Service 통합 테스트
```

## 아키텍처

### 의존성 계층

```
core-common (공통 유틸리티)
    ↑
core-browser / core-node (환경별 확장)
    ↑
orm-common / service-common (도메인별 공통)
    ↑
orm-node / service-server / service-client (구현체)
    ↑
solid (UI 컴포넌트)
```

### 빌드 타겟

| 타겟 | 설명 |
|------|------|
| `node` | Node.js 전용 (DOM 제외) |
| `browser` | 브라우저 전용 (DOM 포함) |
| `neutral` | Node/브라우저 공용 |
| `client` | Vite dev server 개발용 |

## 사용 예시

### ORM 테이블 정의

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id");
```

### 서비스 통신

- `ServiceServer`: Fastify 기반 HTTP/WebSocket 서버
- `ServiceClient`: WebSocket 클라이언트, RPC 호출
- `ServiceProtocol`: 대용량 메시지 자동 분할/병합

## 라이선스

[Apache-2.0](LICENSE)
