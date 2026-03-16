# Simplysm

SolidJS + TypeScript 기반 풀스택 엔터프라이즈 애플리케이션 프레임워크. 타입 안전한 ORM, WebSocket RPC 서비스, UI 컴포넌트 라이브러리, 빌드/배포 도구를 하나의 pnpm monorepo에서 제공한다.

## 설계 철학

- **타입 안전성 우선**: ORM 쿼리부터 RPC 호출, UI 이벤트까지 TypeScript 제네릭으로 컴파일 타임 검증
- **플랫폼 중립 코어**: `core-common`, `orm-common`, `service-common`은 Node.js/브라우저 모두에서 동작
- **불변 패턴**: DateTime, DateOnly, Table 빌더 등 핵심 타입은 불변 설계
- **최소 의존성**: 가능한 한 표준 API 사용 (`EventTarget`, `Uint8Array`, `IndexedDB`)

## 패키지

### 코어

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [@simplysm/core-common](packages/core-common) | common | 플랫폼 중립 유틸리티 -- DateTime, EventEmitter, 객체/문자열/JSON/ZIP 유틸리티, 배열 확장 |
| [@simplysm/core-browser](packages/core-browser) | browser | 브라우저 유틸리티 -- DOM 확장, IndexedDB 추상화, 파일 다운로드 |
| [@simplysm/core-node](packages/core-node) | node | Node.js 유틸리티 -- 파일시스템(fsx), 파일 감시(FsWatcher), Worker 스레드 |

### ORM

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [@simplysm/orm-common](packages/orm-common) | common | ORM 핵심 -- 스키마 정의, 타입 안전 쿼리 빌더, 표현식, DDL, MySQL/PostgreSQL/MSSQL 방언 |
| [@simplysm/orm-node](packages/orm-node) | node | ORM 실행기 -- DB 연결, 커넥션 풀, 벌크 인서트 (MySQL, PostgreSQL, MSSQL) |

### 서비스

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [@simplysm/service-common](packages/service-common) | common | 서비스 프로토콜 -- 바이너리 프로토콜, 메시지 타입, 이벤트 정의 |
| [@simplysm/service-client](packages/service-client) | common | WebSocket RPC 클라이언트 -- 자동 재연결, 이벤트 구독, 파일 전송 |
| [@simplysm/service-server](packages/service-server) | node | Fastify 서비스 서버 -- WebSocket/HTTP RPC, JWT 인증, 이벤트 브로드캐스트 |

### UI

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [@simplysm/solid](packages/solid) | browser | SolidJS + Tailwind CSS UI 라이브러리 -- 100+ 컴포넌트, 테마, i18n, CRUD |

### 모바일 (Capacitor)

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [@simplysm/capacitor-plugin-auto-update](packages/capacitor-plugin-auto-update) | android | APK 자동 업데이트 (서버/외부 스토리지) |
| [@simplysm/capacitor-plugin-broadcast](packages/capacitor-plugin-broadcast) | android | Android 브로드캐스트 송수신 (바코드 스캐너, PDA 등) |
| [@simplysm/capacitor-plugin-file-system](packages/capacitor-plugin-file-system) | android | 파일시스템 접근 (Android 네이티브 + Web IndexedDB 가상 FS) |
| [@simplysm/capacitor-plugin-usb-storage](packages/capacitor-plugin-usb-storage) | android | USB Mass Storage 읽기 (Android 네이티브 + Web 가상 FS) |

### 도구

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| [@simplysm/sd-cli](packages/sd-cli) | node | 빌드/개발/린트/배포 CLI 도구 (esbuild, Vite 기반) |
| [@simplysm/lint](packages/lint) | node | ESLint v9 flat config 설정 및 커스텀 규칙 |
| [@simplysm/excel](packages/excel) | common | Excel(.xlsx) 읽기/쓰기 -- 지연 로딩으로 대용량 파일 메모리 효율 처리 |
| [@simplysm/storage](packages/storage) | node | FTP/FTPS/SFTP 원격 스토리지 클라이언트 |
| [@simplysm/sd-claude](packages/sd-claude) | node | Claude Code 에셋(rules, skills, hooks) 설치/동기화 |

## 시작하기

### 사전 요구사항

- Node.js (ESNext 지원 버전)
- pnpm
- Docker (통합 테스트용 -- MySQL, PostgreSQL, MSSQL 컨테이너)

### 설치

```bash
git clone https://github.com/kslhunter/simplysm.git
cd simplysm
pnpm install
```

### 개발

```bash
pnpm dev                                 # 전체 패키지 개발 모드
pnpm dev packages/solid-demo             # 특정 패키지만 개발 모드
pnpm dev -o key=value                    # sd.config.ts에 옵션 전달
pnpm watch packages/core-common          # 라이브러리 빌드 watch 모드
```

### 빌드

```bash
pnpm build                               # 전체 프로덕션 빌드
pnpm build packages/solid                # 특정 패키지만 빌드
```

### 배포

```bash
pnpm pub                                 # 빌드 후 배포 (npm/SFTP)
pnpm pub --no-build                      # 빌드 없이 배포만
pnpm pub --dry-run                       # 실제 배포 없이 시뮬레이션
```

### 코드 품질 검사

```bash
pnpm typecheck                           # TypeScript 타입 검사
pnpm lint                                # ESLint + Stylelint
pnpm lint:fix                            # 린트 이슈 자동 수정
pnpm check                               # 전체 검사 (타입 + 린트 + 테스트 병렬)
```

### 테스트

```bash
pnpm vitest                              # vitest watch 모드
pnpm vitest tests/orm                    # ORM 통합 테스트 (Docker 필요)
pnpm vitest tests/service                # 서비스 통합 테스트
```

## 아키텍처

의존 방향: 위에서 아래로. `core-common`은 내부 의존성이 없는 리프 패키지이다.

```
앱:       solid-demo (client) ─── solid-demo-server (server)
            │                        │
UI:       solid (browser)          service-server (node)
            │                        │
서비스:   service-client (common)  service-common (common)
            │                        │
ORM:      orm-common (common) ─── orm-node (node)
            │
코어:     core-common (common) ─── core-browser (browser) / core-node (node)
```

### 빌드 타겟

| 타겟 | 설명 | 빌더 |
|------|------|------|
| `common` | Node.js + 브라우저 공용 라이브러리 | esbuild |
| `browser` | 브라우저 전용 라이브러리 | esbuild |
| `node` | Node.js 전용 라이브러리 | esbuild |
| `client` | SPA 클라이언트 앱 | Vite |
| `server` | 서버 앱 (PM2/Volta) | esbuild |
| `android` | Capacitor 모바일 플러그인 | esbuild |

## 사용 예제

### ORM 쿼리

```typescript
import { defineDbContext, Table, expr } from "@simplysm/orm-common";
import { createOrm } from "@simplysm/orm-node";

// 테이블 정의
const User = Table("user")
  .columns((c) => ({
    id: c.int().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()]);

const Order = Table("order")
  .columns((c) => ({
    id: c.int().autoIncrement(),
    userId: c.int(),
    amount: c.decimal(10, 2),
  }))
  .primaryKey("id")
  .relations((r) => ({
    user: r.foreignKey(["userId"], () => User),
  }));

// DbContext 정의
const MyDb = defineDbContext({
  tables: { user: User, order: Order },
});

// ORM 인스턴스 생성 및 쿼리
const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  username: "root",
  password: "password",
  database: "mydb",
});

await orm.connect(async (db) => {
  await db.user().insert([{ name: "Alice", email: "alice@example.com" }]);

  const users = await db.user()
    .where((c) => [expr.like(c.name, "A%")])
    .orderBy((c) => c.name, "ASC")
    .execute();
});
```

### RPC 서비스

```typescript
// -- 서버 --
import { createServiceServer, defineService, auth } from "@simplysm/service-server";
import type { ServiceMethods } from "@simplysm/service-server";

const UserService = defineService("User", (ctx) => ({
  async findAll() {
    return [{ id: 1, name: "Alice" }];
  },
  async findById(id: number) {
    return { id, name: "Alice" };
  },
}));

export type UserServiceType = ServiceMethods<typeof UserService>;

const server = createServiceServer({
  rootPath: "/app",
  port: 3000,
  services: [UserService],
});

await server.listen();

// -- 클라이언트 --
import { createServiceClient } from "@simplysm/service-client";

const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});

await client.connect();
const users = await client.getService<UserServiceType>("User").findAll();
```

## 라이선스

[Apache-2.0](LICENSE)
