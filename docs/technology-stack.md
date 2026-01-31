# 기술 스택

> 생성일: 2026-01-31

## 전체 프로젝트 개요

| 카테고리 | 기술 | 버전 | 용도 |
|----------|------|------|------|
| 언어 | TypeScript | 5.9.3 | 주 개발 언어 |
| 런타임 | Node.js | 20.x+ | 서버/CLI 실행 환경 |
| 패키지 매니저 | pnpm | 워크스페이스 | 모노레포 의존성 관리 |
| 빌드 도구 | Vite | 7.3.1 | 번들링/개발 서버 |
| 빌드 도구 | esbuild | 0.27.2 | 빠른 트랜스파일링 |
| 테스트 | Vitest | 4.0.18 | 단위/통합 테스트 |
| E2E 테스트 | Playwright | 1.58.0 | 브라우저 테스트 |
| 린팅 | ESLint | 9.39.2 | 코드 품질 검사 |
| 포매팅 | Prettier | 3.8.1 | 코드 포매팅 |
| UI 프레임워크 | SolidJS | 1.9.11 | 반응형 UI |
| 스타일링 | vanilla-extract | 1.18.0 | CSS-in-JS |

## 패키지별 기술 스택

### Core 패키지

#### @simplysm/core-common (neutral)
공통 유틸리티, 타입, 에러 클래스

| 의존성 | 버전 | 용도 |
|--------|------|------|
| @zip.js/zip.js | 2.8.15 | ZIP 파일 처리 |
| fast-xml-parser | 5.3.3 | XML 파싱 |
| yaml | 2.8.2 | YAML 파싱 |
| consola | 3.4.2 | 로깅 |

#### @simplysm/core-browser (browser)
브라우저 전용 유틸리티

| 의존성 | 버전 | 용도 |
|--------|------|------|
| tabbable | 6.4.0 | 포커스 관리 |

#### @simplysm/core-node (node)
Node.js 유틸리티

| 의존성 | 버전 | 용도 |
|--------|------|------|
| chokidar | 5.0.0 | 파일 시스템 감시 |
| glob | 13.0.0 | 파일 패턴 매칭 |
| tsx | 4.21.0 | TypeScript 실행 |

### CLI 도구

#### @simplysm/cli (node)
빌드/린트/타입체크 CLI 도구

| 의존성 | 버전 | 용도 |
|--------|------|------|
| yargs | 18.0.0 | CLI 인자 파싱 |
| listr2 | 10.0.0 | 태스크 진행 표시 |
| esbuild | 0.27.2 | 빠른 빌드 |
| vite | 7.3.1 | 개발 서버 |
| typescript | 5.8.3 | 타입 체크 |

### ESLint 플러그인

#### @simplysm/eslint-plugin (node)
커스텀 ESLint 규칙

| 의존성 | 버전 | 용도 |
|--------|------|------|
| typescript-eslint | 8.53.1 | TypeScript 린팅 |
| eslint-plugin-import | 2.32.0 | import 규칙 |
| eslint-plugin-solid | 0.14.5 | SolidJS 규칙 |
| eslint-plugin-unused-imports | 4.3.0 | 미사용 import 제거 |

### ORM 패키지

#### @simplysm/orm-common (neutral)
ORM 쿼리 빌더, 스키마 정의

| 의존성 | 버전 | 용도 |
|--------|------|------|
| @simplysm/core-common | workspace | 공통 유틸리티 |

#### @simplysm/orm-node (node)
DB 커넥션 구현체

| 의존성 | 버전 | 용도 |
|--------|------|------|
| mysql2 | 3.16.1 | MySQL 연결 (optional) |
| pg | 8.17.2 | PostgreSQL 연결 (optional) |
| tedious | 19.2.0 | MSSQL 연결 (optional) |
| generic-pool | 3.9.0 | 커넥션 풀링 |

### Service 패키지

#### @simplysm/service-common (neutral)
서비스 프로토콜, 타입 정의

| 의존성 | 버전 | 용도 |
|--------|------|------|
| @simplysm/core-common | workspace | 공통 유틸리티 |
| @simplysm/orm-common | workspace | ORM 타입 |

#### @simplysm/service-client (neutral)
WebSocket 클라이언트

| 의존성 | 버전 | 용도 |
|--------|------|------|
| ws | 8.19.0 | WebSocket (Node.js용, optional) |
| consola | 3.4.2 | 로깅 |

#### @simplysm/service-server (node)
Fastify 기반 HTTP/WebSocket 서버

| 의존성 | 버전 | 용도 |
|--------|------|------|
| fastify | 5.7.1 | HTTP 서버 |
| @fastify/cors | 11.2.0 | CORS 처리 |
| @fastify/helmet | 13.0.2 | 보안 헤더 |
| @fastify/websocket | 11.2.0 | WebSocket 지원 |
| @fastify/static | 9.0.0 | 정적 파일 제공 |
| @fastify/multipart | 9.4.0 | 파일 업로드 |
| ws | 8.19.0 | WebSocket |
| jose | 6.1.3 | JWT 처리 |
| nodemailer | 7.0.12 | 이메일 발송 |

### UI 패키지

#### @simplysm/solid (browser)
SolidJS UI 컴포넌트 라이브러리

| 의존성 | 버전 | 용도 |
|--------|------|------|
| solid-js | 1.9.11 | 반응형 UI |
| @solidjs/router | 0.15.0 | 라우팅 (optional) |
| @vanilla-extract/css | 1.18.0 | 스타일링 |
| @vanilla-extract/recipes | 0.5.7 | 스타일 변형 |
| @vanilla-extract/sprinkles | 1.6.5 | 유틸리티 스타일 |
| @tabler/icons-solidjs | 3.31.0 | 아이콘 |
| @solid-primitives/* | 다양 | SolidJS 유틸리티 |

#### @simplysm/solid-demo (client)
SolidJS 컴포넌트 데모 앱

| 의존성 | 버전 | 용도 |
|--------|------|------|
| solid-js | 1.9.11 | 반응형 UI |
| @solidjs/router | 0.15.4 | 라우팅 |

### 유틸리티 패키지

#### @simplysm/excel (neutral)
Excel(.xlsx) 읽기/쓰기

| 의존성 | 버전 | 용도 |
|--------|------|------|
| zod | 4.3.5 | 스키마 검증 |
| mime | 4.1.0 | MIME 타입 처리 |

#### @simplysm/storage (node)
FTP/SFTP 클라이언트

| 의존성 | 버전 | 용도 |
|--------|------|------|
| basic-ftp | 5.1.0 | FTP 연결 |
| ssh2-sftp-client | 12.0.1 | SFTP 연결 |

## 아키텍처 패턴

### 의존성 계층 구조
```
core-common (최하위, 공통 유틸리티)
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

| 타겟 | 환경 | DOM | @types/node | 패키지 예시 |
|------|------|-----|-------------|-------------|
| node | Node.js 전용 | ❌ | ✅ | cli, core-node, orm-node |
| browser | 브라우저 전용 | ✅ | ❌ | core-browser, solid |
| neutral | Node/브라우저 공용 | ❌ | ❌ | core-common, orm-common |
| client | Vite dev server | ✅ | ❌ | solid-demo |

## 테스트 환경

| 프로젝트 | 환경 | 대상 패턴 |
|---------|------|-----------|
| node | Node.js | packages/*/tests/**/*.spec.ts (node 패키지) |
| browser | Playwright | packages/*/tests/**/*.spec.ts (browser 패키지) |
| solid | Playwright + vite-plugin-solid | packages/solid/tests/**/*.spec.tsx |
| orm | Node.js + Docker | tests/orm/**/*.spec.ts |
| service | Playwright | tests/service/**/*.spec.ts |
