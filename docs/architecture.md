# 아키텍처 문서

> 생성일: 2026-02-01
> 버전: 13.0.0-beta.0

## 개요

Simplysm은 TypeScript 기반의 풀스택 프레임워크 모노레포입니다. pnpm 워크스페이스로 관리되며, 14개의 독립적인 패키지로 구성됩니다.

## 설계 철학

1. **표준 패턴 우선**: TypeScript/JavaScript/SolidJS의 표준 패턴 활용
2. **명시적이고 예측 가능한 코드**: 암묵적인 동작보다 명시적인 코드 선호
3. **점진적 학습**: 각 패키지가 독립적으로 사용 가능

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         Applications                             │
│  ┌─────────────┐                                                │
│  │ solid-demo  │  SolidJS 데모 앱 (Vite dev server)             │
│  └──────┬──────┘                                                │
└─────────┼───────────────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────────────┐
│         ▼           UI Layer                                     │
│  ┌─────────────┐                                                │
│  │    solid    │  SolidJS UI 컴포넌트 + Tailwind CSS            │
│  │             │  ⚠️ 마이그레이션 중 (현재: Button만 활성)        │
│  └──────┬──────┘                                                │
└─────────┼───────────────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────────────┐
│         ▼           Service Layer                                │
│  ┌──────────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │  service-server  │  │ service-client │  │ service-common  │  │
│  │  (Fastify 서버)  │  │  (WS 클라이언트) │  │  (프로토콜 타입) │  │
│  └────────┬─────────┘  └───────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
┌───────────┼────────────────────┼────────────────────┼───────────┐
│           ▼                    ▼                    ▼            │
│                         ORM Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │    orm-node     │  │   orm-common    │                       │
│  │  (DB 커넥션)    │  │  (쿼리 빌더)    │                       │
│  └────────┬────────┘  └────────┬────────┘                       │
└───────────┼────────────────────┼────────────────────────────────┘
            │                    │
┌───────────┼────────────────────┼────────────────────────────────┐
│           ▼                    ▼                                 │
│                         Core Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   core-node     │  │  core-browser   │  │   core-common   │  │
│  │  (Node.js 유틸) │  │  (브라우저 유틸) │  │  (공통 유틸)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────────┐
│           ▼           Utility Packages                           │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐        │
│  │    excel    │  │   storage   │  │   eslint-plugin   │        │
│  │  (xlsx 처리) │  │ (FTP/SFTP) │  │  (ESLint 규칙)    │        │
│  └─────────────┘  └─────────────┘  └───────────────────┘        │
│                                                                  │
│  ┌─────────────┐                                                │
│  │     cli     │  빌드/린트/타입체크/publish/device CLI          │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

## 패키지 분류

### 빌드 타겟별

| 타겟 | 환경 | 패키지 |
|------|------|--------|
| neutral | Node/브라우저 공용 | core-common, orm-common, service-common, service-client, excel |
| node | Node.js 전용 | cli, core-node, eslint-plugin, orm-node, service-server, storage |
| browser | 브라우저 전용 | core-browser, solid |
| client | Vite dev server | solid-demo |

### 기능별

| 카테고리 | 패키지 | 설명 |
|----------|--------|------|
| Core | core-common, core-browser, core-node | 기본 유틸리티 |
| ORM | orm-common, orm-node | 데이터베이스 ORM |
| Service | service-common, service-client, service-server | 서비스 통신 |
| UI | solid, solid-demo | UI 컴포넌트 |
| Tools | cli, eslint-plugin | 개발 도구 |
| Utility | excel, storage | 유틸리티 |

## 주요 아키텍처 패턴

### 1. Fluent Builder Pattern (ORM)

```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id");
```

### 2. RPC-style Service Pattern

```typescript
// 서버: 서비스 정의
@Service()
class UserService extends ServiceBase {
  async getUser(id: number) { ... }
}

// 클라이언트: RPC 호출
await client.sendAsync(UserService, "getUser", 123);
```

### 3. Context Provider Pattern (SolidJS)

```tsx
<ConfigProvider>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</ConfigProvider>
```

### 4. Prototype Extension Pattern

```typescript
import "@simplysm/core-common"; // 확장 활성화

const result = array.single(); // Array 확장
const value = map.getOrCreate(key, () => defaultValue); // Map 확장
```

### 5. Tailwind CSS Preset (solid 패키지)

```typescript
// tailwind.config.ts
import { tailwindPreset } from "@simplysm/solid";

export default {
  presets: [tailwindPreset],
  content: ["./src/**/*.{ts,tsx}"],
} satisfies Config;
```

## 데이터 흐름

### 클라이언트-서버 통신

```
┌──────────────┐     WebSocket      ┌──────────────────┐
│   Browser    │ ◄──────────────────►│  ServiceServer   │
│              │    JSON Protocol    │                  │
│ ServiceClient│                     │   ServiceExecutor│
│              │                     │        │         │
│              │                     │        ▼         │
│              │                     │   ORM Service    │
│              │                     │        │         │
│              │                     │        ▼         │
│              │                     │   Database       │
└──────────────┘                     └──────────────────┘
```

### 프로토콜 특성

- **메시지 분할**: 3MB 초과 시 300KB 청크로 분할
- **직렬화**: JSON (DateTime, Uuid 등 커스텀 타입 지원)
- **인증**: JWT 기반 (jose 라이브러리)

## 보안 아키텍처

### 서버 보안

- Fastify Helmet 플러그인 (보안 헤더)
- CORS 설정
- CSP (Content Security Policy)
- JWT 토큰 인증

### 클라이언트 보안

- 토큰 기반 인증
- HTTPS 강제 (production)

## 확장 포인트

### 새 DB 지원 추가

1. `orm-node/src/connections/`에 새 커넥션 클래스 구현
2. `DbConn` 인터페이스 구현
3. `DbConnFactory`에 등록

### 새 UI 컴포넌트 추가

1. `solid/src/components/`에 카테고리 폴더 생성
2. 컴포넌트 `.tsx` 파일 작성 (Tailwind CSS 사용)
3. `index.ts`에 export 추가

### 새 서비스 추가

1. `ServiceBase` 상속
2. `@Service()` 데코레이터 적용
3. `service-server/index.ts`에 export

### 새 CLI 명령어 추가

1. `cli/src/commands/`에 명령어 파일 생성
2. `sd-cli.ts`에 명령어 등록

---

*이 문서는 document-project 워크플로우에 의해 자동 생성되었습니다.*
