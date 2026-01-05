# CLAUDE.md

이 파일은 Claude Code가 SIMPLYSM 저장소에서 작업할 때 참고하는 가이드입니다.

---

## ⚠️ 필수 규칙 (CRITICAL)

- 모든 응답은 한국어로 작성
- Edit 툴 사용 시 파일 경로에 백슬래시(`\`) 사용 (bash 명령은 슬래시 사용 가능)
- **PLAN 작업 시**: Phase 하나씩 수행 후 기록중이던 파일 업데이트할것  사용자 확인을 받을것, 자동으로 다음 Phase로 넘어가지 말것

---

## 신규 구현 혹은 리팩토링시 검토사항

- 재사용 가능 로직은 유틸 패키지에 추가하는것을 검토해 볼 것

## 검증 방법

프로젝트 루트 Path에서 아래 명령어 수행: 

1. **타입체크**: `npx tsc --noEmit -p packages/{package}/tsconfig.json 2>&1 | grep "^packages/{package}/"`
2. **ESLint**: `npx eslint "packages/{package}/**/*.{ts,js,html}"`
3. **테스트**: `npx vitest run packages/{package}`

`3. 테스트`는 패키지 루트에 `tests`폴더가 존재하는 경우에만 수행함

---

## 프로젝트 개요

SIMPLYSM은 Angular 풀스택 애플리케이션을 위한 TypeScript 모노레포입니다.

### 기술 스택

- Node 20.x, Yarn 4.x
- TypeScript 5.8.x, Angular 20.x (시그널)
- Vitest 4.x
- MySQL 8.0.14+, MSSQL 2012+, PostgreSQL 9.0+

### 브라우저 환경 Node.js 폴리필

`esbuild-plugins-node-modules-polyfill`을 사용하여 브라우저 환경에서도 Node.js 내장 모듈 사용 가능:

```typescript
import path from "path";  // Node.js 내장 모듈 import
Buffer.from("hello");     // global로 사용
```

---

## 아키텍처

### 레이어 구조 및 의존성 방향

```
Application (사용자 프로젝트)
    ↓
Frontend: sd-angular
    ↓
Service: sd-service-server ←→ sd-service-client
    ↓                ↓
sd-service-common
    ↓
ORM: orm-common / sd-orm-common
    ↓
sd-orm-node
    ↓
Core: sd-core-browser, sd-core-node
    ↓
sd-core-common
```

**원칙**: 단방향 의존, 레이어 건너뛰기 금지, 순환 참조 금지

### 주요 패키지

| 패키지 | 설명 |
|--------|------|
| `sd-core-common` | 공통 유틸리티 |
| `sd-core-browser` / `sd-core-node` | 환경별 유틸리티 |
| `orm-common` / `sd-orm-common` | ORM 쿼리 빌더 |
| `sd-orm-node` | DB 커넥터 (MySQL/MSSQL/PostgreSQL) |
| `sd-service-*` | HTTP/WebSocket 서비스 레이어 |
| `sd-angular` | Angular 컴포넌트 라이브러리 |
| `sd-cli` | 빌드/배포 CLI |
| `eslint-plugin` | ESLint 커스텀 규칙 |

---

## 코드 스타일

상세한 ESLint 규칙은 `packages/eslint-plugin/src/configs/root.js` 참고

### TypeScript 핵심 규칙 (자주 실수하는 것만)

- `private` 키워드 사용 (ECMAScript `#` 금지)
- async 함수는 반드시 `await` 포함 (`@typescript-eslint/require-await`)
- 동등 비교 `===` 사용 (null 체크는 `== null` 허용)
- **`null` 대신 `undefined` 사용** - 값이 없음을 나타낼 때는 `undefined` 사용 (nullable 타입: `T | undefined`)
- 사용하지 않는 변수는 `_` 접두사
- `any` 타입 금지 (구체적 타입으로 캐스팅)
- `@typescript-eslint/strict-boolean-expressions`: boolean/object 제외, string/number 등은 명시적 null 체크 필요
- floating promise 금지 (`@typescript-eslint/no-floating-promises`)
- `return await` 필수 (`@typescript-eslint/return-await`)

### Angular 규칙

- Angular 20+ 시그널 API 사용
- 아이콘: `@ng-icons/tabler-icons`

### 코딩 컨벤션

- **규칙성/통일성**: 사용법 예측 가능하게 일관된 패턴 유지
- **섹션 구분**: `//#region` 사용 (WebStorm 폴딩)

---

## 설정 파일

| 파일 | 용도 |
|------|------|
| `simplysm.js` | sd-cli 프로젝트 설정 |
| `tsconfig.base.json` | 공유 TypeScript 설정 (경로 별칭) |
| `eslint.config.js` | ESLint 설정 |
| `vitest.config.js` | Vitest 설정 |

### Import 규칙

패키지 간 import는 `@simplysm/*` 별칭 사용:

```typescript
import { Something } from "@simplysm/sd-core-common";
```

---

## 패키지별 상세 가이드

- [`orm-common`](packages/orm-common/CLAUDE.md) - ORM 아키텍처, QueryBuilder, DBMS별 네이밍, 테스트 가이드

---
