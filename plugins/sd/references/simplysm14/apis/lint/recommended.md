# @simplysm/lint — recommended

`@simplysm/lint/eslint-recommended` default export 가 만드는 ESLint flat config 배열. 프로젝트 lint 설정에 표준 JS·TS·Angular template 규칙 세트를 붙이거나, 어떤 규칙이 어떤 파일군에 어떤 옵션으로 켜지는지 확인할 때 읽는다. 커스텀 규칙(`@simplysm/*`)의 상세 동작은 [rules.md](./rules.md).

## default export

```ts
export default tseslint.config(...configs); // FlatConfig[]
```

- `tseslint.config(...)` — 아래 블록들을 순서대로 배열화한다. 뒤 블록이 같은 파일에 함께 매칭되면 flat config 병합 규칙으로 누적 적용된다.
- 사용법: [client-rules.md](../../manuals/client-rules.md), [logging.md](../../manuals/logging.md)

## 1. ignores

```ts
{ ignores: string[] }
```

- `"**/node_modules/**"` — dependency 설치물 순회를 건너뛴다.
- `"**/dist/**"` — 빌드 산출물 순회를 건너뛴다.
- `"**/.*/**"` — dot 디렉토리 아래 파일 순회를 건너뛴다.

## 2. 공통 languageOptions

```ts
{
  languageOptions: {
    ecmaVersion: "latest";
    sourceType: "module";
  }
}
```

- `ecmaVersion: "latest"` — 최신 ECMAScript 문법으로 파싱한다.
- `sourceType: "module"` — 파일을 ESM 모듈로 파싱한다.

## 3. JS 파일 블록

```ts
{
  files: ["**/*.js", "**/*.mjs", "**/*.cjs"];
  languageOptions: { globals: globals.node };
  plugins: { "import-x": importX; "@simplysm": plugin; "unused-imports": unusedImportsPlugin };
  rules: FlatConfig.Rules;
}
```

- `files` — `.js`/`.mjs`/`.cjs` 에만 이 블록을 적용한다.
- `globals: globals.node` — Node 전역 식별자를 인식한다.
- `plugins["import-x"]` — `import-x/no-extraneous-dependencies` 규칙 제공.
- `plugins["@simplysm"]` — 이 패키지 커스텀 규칙을 `@simplysm/<id>` 로 제공.
- `plugins["unused-imports"]` — 미사용 import/변수 정리 규칙 제공.
- `require-await: "error"` — `await` 없는 async function 을 오류 보고.
- `no-shadow: "error"` — outer scope 식별자를 inner scope 에서 가리는 선언을 오류 보고.
- `no-duplicate-imports: "error"` — 같은 모듈 중복 import 선언을 오류 보고.
- `no-unused-expressions: "error"` — 미사용 expression statement 를 오류 보고.
- `no-undef: "error"` — 선언되지 않은 식별자 사용을 오류 보고.
- `import-x/no-extraneous-dependencies: ["error", { devDependencies }]` — manifest 의존성 밖 import 를 오류 보고.
- `devDependencies: string[]` — dev dependency import 를 허용할 glob: `"**/lib/**"`, `"**/eslint.config.{js,cjs,mjs}"`, `"**/simplysm.{js,cjs,mjs}"`, `"**/vitest.config.{js,cjs,mjs}"`.
- `@simplysm/no-subpath-imports-from-simplysm: "error"` — simplysm `src` subpath import 오류 보고. 자세히: [rules.md](./rules.md)
- `@simplysm/no-hard-private: "error"` — hard private identifier 오류 보고. 자세히: [rules.md](./rules.md)
- 추가로 `commonRules`, `unusedImportsRules`, `noNodeBuiltinsRules`, `noDirectEnvAccessRules` 묶음이 spread 된다(아래 "공유 규칙 묶음").

## 4. Angular TS recommended spread

```ts
...angular.configs.tsRecommended
```

- `angular.configs.tsRecommended` — `angular-eslint` 의 TypeScript 권장 config 배열을 이 위치에 그대로 펼친다.

## 5. TS 파일 블록

```ts
{
  files: ["**/*.ts"];
  processor: angular.processInlineTemplates;
  plugins: { "@typescript-eslint": tseslint.plugin; "@simplysm": plugin; "import-x": importX; "unused-imports": unusedImportsPlugin };
  settings: { "import-x/resolver-next": [createTypeScriptImportResolver({ alwaysTryTypes: true })] };
  languageOptions: { parser: tseslint.parser; parserOptions: { project: true } };
  rules: FlatConfig.Rules;
}
```

- `files: ["**/*.ts"]` — TypeScript 파일에만 적용.
- `processor: angular.processInlineTemplates` — Angular 컴포넌트 인라인 템플릿을 template lint 대상으로 추출한다.
- `plugins` — `@typescript-eslint`(type-aware 규칙), `@simplysm`(커스텀 TS/Angular 규칙), `import-x`, `unused-imports` 제공.
- `settings["import-x/resolver-next"]` — import-x 의 TypeScript resolver 설정.
- `alwaysTryTypes: true` — resolver 가 `@types/*` resolution 도 시도한다.
- `parser: tseslint.parser` — TypeScript parser 사용.
- `parserOptions.project: true` — 타입 정보 기반 lint 활성화.
- `no-console: "error"` — TS 파일의 `console.*` 호출을 오류 보고. 사용법: [logging.md](../../manuals/logging.md)
- `@typescript-eslint/require-await: "error"` — `await` 없는 async function 오류 보고.
- `@typescript-eslint/await-thenable: "error"` — thenable 아닌 값의 `await` 오류 보고.
- `@typescript-eslint/return-await: ["error", "in-try-catch"]` — try/catch 안에서는 `return await` 요구.
- `@typescript-eslint/no-floating-promises: "error"` — 처리되지 않은 Promise 오류 보고.
- `@typescript-eslint/no-shadow: "error"` — scope shadowing 오류 보고.
- `@typescript-eslint/no-unnecessary-condition: ["error", { allowConstantLoopConditions: true }]` — 불필요한 조건식 오류 보고.
- `allowConstantLoopConditions: true` — 상수 loop 조건은 `no-unnecessary-condition` 예외.
- `@typescript-eslint/no-unnecessary-type-assertion: "error"` — 불필요한 type assertion 오류 보고.
- `@typescript-eslint/prefer-reduce-type-parameter: "error"` — `reduce` 에 type assertion 대신 type parameter 요구.
- `@typescript-eslint/prefer-return-this-type: "error"` — `this` 반환 메서드의 return type 을 `this` 로 요구.
- `@typescript-eslint/no-unused-expressions: "error"` — 미사용 expression statement 오류 보고.
- `@typescript-eslint/strict-boolean-expressions: ["error", { allowNullableBoolean: true, allowNullableObject: true }]` — boolean context 값을 엄격 검사.
- `allowNullableBoolean: true` — nullable boolean 을 boolean context 에 허용.
- `allowNullableObject: true` — nullable object 를 boolean context 에 허용.
- `@typescript-eslint/ban-ts-comment: ["error", options]` — TS directive comment 제한.
- `"ts-expect-error": "allow-with-description"` — 설명이 있는 `@ts-expect-error` 만 허용.
- `minimumDescriptionLength: 3` — 허용되는 `@ts-expect-error` 설명 최소 길이.
- `@typescript-eslint/prefer-readonly: "error"` — 쓰기 없는 private member 를 readonly 로 요구.
- `@typescript-eslint/naming-convention: ["error", options]` — private member naming 검사.
- `selector: "memberLike"` — class/interface member 류를 검사 대상으로 삼는다.
- `modifiers: ["private"]` — private member 만 대상으로 삼는다.
- `format: null` — 특정 casing format 은 강제하지 않는다.
- `leadingUnderscore: "require"` — private member 에 leading underscore 를 요구한다.
- `@typescript-eslint/no-misused-promises: ["error", { checksVoidReturn: { arguments: false, inheritedMethods: false } }]` — Promise 오용 검사.
- `checksVoidReturn.arguments: false` — callback argument 위치의 Promise 반환을 허용.
- `checksVoidReturn.inheritedMethods: false` — inherited method 의 Promise 반환을 허용.
- `@typescript-eslint/only-throw-error: "error"` — Error 가 아닌 값 throw 오류 보고.
- `@typescript-eslint/no-array-delete: "error"` — array element 에 `delete` 사용 오류 보고.
- `@simplysm/ng-no-async-effect: "error"` — Angular effect async 콜백 오류 보고. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@simplysm/no-hard-private: "error"` — hard private identifier 오류 보고. 자세히: [rules.md](./rules.md)
- `@simplysm/no-subpath-imports-from-simplysm: "error"` — simplysm `src` subpath import 오류 보고. 자세히: [rules.md](./rules.md)
- `@simplysm/ts-no-throw-not-implemented-error: "warn"` — `NotImplementedError` 생성자 사용 경고. 자세히: [rules.md](./rules.md)
- `@simplysm/ts-no-unused-injects: "error"` — 미사용 `inject()` 필드 오류 보고. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@simplysm/ts-no-unused-protected-readonly: "error"` — 미사용 컴포넌트 `protected readonly` 필드 오류 보고. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@angular-eslint/no-output-native: "off"` — native event 이름과 같은 output 이름 검사를 끈다.
- `import-x/no-extraneous-dependencies: "error"` — TS 파일에선 추가 option 없이 manifest 밖 import 오류 보고.
- 추가로 `commonRules`, `unusedImportsRules`, `noNodeBuiltinsRules`, `noDirectEnvAccessRules` 묶음이 spread 된다.

## 6. HTML 파일 블록

```ts
{
  files: ["**/*.html"];
  extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility];
  plugins: { "@simplysm": plugin };
  rules: FlatConfig.Rules;
}
```

- `files: ["**/*.html"]` — Angular HTML 템플릿 파일에만 적용.
- `extends` — `angular-eslint` 의 template recommended + accessibility config 를 함께 적용.
- `plugins["@simplysm"]` — 커스텀 template 규칙 제공.
- `@simplysm/ng-template-no-strict-null-check: "error"` — 템플릿 nil 엄격 비교 오류 보고. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@simplysm/ng-template-no-todo-comments: "warn"` — HTML TODO 주석 경고. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@simplysm/ng-template-sd-require-binding-attrs: "error"` — 대상 컴포넌트 plain attribute 오류 보고. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@angular-eslint/template/eqeqeq: ["error", { allowNullOrUndefined: true }]` — template equality 검사.
- `allowNullOrUndefined: true` — null/undefined 와의 비교는 template eqeqeq 위반에서 제외.
- `@angular-eslint/template/label-has-associated-control: "off"` — label-control 연결 접근성 검사를 끈다.
- `@angular-eslint/template/no-any: "error"` — template `$any` 사용 오류 보고. 사용법: [client-rules.md](../../manuals/client-rules.md)

## 7. tests 오버라이드

```ts
{ files: ["**/tests/**/*.ts"], rules: FlatConfig.Rules }
```

- `files: ["**/tests/**/*.ts"]` — `tests` 디렉토리 아래 TS 파일에만 적용.
- `no-console: "off"` — tests 에서 `console.*` 금지 규칙을 끈다.
- `import-x/no-extraneous-dependencies: "off"` — tests 에서 manifest 밖 import 검사를 끈다.
- `@simplysm/ts-no-throw-not-implemented-error: "off"` — tests 에서 `NotImplementedError` 경고를 끈다.

## 8. vitest.config 오버라이드

```ts
{ files: ["**/vitest.config.ts"], rules: { "no-restricted-properties": "off" } }
```

- `files: ["**/vitest.config.ts"]` — Vitest 설정 파일에만 적용.
- `no-restricted-properties: "off"` — Vitest 설정 파일에서 `process.env` 직접 접근 금지를 끈다.

## 공유 규칙 묶음

여러 블록에서 spread 되는 const 규칙 묶음들.

### commonRules (JS·TS 블록)

- `no-warning-comments: "warn"` — warning comment 를 경고 보고.
- `eqeqeq: ["error", "always", { null: "never" }]` — null 비교 외 동등 비교는 엄격 비교 요구.
- `no-self-compare: "error"` — 자기 자신과의 비교 오류 보고.
- `array-callback-return: "error"` — 배열 callback 의 반환 누락 오류 보고.

### unusedImportsRules (JS·TS 블록)

- `unused-imports/no-unused-imports: "error"` — 미사용 import 오류 보고(plugin fixer 대상).
- `unused-imports/no-unused-vars: ["error", options]` — 미사용 변수·인자 오류 보고.
- `vars: "all"` — 모든 변수 선언을 검사.
- `varsIgnorePattern: "^_"` — `_` 로 시작하는 변수는 제외.
- `args: "after-used"` — 마지막 사용 인자 뒤쪽 인자만 검사.
- `argsIgnorePattern: "^_"` — `_` 로 시작하는 인자는 제외.

### noNodeBuiltinsRules (JS·TS 블록)

- `no-restricted-globals` — `Buffer` 전역 사용 오류 보고.
- `name: "Buffer"` — 제한할 전역 이름.
- `message` — `Uint8Array`, 복잡한 연산엔 `@simplysm/core-common` 의 `BytesUtils` 사용을 안내.
- `no-restricted-imports` — 금지 import path 오류 보고.
- `paths[].name: "buffer"` — `buffer` import 금지(메시지: `Uint8Array`/`BytesUtils` 안내).
- `paths[].name: "events"` — `events` import 금지(메시지: `@simplysm/core-common` 의 `EventEmitter` 안내).
- `paths[].name: "eventemitter3"` — `eventemitter3` import 금지(메시지: `EventEmitter` 안내).

### noDirectEnvAccessRules (JS·TS 블록)

- `no-restricted-properties` — `process.env` 직접 접근 오류 보고.
- `object: "process"` / `property: "env"` — 제한 대상 object/property.
- `message` — `env("...")` 사용을 안내.
- `no-restricted-syntax` — 아래 AST selector 매칭 구문을 오류 보고.
- `MemberExpression[object.type="MetaProperty"][property.name="env"]` — `import.meta.env` 직접 접근 금지(메시지: `env("...")`).
- `CallExpression[callee.name="env"][arguments.0.value="NODE_ENV"]` — `env("NODE_ENV")` 호출 금지.
- `BinaryExpression[operator="==="][right...name="undefined"]` / `[left...name="undefined"]` — `=== undefined` 금지(메시지: `== null` 사용).
- `BinaryExpression[operator="!=="][right...name="undefined"]` / `[left...name="undefined"]` — `!== undefined` 금지(메시지: `!= null` 사용).
