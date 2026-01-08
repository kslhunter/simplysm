# CLAUDE.md

Claude Code가 SIMPLYSM 저장소에서 작업할 때 참고하는 가이드입니다.

---

## 필수 규칙 (CRITICAL)

| 규칙 | 설명 |
|------|------|
| **언어** | 모든 응답은 한국어로 작성 |
| **파일 경로** | Windows Edit 툴: 백슬래시(`\`), bash: 슬래시 가능 |
| **Windows bash** | `2>nul` 사용 금지 (nul 파일 생성됨) |
| **PLAN 작업** | Phase 단위 실행 후 사용자 확인 필수 (자동 진행 금지) |
| **워크플로우 파일** | PLAN/TASK/TODO 등은 지속적으로 업데이트 |

---

## 프로젝트 개요

SIMPLYSM은 Angular 풀스택 애플리케이션을 위한 TypeScript 모노레포입니다.

### 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| **런타임** | Node.js | 20.x (LTS) |
| **패키지 매니저** | Yarn | 4.x (Berry) |
| **언어** | TypeScript | 5.8.x (strict) |
| **프레임워크** | Angular | 20.x (시그널 기반) |
| **테스트** | Vitest | 4.x |
| **DB** | MySQL / MSSQL / PostgreSQL | 8.0.14+ / 2012+ / 9.0+ |

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

## 마이그레이션 상태

> **13.x 브랜치**: `.legacy-packages` → `packages` 재구축 진행 중
>
> 상세: [MIGRATION_PLAN.md](MIGRATION_PLAN.md)

### 활성 패키지 (`packages/`)

| 패키지 | 설명 | 상태 |
|--------|------|------|
| `core-common` | 공통 유틸리티, 타입, 확장 | ✅ 완료 |
| `core-browser` | 브라우저 DOM, Blob 유틸리티 | ✅ 완료 |
| `core-node` | Node.js 파일시스템, Worker 유틸리티 | ✅ 완료 |
| `orm-common` | ORM 쿼리 빌더, 메타데이터 | ✅ 완료 |
| `orm-node` | Node.js DB 연결 (MySQL/MSSQL/PostgreSQL) | ✅ 완료 |
| `service-common` | 서비스 프로토콜, 타입 정의 | ✅ 완료 |
| `eslint-plugin` | ESLint 규칙 | ✅ 완료 |

### 레거시 패키지 (`.legacy-packages/`)

마이그레이션 대기 중. **직접 수정 금지**.

---

## 코드 스타일

> 상세 규칙: `packages/eslint-plugin/src/configs/root.js`

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | kebab-case | `user-service.ts` |
| interface/type | 접두사(`I`, `T`) 금지 | `User`, `UserRole` |
| 미사용 변수 | `_` 접두사 | `_unused` |

```typescript
// ✅ 권장
interface User { ... }
type UserRole = "admin" | "user";

// ❌ 금지
interface IUser { ... }
type TUserRole = "admin" | "user";
```

### TypeScript 규칙

| 규칙 | 설명 |
|------|------|
| `Buffer` 권장 | `Uint8Array`보다 `Buffer` 선호 (폴리필 제공) |
| `private` 키워드 | ECMAScript `#` 금지 |
| `null` 대신 `undefined` | nullable: `T \| undefined` |
| `===` 사용 | null 체크만 `== null` 허용 |
| `any` 금지 | 구체적 타입으로 캐스팅 |
| async 함수 | 반드시 `await` 포함 |
| floating promise 금지 | 모든 Promise는 처리 필수 |
| `return await` 필수 | async 함수 return문에 await |
| strict-boolean-expressions | 명시적 null 체크 필요 |

### Angular 규칙

- Angular 20+ 시그널 API
- Standalone 컴포넌트 패턴
- 아이콘: `@ng-icons/tabler-icons`

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
| 동적 `import()` 경로 | 정적 경로 사용 |

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

## 검증 방법

```bash
# 패키지별 타입체크
npx tsc --noEmit -p packages/{package}/tsconfig.json 2>&1 | grep "^packages/{package}/"

# 패키지별 ESLint
npx eslint "packages/{package}/**/*.{ts,js,html}"

# 패키지별 테스트 (packages/{package}/tests 폴더 존재 시)
npx vitest run packages/{package}

# 통합 테스트
npx vitest run tests/{name}
```

---

## 설정 파일

| 파일                   | 용도 |
|----------------------|------|
| `simplysm.ts`        | sd-cli 프로젝트 설정 |
| `tsconfig.base.json` | 공유 TypeScript 설정 (경로 별칭) |
| `eslint.config.ts`   | ESLint 설정 |
| `vitest.config.ts`   | Vitest 설정 |

---

## 기타

- 필요시 node_modules의 타 패키지 소스 참조 가능

---

## 패키지별 가이드

| 패키지 | 설명 |
|--------|------|
| [`core-common`](packages/core-common/CLAUDE.md) | 공통 유틸리티, 타입, 확장 |
| [`core-browser`](packages/core-browser/CLAUDE.md) | 브라우저 DOM, Blob 유틸리티 |
| [`core-node`](packages/core-node/CLAUDE.md) | Node.js 파일시스템, Worker 유틸리티 |
| [`orm-common`](packages/orm-common/CLAUDE.md) | ORM 아키텍처, QueryBuilder |
| [`orm-node`](packages/orm-node/CLAUDE.md) | Node.js DB 연결, 커넥션 풀링 |
| [`service-common`](packages/service-common/CLAUDE.md) | 서비스 프로토콜, 타입 정의 |
