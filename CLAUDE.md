# CLAUDE.md

Claude Code가 SIMPLYSM 저장소에서 작업할 때 참고하는 가이드입니다.

---

## 필수 규칙 (CRITICAL)

- **언어**: 모든 응답은 한국어로 작성
- **파일 경로**: Windows Edit 툴 사용 시 백슬래시(`\`) 사용 (bash는 슬래시 가능)
- **Windows bash**: `2>nul` 사용 금지 (nul 파일 생성됨)
- **PLAN 작업**: Phase 하나씩 수행 후 파일 업데이트 및 사용자 확인 필수 (자동 진행 금지)
- **PLAN 작업**: 작업중인 PLAN/TASK/TODO등의 워크플로우 파일은 지속적으로 업데이트 되어야함.

---

## 프로젝트 개요

SIMPLYSM은 Angular 풀스택 애플리케이션을 위한 TypeScript 모노레포입니다.

### 기술 스택

| 기술 | 버전 | 비고 |
|------|------|------|
| Node.js | 20.x | LTS |
| Yarn | 4.x | Berry |
| TypeScript | 5.8.x | strict 모드 |
| Angular | 20.x | 시그널 기반 |
| Vitest | 4.x | 테스트 프레임워크 |
| MySQL | 8.0.14+ | |
| MSSQL | 2012+ | |
| PostgreSQL | 9.0+ | |

### 브라우저 환경

- **타겟**: Chrome 79+
- **컴파일**: TypeScript ES2022 → esbuild (browserslist)
- **폴리필**: `esbuild-plugins-node-modules-polyfill`로 Node.js 내장 모듈 사용 가능

```typescript
import path from "path";  // Node.js 내장 모듈 import
Buffer.from("hello");     // global로 사용
```

---

## 현재 마이그레이션 상태

> **13.x 브랜치**: `.legacy-packages` → `packages`로 재구축 진행 중
>
> 상세 계획은 [MIGRATION.PLAN.md](MIGRATION_PLAN.md) 참고

### 활성 패키지 (`packages/`)

| 패키지 | 설명 | 상태 |
|--------|------|------|
| `core-common` | 공통 유틸리티 (Date, Array, Object 등) | 완료 |
| `orm-common` | ORM 쿼리 빌더, DB 추상화 | 완료 |
| `eslint-plugin` | 커스텀 ESLint 규칙 | 신규 |

### 레거시 패키지 (`.legacy-packages/`)

마이그레이션 대기 중인 패키지들. 직접 수정하지 말 것.

---

## 아키텍처 (목표)

```
Application (사용자 프로젝트)
    ↓
Frontend: angular
    ↓
Service: service-server ←→ service-client
    ↓               ↓
      service-common
    ↓
ORM: orm-common
    ↓
    orm-node
    ↓
Core: core-browser, core-node
    ↓
    core-common
```

**원칙**: 단방향 의존 / 레이어 건너뛰기 금지 / 순환 참조 금지

---

## 검증 방법

프로젝트 루트에서 실행:

```bash
# 1. 타입체크
npx tsc --noEmit -p packages/{package}/tsconfig.json 2>&1 | grep "^packages/{package}/"

# 2. ESLint
npx eslint "packages/{package}/**/*.{ts,js,html}"

# 3. 테스트 (tests 폴더 존재 시에만)
npx vitest run packages/{package}
```

---

## 코드 스타일

상세 규칙: `packages/eslint-plugin/src/configs/root.js`

### TypeScript 핵심 규칙

| 규칙 | 설명 |
|------|------|
| `private` 키워드 | ECMAScript `#` 금지 |
| `null` 대신 `undefined` | nullable 타입: `T \| undefined` |
| `===` 사용 | 단, null 체크는 `== null` 허용 |
| `_` 접두사 | 미사용 변수에 적용 |
| `any` 금지 | 구체적 타입으로 캐스팅 |
| async 함수 | 반드시 `await` 포함 |
| floating promise 금지 | 모든 Promise는 처리 필수 |
| `return await` 필수 | async 함수의 return문에 await 포함 |
| strict-boolean-expressions | string/number는 명시적 null 체크 필요 |

### Angular 규칙

- Angular 20+ 시그널 API 사용
- Standalone 컴포넌트 패턴
- 아이콘: `@ng-icons/tabler-icons`

### 코딩 컨벤션

- **일관성**: 사용법 예측 가능한 패턴 유지
- **섹션 구분**: `//#region` 사용 (IDE 폴딩)
- **재사용**: 공통 로직은 유틸 패키지 추가 검토

### 빌드 결과물 주의사항

프로덕션 빌드 시 mangle(변수/함수명 축소), tree-shaking 등이 적용됩니다. 다음 패턴은 빌드 후 오류를 유발할 수 있으니 주의:

| 위험 패턴 | 문제점 | 대안 |
|-----------|--------|------|
| `constructor.name` | mangle 시 클래스명 변경됨 | 명시적 문자열 또는 Symbol 사용 |
| `function.name` | mangle 시 함수명 변경됨 | 명시적 식별자 사용 |
| 문자열로 클래스/함수 참조 | 이름 불일치 발생 | 직접 참조 또는 레지스트리 패턴 |
| 동적 `import()` 경로 | tree-shaking 예측 불가 | 정적 경로 사용 |

---

## 모노레포 구조 규칙

### 파일 구조

**index.ts 규칙**
- `src/index.ts`만 존재
- 하위 디렉토리에 `index.ts` 생성 금지
- 모든 모듈을 `src/index.ts`에서 직접 export

```typescript
// src/index.ts (올바른 방식)
export * from "./extensions/element.ext";
export * from "./utils/dom-utils";
export * from "./types/dom-types";

// extensions/index.ts (생성 금지)
```

**vitest.config 규칙**
- 루트의 `vitest.config.ts`만 사용
- 패키지별 vitest.config 생성 금지

### Import 규칙

패키지 간 import는 `@simplysm/*` 별칭 사용:

```typescript
import { Something } from "@simplysm/core-common";
```

---

## 설정 파일

| 파일 | 용도 |
|------|------|
| `simplysm.js` | sd-cli 프로젝트 설정 |
| `tsconfig.base.json` | 공유 TypeScript 설정 (경로 별칭) |
| `eslint.config.js` | ESLint 설정 |
| `vitest.config.ts` | Vitest 설정 |

---

## 패키지별 상세 가이드

- [`core-common`](packages/core-common/CLAUDE.md) - 공통 유틸리티, 타입, 확장
- [`orm-common`](packages/orm-common/CLAUDE.md) - ORM 아키텍처, QueryBuilder, DBMS별 네이밍

---
