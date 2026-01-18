# CLAUDE.md

Claude Code가 SIMPLYSM 저장소에서 작업할 때 참고하는 가이드입니다.

---

## 필수 규칙 (CRITICAL)

| 규칙               | 설명                                                     |
|------------------|--------------------------------------------------------|
| **언어**           | 모든 응답은 한국어로 작성                                         |
| **구현 시작 전 확인**   | 계획 완료 후에도 구현 시작 전 반드시 사용자 확인 필요                         |
| **bash명령**       | 윈도우의 git bash 환경임                                      |
| **파일 경로**        | Windows Edit 툴: 백슬래시(`\`), bash: 슬래시 가능                |
| **Windows bash** | `2>nul` 사용 금지 (nul 파일 생성됨) - 실수로 생성했다면 반드시 지울것(rm NUL) |

---

## 프로젝트 개요

SIMPLYSM은 Angular 풀스택 애플리케이션을 위한 TypeScript 모노레포입니다.

### 기술 스택

| 분류          | 기술                         | 버전                     |
|-------------|----------------------------|------------------------|
| **런타임**     | Node.js                    | 20.x (LTS)             |
| **패키지 매니저** | Yarn                       | 4.x (Berry)            |
| **언어**      | TypeScript                 | 5.8.x (strict)         |
| **프레임워크**   | Angular                    | 20.x (시그널 기반)          |
| **테스트**     | Vitest                     | 4.x                    |
| **DB**      | MySQL / MSSQL / PostgreSQL | 8.0.14+ / 2012+ / 9.0+ |

### 브라우저 환경

- **타겟**: Chrome 79+
- **빌드**: TypeScript ES2022 → esbuild (browserslist)
- **폴리필**: Node.js 내장 모듈 사용 가능 (`esbuild-plugins-node-modules-polyfill`)

```typescript
import path from "path";  // Node.js 내장 모듈
Buffer.from("hello");     // global 사용
```

---

## 아키텍처

```
Application (사용자 프로젝트)
    ↓
angular
    ↓
service-server ←→ service-client
    ↓               ↓
      service-common
    ↓
orm-common → orm-node
    ↓
core-browser / core-node
    ↓
core-common
```

**원칙**: 단방향 의존 / 레이어 건너뛰기 금지 / 순환 참조 금지

---

## 코드 스타일

> eslint 상세 규칙: `packages/eslint-plugin/src/configs/recommended.ts`

### 네이밍

| 대상             | 규칙 | 예시                                                                     |
|----------------|------|------------------------------------------------------------------------|
| 파일명            | kebab-case | `user.service.ts`, `user.model.ts`, `user-permission.model.ts`, `fs.ts` |
| interface/type | 접두사(`I`, `T`) 금지 | `User`, `UserRole`                                                     |
| 미사용 변수         | `_` 접두사 | `_unused`                                                              |
| async 함수*      | async함수도 뒤에 Async안붙이기 | readFile()                                                             |

- *async 함수 예외*: sync와 async함수 두가지가 공존하는 경우에만, sync함수에 Sync붙이기 (Async가 붙을일은 없음) (`readFileSync() //동기`, `readFile() //비동기`)

```typescript
// ✅ 권장
interface User { ... }
type UserRole = "admin" | "user";

// ❌ 금지
interface IUser { ... }
type TUserRole = "admin" | "user";
```

### TypeScript 규칙

| 규칙                         | 설명                                       |
|----------------------------|------------------------------------------|
| `Buffer` 권장                | `Uint8Array`보다 `Buffer` 선호 (폴리필 제공)      |
| `private` 키워드              | ECMAScript `#` 금지                        |
| `null` 대신 `undefined`      | nullable: `T \| undefined`               |
| `===` 사용                   | null 체크만 `== null` 허용                    |
| `any` 지양                   | 구체적 타입으로 캐스팅 (어차피 unknown을 쓸거라면 any도 가능) |
| async 함수                   | 반드시 `await` 포함                           |
| floating promise 금지        | 모든 Promise는 처리 필수                        |
| `return await` 필수          | async 함수 return문에 await                  |
| strict-boolean-expressions | 명시적 null 체크 필요                           |
| **런타임 검증**                 | Zod 사용                                   |
| **로깅**                     | `console.*` 금지, `pino` 사용                |

### Angular 규칙

- Angular 20+ 시그널 API
- Standalone 컴포넌트 패턴
- 아이콘: `@ng-icons/tabler-icons`
- `inject()` 필드는 `private` 사용 (템플릿 접근 불필요)

### 코딩 컨벤션

| 원칙 | 설명 |
|------|------|
| 일관성 | 예측 가능한 패턴 유지 |
| 섹션 구분 | `//#region` 사용 (IDE 폴딩) |
| 재사용 | 공통 로직은 유틸 패키지 검토 |

### 빌드 주의사항

프로덕션 빌드 시 mangle, tree-shaking이 적용됩니다:

| 위험 패턴 | 대안 |
|-----------|------|
| `constructor.name` / `function.name` | 명시적 문자열 또는 Symbol |
| 문자열로 클래스/함수 참조 | 직접 참조 또는 레지스트리 패턴 |

---

## 모노레포 규칙

### 파일 구조

| 규칙 | 설명 |
|------|------|
| index.ts | `src/index.ts`만 존재, 하위 디렉토리에 생성 금지 |
| vitest.config | 루트 설정만 사용, 패키지별 생성 금지 |

```typescript
// src/index.ts - 모든 모듈 직접 export
export * from "./extensions/element.ext";
export * from "./utils/dom-utils";
export * from "./types/dom-types";
```

### Import 규칙

| 규칙 | 설명 |
|------|------|
| 패키지 별칭 | `@simplysm/*` 사용 |
| 확장자 생략 | `.ts`, `.js` 확장자 붙이지 않음 |

```typescript
// ✅ 권장
import { Something } from "@simplysm/core-common";
import { Utils } from "./utils/string";

// ❌ 금지
import { Utils } from "./utils/string.ts";
```

---

## Commands

작업 수행 시 해당 command 파일의 절차와 규칙을 참고합니다.

| 명령어 | 설명 |
|--------|------|
| [`/sd:help`](.claude/commands/sd/help.md) | 커맨드 목록 및 사용법 안내 |
| [`/sd:check`](.claude/commands/sd/check.md) | 품질 검증 (타입체크 → ESLint → 테스트) |
| [`/sd:commit`](.claude/commands/sd/commit.md) | Git 커밋 메시지 자동 생성 |
| [`/sd:plan`](.claude/commands/sd/plan.md) | 구현 계획서 작성 |
| [`/sd:task`](.claude/commands/sd/task.md) | Plan 파일의 Phase 순차 실행 |
| [`/sd:review`](.claude/commands/sd/review.md) | 코드 심층 리뷰 |
| [`/sd:improve`](.claude/commands/sd/improve.md) | 자동 개선 사이클 (Review → Plan → Task) |
| [`/sd:docs`](.claude/commands/sd/docs.md) | CLAUDE.md / README.md 작성 (루트 및 패키지) |
| [`/sd:tsdoc`](.claude/commands/sd/tsdoc.md) | TSDoc 주석 작성 |
| [`/sd:command`](.claude/commands/sd/command.md) | 커맨드 생성/개선 |
| [`/sd:status`](.claude/commands/sd/status.md) | 현재 세션 작업 상태 확인 |

---

## 설정 파일

| 파일                   | 용도 |
|----------------------|------|
| `simplysm.ts`        | sd-cli 프로젝트 설정 |
| `tsconfig.json`      | IDE용 TypeScript 설정 (전체 패키지 포함) |
| `packages/*/tsconfig.build.json` | 빌드용 TypeScript 설정 (개별 패키지) |
| `eslint.config.ts`   | ESLint 설정 |
| `vitest.config.ts`   | Vitest 설정 |

### TypeScript 설정 구조

```
tsconfig.json                    ← IDE (WebStorm) 전용
  └─ 전체 패키지 include
  └─ paths: @simplysm/* → packages/*/src/index.ts

packages/*/tsconfig.build.json   ← 빌드용 (tsc)
  └─ extends: ../../tsconfig.json
  └─ include: src/**/*.ts만
  └─ rootDir: ./src, outDir: ./dist
```

**분리 이유**: WebStorm이 `tsconfig.json`만 인식하도록 하여 IDE 타입 체크와 빌드 설정 충돌 방지

---

## 기타

- 필요시 node_modules의 타 패키지 참조 가능

---

## 토론 제외 항목

> 코드 리뷰/계획 토론에서 의도적으로 제외하기로 합의된 항목입니다.
> 다음 리뷰 시 동일 항목에 대한 반복 토론을 피합니다.

| 항목 | 관점 | 제외 사유 | 결정일 |
|------|------|----------|--------|
| (아직 없음) | - | - | - |

---

## 패키지별 가이드

| 패키지 | 설명 |
|--------|------|
| [`core-common`](../../packages/core-common/CLAUDE.md) | 공통 유틸리티, 타입, 확장 |
| [`core-browser`](../../packages/core-browser/CLAUDE.md) | 브라우저 DOM, Blob 유틸리티 |
| [`core-node`](../../packages/core-node/CLAUDE.md) | Node.js 파일시스템, Worker 유틸리티 |
| [`orm-common`](../../packages/orm-common/CLAUDE.md) | ORM 아키텍처, QueryBuilder |
| [`orm-node`](../../packages/orm-node/CLAUDE.md) | Node.js DB 연결, 커넥션 풀링 |
| [`service-common`](../../packages/service-common/CLAUDE.md) | 서비스 프로토콜, 타입 정의 |
| [`service-client`](../../packages/service-client/CLAUDE.md) | 클라이언트 서비스 통신 |
| [`service-server`](../../packages/service-server/CLAUDE.md) | 서버 서비스 처리 |
| [`eslint-plugin`](../../packages/eslint-plugin/CLAUDE.md) | ESLint 규칙/설정 |
| [`excel`](../../packages/excel/CLAUDE.md) | Excel 파일 처리 |
| [`storage`](../../packages/storage/CLAUDE.md) | FTP/SFTP 스토리지 |
| [`cli`](../../packages/cli/CLAUDE.md) | CLI 도구 (ESLint 래퍼) |
| [`claude`](../../packages/claude/CLAUDE.md) | Claude Code 확장 배포 |

---

## 마이그레이션

### 활성 패키지 (`packages/`)

| 패키지 | 설명 | 상태 |
|--------|------|------|
| `core-common` | 공통 유틸리티, 타입, 확장 | ✅ 완료 |
| `core-browser` | 브라우저 DOM, Blob 유틸리티 | ✅ 완료 |
| `core-node` | Node.js 파일시스템, Worker 유틸리티 | ✅ 완료 |
| `orm-common` | ORM 쿼리 빌더, 메타데이터 | ✅ 완료 |
| `orm-node` | Node.js DB 연결 (MySQL/MSSQL/PostgreSQL) | ✅ 완료 |
| `service-common` | 서비스 프로토콜, 타입 정의 | ✅ 완료 |
| `service-client` | 클라이언트 서비스 통신 | ✅ 완료 |
| `service-server` | 서버 서비스 처리 | ✅ 완료 |
| `eslint-plugin` | ESLint 규칙 | ✅ 완료 |
| `excel` | Excel 파일 처리 | ✅ 완료 |
| `storage` | FTP/SFTP 스토리지 | ✅ 완료 |
| `cli` | CLI 도구 (ESLint 래퍼) | ✅ 완료 |
| `claude` | Claude Code 확장 배포 | ✅ 완료 |

### 레거시 패키지 (`.legacy-packages/`)

마이그레이션 대기 중. **직접 수정 금지**.

| 패키지 | 설명 |
|--------|------|
| `sd-angular` | Angular 컴포넌트/디렉티브 |
| `sd-cli` | CLI 빌드 도구 |
| `capacitor-plugin-*` | Capacitor 플러그인 (4개) |
| `cordova-plugin-*` | Cordova 플러그인 (3개) |

### 신규 마이그레이션 주의사항

- 이 문서내의 규칙 숙지
- 호환성 생각하지 말것. 신규 개발이라고 생각하면됨.
- 기존 직접구현 혹은 의존성보다 더 좋은 패키지가 있다면 제안 필요
- `CLAUDE.md`, `README.md` 작성
- 

---
