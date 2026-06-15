# @simplysm/lint — recommended

`@simplysm/lint/eslint-recommended` 의 default export 는 `tseslint.config(...)` 결과 = ESLint 9 flat config 객체 배열. 프로젝트 `eslint.config.ts` 에서 그대로 spread 하면 표준 lint 세트가 적용된다. 그 자체로 완성형 배열이라 추가 병합 없이 동작하며, 프로젝트별 규칙은 배열 뒤에 config 객체를 이어 붙인다.

```typescript
// eslint.config.ts
import recommended from "@simplysm/lint/eslint-recommended";
export default [...recommended];
```

## config 블록 (배열 순서대로)

각 블록은 `files` 패턴으로 적용 범위를 한정하고, 한 파일이 여러 블록에 걸리면 규칙이 병합된다.

### globalIgnores

순회 자체를 건너뛸 경로: `**/node_modules/**`, `**/dist/**`, `**/.*/**`(점으로 시작하는 디렉토리 전체).

### 공통 languageOptions

전 파일 공통: `ecmaVersion: "latest"`(최신 ECMAScript 구문 허용), `sourceType: "module"`(ESM 파싱).

### JS 블록 (`**/*.js`, `**/*.mjs`, `**/*.cjs`)

`globals: globals.node`(node 전역 인식), `import`/`@simplysm`/`unused-imports` 플러그인 등록. 활성 규칙:

- `require-await: error` — async 함수 안에 `await` 없으면 위반.
- `no-shadow: error` — 바깥 스코프 변수명을 안쪽에서 가림 금지.
- `no-duplicate-imports: error` — 같은 모듈을 여러 import 문으로 중복 import 금지.
- `no-unused-expressions: error` — 값을 쓰지 않는 식문 금지.
- `no-undef: error` — 미선언 식별자 참조 금지.
- `unused-imports/no-unused-imports: error` — 미사용 import 제거(autofix).
- `unused-imports/no-unused-vars: error` — 미사용 변수/인자 금지. `varsIgnorePattern`·`argsIgnorePattern` = `^_`(언더스코어 접두는 의도적 미사용으로 허용), `args: "after-used"`(마지막 사용 인자 뒤만 검사).
- `import/no-extraneous-dependencies: error` — `package.json` 의존성에 없는 패키지 import 금지. `devDependencies` 허용 경로: `**/lib/**`, `**/eslint.config.{js,cjs,mjs}`, `**/simplysm.{js,cjs,mjs}`, `**/vitest.config.{js,cjs,mjs}`.
- 커스텀: `@simplysm/no-subpath-imports-from-simplysm: error`, `@simplysm/no-hard-private: error`([rules.md](./rules.md)).
- 공유 묶음: node 빌트인 차단 + env 직접접근 차단(아래 "공유 규칙 묶음").

### angular tsRecommended

`angular.configs.tsRecommended` spread — angular-eslint TS 권장 세트.

### TS 블록 (`**/*.ts`)

`processor: angular.processInlineTemplates`(컴포넌트 인라인 템플릿 추출해 별도 lint), `parser: tseslint.parser` + `parserOptions.project: true`(타입 정보 기반 규칙 활성화), `settings.import/resolver` = typescript resolver(`alwaysTryTypes: true`). 활성 규칙:

- 타입체크 규칙군(모두 `error`): `@typescript-eslint/require-await`, `await-thenable`, `return-await`(`["error","in-try-catch"]`), `no-floating-promises`, `no-shadow`, `no-unnecessary-condition`(`{allowConstantLoopConditions:true}`), `no-unnecessary-type-assertion`, `prefer-reduce-type-parameter`, `prefer-return-this-type`, `no-unused-expressions`, `strict-boolean-expressions`(`{allowNullableBoolean:true, allowNullableObject:true}`), `ban-ts-comment`(`{"ts-expect-error":"allow-with-description", minimumDescriptionLength:3}`), `prefer-readonly`, `naming-convention`(private memberLike 는 `_` 접두 강제), `no-misused-promises`(`{checksVoidReturn:{arguments:false, inheritedMethods:false}}`), `only-throw-error`, `no-array-delete`.
- `no-console: error` — TS 블록 한정 콘솔 출력 금지.
- `@simplysm` 커스텀 6종 심각도: `ng-no-async-effect`/`no-hard-private`/`no-subpath-imports-from-simplysm`/`ts-no-unused-injects`/`ts-no-unused-protected-readonly` = `error`, `ts-no-throw-not-implemented-error` = `warn`.
- `@angular-eslint/no-output-native: off` — output 명이 네이티브 DOM 이벤트와 겹쳐도 허용.
- 공유 묶음(unused-imports 2종·node 빌트인 차단·env 직접접근 차단) + `import/no-extraneous-dependencies: error`(TS 는 예외 경로 없이 전면 적용).

### HTML 블록 (`**/*.html`)

`extends: angular.configs.templateRecommended + templateAccessibility`. 활성 규칙:

- 커스텀: `@simplysm/ng-template-no-strict-null-check: error`, `ng-template-no-todo-comments: warn`, `ng-template-sd-require-binding-attrs: error`([rules.md](./rules.md)).
- `@angular-eslint/template/eqeqeq: ["error",{allowNullOrUndefined:true}]` — 템플릿 엄격 비교 강제하되 null/undefined 비교는 예외.
- `@angular-eslint/template/label-has-associated-control: off` — label-control 연결 검사 비활성.
- `@angular-eslint/template/no-any: error` — 템플릿에서 `$any` 사용 금지.

### 테스트 오버라이드 (`**/tests/**/*.ts`)

테스트 완화: `no-console: off`, `import/no-extraneous-dependencies: off`, `@simplysm/ts-no-throw-not-implemented-error: off`.

### vitest.config 오버라이드 (`**/vitest.config.ts`)

`no-restricted-properties: off` — 설정 파일에서 `process.env` 접근 허용.

## 공유 규칙 묶음

JS·TS 블록에 함께 적용되는 내부 상수 묶음(export 되진 않으나 동작 이해용):

- **noNodeBuiltinsRules** — node 빌트인 차단.
  - `no-restricted-globals` 로 `Buffer` 전역 금지 → `Uint8Array` / `@simplysm/core-common` 의 `BytesUtils` 유도.
  - `no-restricted-imports` 로 `buffer`(→ `Uint8Array`/`BytesUtils`), `events`·`eventemitter3`(→ `@simplysm/core-common` 의 `EventEmitter`) import 금지.
- **noDirectEnvAccessRules** — 환경변수 직접접근·엄격 비교 차단.
  - `no-restricted-properties` 로 `process.env` 직접 접근 금지 → `env("...")` 유도.
  - `no-restricted-syntax` 로: `import.meta.env` 직접 접근 금지(→ `env("...")`), `env("NODE_ENV")` 호출 금지, `=== undefined` / `!== undefined`(좌·우변 양방향) 금지 → `== null` / `!= null` 유도.

## 주의

- TS 블록은 타입 정보(`parserOptions.project: true`)를 요구하므로 대상 프로젝트에 유효한 `tsconfig` 가 있어야 함.
