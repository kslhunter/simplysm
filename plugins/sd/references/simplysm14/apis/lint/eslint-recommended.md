# eslint-recommended 설정 가이드

`@simplysm/lint/eslint-recommended`는 TypeScript/Angular 프로젝트를 위한 권장 ESLint flat config 배열.

## 기본 사용법

### 최소 설정

```typescript
// eslint.config.ts
import config from "@simplysm/lint/eslint-recommended";

export default config;
```

### 커스텀 규칙 추가

```typescript
import config from "@simplysm/lint/eslint-recommended";

export default [
  ...config,
  {
    files: ["**/my-special/**/*.ts"],
    rules: {
      "@simplysm/no-hard-private": "warn", // 엄격도 조정
    },
  },
];
```

## 설정 구조

`eslint-recommended`는 다음 섹션들로 구성됨:

### 1. Ignore 규칙 (모든 파일)

```
node_modules/**
dist/**
.*/**  (숨김 파일/폴더)
```

### 2. 기본 언어 설정 (모든 파일)

- `ecmaVersion: "latest"`
- `sourceType: "module"`

## 파일별 설정 섹션

### JS/MJS/CJS 파일 섹션

**대상 파일**: `**/*.js`, `**/*.mjs`, `**/*.cjs`

#### 포함 플러그인

- `import-x` — ES6 import 검사
- `@simplysm` — 커스텀 규칙
- `unused-imports` — 미사용 import/변수 감지

#### 공통 규칙

```
no-warning-comments: warn        // // TODO 등 경고성 주석
eqeqeq: error (허용: == null)   // === 강제 (null 비교는 == 허용)
no-self-compare: error            // 자기 자신과 비교 금지
array-callback-return: error      // Array 콜백에서 return 강제
```

#### Node.js 제한 규칙

**Buffer 금지**

```
no-restricted-globals: [error, Buffer]
message: Uint8Array를 사용하세요. 복잡한 연산에는 @simplysm/core-common의 BytesUtils를 사용하세요.
```

**Node 모듈 금지**

```
no-restricted-imports:
  - buffer: Uint8Array 사용 권유
  - events: @simplysm/core-common의 EventEmitter 사용 권유
  - eventemitter3: 동일
```

#### 직접 환경변수 접근 금지

```
no-restricted-properties:
  - process.env: env("...") 함수 사용 권유

no-restricted-syntax:
  - import.meta.env: env("...") 함수 사용 권유
  - NODE_ENV 환경변수: 사용 금지
  - === undefined: == null 사용 권유
```

#### 미사용 import/변수

```
unused-imports/no-unused-imports: error
unused-imports/no-unused-vars: [error, {
  vars: all,
  varsIgnorePattern: ^_,          // _로 시작하면 무시
  args: after-used,                // 마지막 사용 인자 이후만 체크
  argsIgnorePattern: ^_,
}]
```

#### @simplysm 커스텀 규칙 (JS)

```
@simplysm/no-subpath-imports-from-simplysm: error
@simplysm/no-hard-private: error
```

---

### TypeScript 파일 섹션

**대상 파일**: `**/*.ts`

#### 기본 설정

- Parser: `@typescript-eslint/parser`
- Project-aware typecheck 활성화: `parserOptions.project: true`
- Angular 인라인 템플릿 처리: `processor: angular.processInlineTemplates`

#### 포함 플러그인

- `@typescript-eslint` — TypeScript 규칙
- `@simplysm` — 커스텀 규칙
- `import-x` — import 규칙
- `unused-imports` — 미사용 감지

#### 엄격 규칙

**비동기 안전성**

```
@typescript-eslint/require-await: error      // async 함수에서 await 강제
@typescript-eslint/await-thenable: error     // 대기 가능 값에 await 강제
@typescript-eslint/return-await: [error, in-try-catch]  // try-catch에서만 return await 허용
@typescript-eslint/no-floating-promises: error  // 처리되지 않는 Promise 금지
```

**타입 안전성**

```
@typescript-eslint/no-misused-promises: [error, {
  checksVoidReturn: false  // 콜백 함수의 void return 관용 허용
}]
@typescript-eslint/only-throw-error: error
@typescript-eslint/no-array-delete: error
```

**코드 품질**

```
no-console: error                            // console 사용 금지
@typescript-eslint/no-shadow: error          // 변수 shadowing 금지
@typescript-eslint/no-unnecessary-condition: [error, {
  allowConstantLoopConditions: true  // 상수 루프 조건 허용
}]
@typescript-eslint/no-unnecessary-type-assertion: error
@typescript-eslint/prefer-readonly: error    // 수정하지 않는 필드는 readonly 강제
@typescript-eslint/prefer-return-this-type: error  // method chaining 반환 타입
@typescript-eslint/no-unused-expressions: error
```

**엄격한 null 체크**

```
@typescript-eslint/strict-boolean-expressions: [error, {
  allowNullableBoolean: true  // boolean | null/undefined 허용
  allowNullableObject: true    // object | null/undefined 허용
}]
```

**주석/Assertion**

```
@typescript-eslint/ban-ts-comment: [error, {
  "ts-expect-error": allow-with-description,
  minimumDescriptionLength: 3
}]
```

**네이밍 컨벤션**

```
@typescript-eslint/naming-convention: [error, {
  selector: memberLike,
  modifiers: [private],
  format: null,              // 자유로운 형식
  leadingUnderscore: require // _privateName 강제
}]
```

#### @simplysm 커스텀 규칙 (TS)

```
@simplysm/ng-no-async-effect: error
@simplysm/no-hard-private: error
@simplysm/no-subpath-imports-from-simplysm: error
@simplysm/ts-no-throw-not-implemented-error: warn  // 제안 수준
@simplysm/ts-no-unused-injects: error
@simplysm/ts-no-unused-protected-readonly: error
```

#### 의존성 검사

```
import-x/no-extraneous-dependencies: error
  devDependencies 예외:
    - **/lib/**
    - **/eslint.config.{js,cjs,mjs}
    - **/simplysm.{js,cjs,mjs}
    - **/vitest.config.{js,cjs,mjs}
```

#### 미사용 import/변수

JS와 동일한 규칙 적용.

---

### HTML 템플릿 파일 섹션

**대상 파일**: `**/*.html`

#### 기본 설정

- Angular 권장 규칙 포함: `angular.configs.templateRecommended`
- 접근성 규칙 포함: `angular.configs.templateAccessibility`

#### @simplysm 커스텀 규칙 (HTML)

```
@simplysm/ng-template-no-strict-null-check: error
@simplysm/ng-template-no-todo-comments: warn  // 제안 수준
@simplysm/ng-template-sd-require-binding-attrs: error
```

#### Angular 템플릿 규칙

```
@angular-eslint/template/eqeqeq: [error, {
  allowNullOrUndefined: true  // null/undefined 비교 허용
}]
@angular-eslint/template/label-has-associated-control: off
@angular-eslint/template/no-any: error  // any 타입 금지 ($any 금지)
```

---

### 테스트 파일 예외

**대상 파일**: `**/tests/**/*.ts`, `**/*.spec.ts`, `**/*.test.ts`

예외 규칙:

```
no-console: off                              // 테스트 로깅 허용
import-x/no-extraneous-dependencies: off    // devDependencies 검사 불필요
@simplysm/ts-no-throw-not-implemented-error: off  // NotImplementedError 허용
```

---

### 설정 파일 예외

**대상 파일**: `**/eslint.config.ts`, `**/vitest.config.ts` 등

eslint.config.ts 예외:

```
no-restricted-properties: off  // process.env 직접 사용 허용
```

---

## 규칙 심도 개요

### error (엄격)

- 빌드 실패 유발
- 타입 안전성, 성능, 버그 위험 관련

예: `no-hard-private`, `ts-no-unused-protected-readonly`

### warn (경고)

- 빌드는 성공하나 경고 표시
- 선택사항이거나 팀 컨벤션 미준수

예: `ts-no-throw-not-implemented-error`, `ng-template-no-todo-comments`

### off (비활성)

- 테스트, 설정파일 등 특수 컨텍스트

예: `no-console` (테스트 파일)

## 커스터마이징 예제

### 엄격도 조정

```typescript
import config from "@simplysm/lint/eslint-recommended";

export default [
  ...config,
  {
    files: ["**/tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
];
```

### 특정 디렉토리 제외

```typescript
import config from "@simplysm/lint/eslint-recommended";

export default [
  {
    ignores: ["**/generated/**", "**/dist/**"],
  },
  ...config,
];
```

### Angular strict 모드 미활성 프로젝트

strict 모드가 아닌 프로젝트에서는 template 관련 규칙 엄격도 조정:

```typescript
import config from "@simplysm/lint/eslint-recommended";

export default [
  ...config,
  {
    files: ["**/*.html"],
    rules: {
      "@angular-eslint/template/no-any": "warn", // warn으로 완화
    },
  },
];
```

## 문제 해결

### "Cannot find module '@simplysm/...' with conditions"

- parseOptions.project 설정에 의해 TypeScript 프로젝트 기반 해석이 활성됨.
- `tsconfig.json`에 올바른 paths 설정 필요.

### Node 프로젝트에서 buffer 관련 오류

- ESM import 기반 프로젝트.
- Node Buffer 대신 Uint8Array 사용 권유.
- 필요시 @simplysm/core-common의 BytesUtils 활용.

### 특정 파일에서만 규칙 비활성화

```typescript
// .eslintignore 대신 config에서 처리
export default [
  ...config,
  {
    files: ["**/legacy/**"],
    rules: {
      "@simplysm/no-hard-private": "off",
    },
  },
];
```

또는 파일 내 주석:

```typescript
/* eslint-disable @simplysm/no-hard-private */
class LegacyClass {
  #privateField = "...";
}
```
