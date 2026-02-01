# Simplysm 프로젝트 문서

> 생성일: 2026-02-01
> 버전: 13.0.0-beta.0
> 마지막 스캔: 2026-02-01 (Deep Scan)

## 프로젝트 개요

- **타입**: 모노레포 (14개 패키지)
- **언어**: TypeScript 5.9.3
- **아키텍처**: 풀스택 프레임워크 (UI + ORM + 서비스)
- **워크스페이스 도구**: pnpm
- **저장소**: https://github.com/kslhunter/simplysm

## 빠른 참조

### 핵심 기술 스택

| 카테고리 | 기술 | 버전 |
|----------|------|------|
| 언어 | TypeScript | 5.9.3 |
| UI 프레임워크 | SolidJS | 1.9.11 |
| 서버 | Fastify | 5.7.1 |
| 빌드 | Vite | 7.3.1 |
| 스타일링 | Tailwind CSS | 3.4.19 |
| 테스트 | Vitest + Playwright | 4.0.18 |

### 패키지 목록

| 패키지 | 타입 | 타겟 | 설명 |
|--------|------|------|------|
| @simplysm/cli | cli | node | 빌드/린트/타입체크/publish/device CLI |
| @simplysm/core-common | library | neutral | 공통 유틸리티 |
| @simplysm/core-browser | library | browser | 브라우저 유틸리티 |
| @simplysm/core-node | library | node | Node.js 유틸리티 |
| @simplysm/eslint-plugin | library | node | ESLint 규칙 |
| @simplysm/excel | library | neutral | Excel 읽기/쓰기 |
| @simplysm/orm-common | library | neutral | ORM 쿼리 빌더 |
| @simplysm/orm-node | backend | node | DB 커넥션 |
| @simplysm/service-common | library | neutral | 서비스 프로토콜 |
| @simplysm/service-client | library | neutral | WebSocket 클라이언트 |
| @simplysm/service-server | backend | node | HTTP/WebSocket 서버 |
| @simplysm/solid | web | browser | SolidJS UI (마이그레이션 중) |
| @simplysm/solid-demo | web | client | 데모 앱 |
| @simplysm/storage | backend | node | FTP/SFTP 클라이언트 |

## 생성된 문서

### 아키텍처

- [아키텍처 문서](./architecture.md) - 전체 시스템 아키텍처
- [기술 스택](./technology-stack.md) - 패키지별 기술 스택 상세
- [소스 트리 분석](./source-tree-analysis.md) - 디렉토리 구조 및 엔트리포인트

### API 및 컴포넌트

- [API 계약](./api-contracts.md) - HTTP/WebSocket API, ORM 패턴
- [컴포넌트 인벤토리](./component-inventory.md) - SolidJS UI 컴포넌트 (마이그레이션 중)

### 개발 가이드

- [개발 가이드](./development-guide.md) - 설치, 명령어, 컨벤션

## 기존 문서

### 패키지 README

- [cli/README.md](../packages/cli/README.md)
- [core-common/README.md](../packages/core-common/README.md)
- [core-browser/README.md](../packages/core-browser/README.md)
- [core-node/README.md](../packages/core-node/README.md)
- [eslint-plugin/README.md](../packages/eslint-plugin/README.md)
- [excel/README.md](../packages/excel/README.md)
- [orm-common/README.md](../packages/orm-common/README.md)
- [orm-node/README.md](../packages/orm-node/README.md)
- [service-common/README.md](../packages/service-common/README.md)
- [service-client/README.md](../packages/service-client/README.md)
- [service-server/README.md](../packages/service-server/README.md)
- [storage/README.md](../packages/storage/README.md)

### 프로젝트 가이드

- [CLAUDE.md](../CLAUDE.md) - AI 어시스턴트 가이드
- [packages/solid/CLAUDE.md](../packages/solid/CLAUDE.md) - Solid 패키지 특화 규칙

## 시작하기

### 1. 설치

```bash
git clone https://github.com/kslhunter/simplysm.git
cd simplysm
pnpm install
```

### 2. 개발 모드 실행

```bash
# 전체 watch
pnpm watch

# 특정 패키지만
pnpm watch solid solid-demo
```

### 3. 테스트

```bash
# 전체 테스트
pnpm vitest

# 특정 환경만
pnpm vitest --project=node
pnpm vitest --project=browser
pnpm vitest --project=solid
```

### 4. 린트 및 타입체크

```bash
pnpm lint
pnpm lint --fix  # 자동 수정
pnpm typecheck
```

### 5. 프로덕션 빌드

```bash
pnpm build
pnpm build solid  # 특정 패키지만
```

## 주요 사용 패턴

### ORM 사용

```typescript
import { Table, DbContext, queryable } from "@simplysm/orm-common";
import { SdOrm } from "@simplysm/orm-node";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id");

class MyDb extends DbContext {
  readonly user = queryable(this, User);
}

const orm = new SdOrm(MyDb, { dialect: "mysql", ... });
await orm.connectAsync(async (db) => {
  const users = await db.user().resultAsync();
});
```

### 서비스 서버 실행

```typescript
import { ServiceServer } from "@simplysm/service-server";

const server = new ServiceServer({
  port: 3000,
  rootPath: __dirname,
});

await server.listenAsync();
```

### SolidJS 컴포넌트 사용

```tsx
import { Button } from "@simplysm/solid";

function App() {
  return <Button onClick={() => console.log("clicked")}>클릭</Button>;
}
```

## 현재 진행 중인 작업

### solid 패키지 마이그레이션

- **상태**: vanilla-extract → Tailwind CSS 마이그레이션 중
- **완료된 컴포넌트**: Button
- **예정된 컴포넌트**: Checkbox, Switch, Radio, TextField 외 15개
- **백업 위치**: `.back/260201/solid/`

### 새로 추가된 CLI 명령어

- `device` - Capacitor Android 빌드 지원

---

*이 문서는 document-project 워크플로우에 의해 자동 생성되었습니다.*
