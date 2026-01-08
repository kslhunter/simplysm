---
description: SIMPLYSM 기반 프로젝트 초기화 (루트 CLAUDE.md 생성)
---

# SIMPLYSM 프로젝트 초기화

SIMPLYSM 프레임워크를 사용하는 프로젝트의 루트 CLAUDE.md를 생성합니다.

## 사용 방법

```bash
/sd-init
```

## CLAUDE.md 필수 섹션 템플릿

SIMPLYSM 기반 프로젝트의 최상위 CLAUDE.md 작성 시 **반드시 포함**해야 할 공통 규칙:

### 1. 필수 규칙

```markdown
## 필수 규칙 (CRITICAL)

| 규칙 | 설명 |
|------|------|
| **언어** | 모든 응답은 한국어로 작성 |
| **파일 경로** | Windows Edit 툴: 백슬래시(`\`), bash: 슬래시 가능 |
| **Windows bash** | `2>nul` 사용 금지 (nul 파일 생성됨) |
| **PLAN 작업** | Phase 단위 실행 후 사용자 확인 필수 (자동 진행 금지) |
| **워크플로우 파일** | PLAN/TASK/TODO 등은 지속적으로 업데이트 |
```

### 2. 기술 스택 (SIMPLYSM 호환)

```markdown
## 기술 스택

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
```

### 3. 코드 스타일

```markdown
## 코드 스타일

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | kebab-case | `user-service.ts` |
| interface/type | 접두사(`I`, `T`) 금지 | `User`, `UserRole` |
| 미사용 변수 | `_` 접두사 | `_unused` |

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

### 빌드 주의사항

프로덕션 빌드 시 mangle, tree-shaking이 적용됩니다:

| 위험 패턴 | 대안 |
|-----------|------|
| `constructor.name` / `function.name` | 명시적 문자열 또는 Symbol |
| 문자열로 클래스/함수 참조 | 직접 참조 또는 레지스트리 패턴 |
| 동적 `import()` 경로 | 정적 경로 사용 |
```

### 4. Import 규칙

````markdown
## Import 규칙

| 규칙 | 설명 |
|------|------|
| SIMPLYSM 패키지 | `@simplysm/*` 사용 (v13+) |
| 프로젝트 내부 패키지 | `@{프로젝트명}/*` 별칭 사용 |
| 확장자 생략 | `.ts`, `.js` 확장자 붙이지 않음 |

\```typescript
// ✅ 권장
import { DateTime } from "@simplysm/core-common";
import { MyService } from "@myproject/common";

// ❌ 금지 (v12 이하 구버전)
import { DateTime } from "@simplysm/sd-core-common";
\```
````

### 5. 설정 파일

```markdown
## 설정 파일

| 파일 | 용도 |
|------|------|
| `simplysm.js` | sd-cli 프로젝트 설정 |
| `tsconfig.base.json` | 공유 TypeScript 설정 (경로 별칭) |
| `eslint.config.js` | ESLint 설정 |
| `vitest.config.ts` | Vitest 설정 |
```

### 6. 검증 방법

```markdown
## 검증 방법

\```bash
# 타입체크
npx tsc --noEmit -p packages/{package}/tsconfig.json

# ESLint
npx eslint "packages/{package}/**/*.{ts,js,html}"

# 테스트 (tests 폴더 존재 시)
npx vitest run packages/{package}
\```
```

---

## 실행 절차

1. **프로젝트 분석**: 패키지 구조, 기술 스택, 설정 파일 파악
2. **필수 템플릿 적용**: 위의 필수 섹션 템플릿 포함
3. **맞춤 내용 생성**: 프로젝트별 개요, 아키텍처, 패키지 구조 작성
4. **CLAUDE.md 생성**: 루트 디렉토리에 파일 생성

## 주의사항

- 이미 CLAUDE.md가 존재하는 경우 덮어쓰기 여부를 확인합니다
- 루트 디렉토리에서 실행해야 합니다
- SIMPLYSM v13+에서는 패키지명에서 `sd-` 접두사가 제거되었습니다
  - `@simplysm/sd-core-common` → `@simplysm/core-common`
