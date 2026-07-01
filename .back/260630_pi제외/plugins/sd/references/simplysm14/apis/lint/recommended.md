# @simplysm/lint — recommended

`@simplysm/lint/eslint-recommended` default export 가 만드는 ESLint 9 flat config 배열. 프로젝트 lint 설정에 표준 JS·TS·Angular template 규칙 세트를 붙일 때 같이 읽는다.

## default export

```ts
export default tseslint.config(...configs);
```

- `tseslint.config(...configs)` — 아래 flat config 객체들을 순서대로 배열화한다. 뒤쪽 config 가 같은 파일에 함께 매칭되면 ESLint flat config 병합 규칙에 따라 추가 적용된다.
- 사용법: [client-rules.md](../../manuals/client-rules.md), [logging.md](../../manuals/logging.md)

## 1. ignores

```ts
{ ignores: string[] }
```

- `ignores: string[]` — ESLint 순회 제외 glob 목록이다.
- `"**/node_modules/**"` — dependency 설치물을 검사하지 않는다.
- `"**/dist/**"` — 빌드 산출물을 검사하지 않는다.
- `"**/.*/**"` — dot directory 아래 파일을 검사하지 않는다.

## 2. 공통 languageOptions

```ts
{ languageOptions: { ecmaVersion: "latest"; sourceType: "module" } }
```

- `ecmaVersion: "latest"` — 최신 ECMAScript 문법으로 파싱한다.
- `sourceType: "module"` — 파일을 ESM module 로 파싱한다.

## 3. JS 파일 블록

```ts
{
  files: ["**/*.js", "**/*.mjs", "**/*.cjs"];
  languageOptions: { globals: globals.node };
  plugins: { "import-x": importX; "@simplysm": plugin; "unused-imports": unusedImportsPlugin };
  rules: FlatConfig.Rules;
}
```

- `files` — JS 계열 파일에만 이 블록을 적용한다. `.js`, `.mjs`, `.cjs` glob 이 들어간다.
- `globals: globals.node` — Node 전역 식별자를 JS 파일에서 인식한다.
- `plugins["import-x"]` — `import-x/no-extraneous-dependencies` 규칙을 제공한다.
- `plugins["@simplysm"]` — 이 패키지의 custom rule 을 `@simplysm/<id>` 이름으로 제공한다.
- `plugins["unused-imports"]` — unused import/variable 정리 규칙을 제공한다.
- `no-warning-comments: "warn"` — warning comment 를 경고로 보고한다.
- `eqeqeq: ["error", "always", { null: "never" }]` — 동등 비교는 엄격 비교를 요구하되 null 비교는 예외로 둔다.
- `no-self-compare: "error"` — 자기 자신과의 비교를 오류로 보고한다.
- `array-callback-return: "error"` — 배열 callback 의 누락된 반환을 오류로 보고한다.
- `require-await: "error"` — `await` 없는 async function 을 오류로 보고한다.
- `no-shadow: "error"` — outer scope 식별자를 inner scope 에서 가리는 선언을 오류로 보고한다.
- `no-duplicate-imports: "error"` — 같은 모듈의 중복 import 선언을 오류로 보고한다.
- `no-unused-expressions: "error"` — 사용되지 않는 expression statement 를 오류로 보고한다.
- `no-undef: "error"` — 선언되지 않은 식별자 사용을 오류로 보고한다.
- `unused-imports/no-unused-imports: "error"` — 미사용 import 를 오류로 보고하고 plugin fixer 대상이 된다.
- `unused-imports/no-unused-vars: ["error", options]` — 미사용 변수·인자를 오류로 보고한다.
- `vars: "all"` — 모든 변수 선언을 unused 검사 대상으로 삼는다.
- `varsIgnorePattern: "^_"` — `_` 로 시작하는 변수는 unused 검사에서 제외한다.
- `args: "after-used"` — 마지막으로 사용된 인자 뒤쪽 인자만 unused 검사 대상으로 삼는다.
- `argsIgnorePattern: "^_"` — `_` 로 시작하는 인자는 unused 검사에서 제외한다.
- `import-x/no-extraneous-dependencies: ["error", options]` — manifest 의존성 밖 import 를 오류로 보고한다.
- `devDependencies: string[]` — dev dependency import 허용 glob 이다. 값은 `"**/lib/**"`, `"**/eslint.config.{js,cjs,mjs}"`, `"**/simplysm.{js,cjs,mjs}"`, `"**/vitest.config.{js,cjs,mjs}"`.
- `@simplysm/no-subpath-imports-from-simplysm: "error"` — simplysm `src` subpath import 를 오류로 보고한다. 자세히: [rules.md](./rules.md)
- `@simplysm/no-hard-private: "error"` — hard private identifier 를 오류로 보고한다. 자세히: [rules.md](./rules.md)
- 공유 규칙 묶음 — `noNodeBuiltinsRules`, `noDirectEnvAccessRules` 가 JS 블록에 함께 spread 된다.

## 4. Angular TS recommended spread

```ts
...angular.configs.tsRecommended
```

- `angular.configs.tsRecommended` — `angular-eslint` 의 TypeScript 권장 config 배열을 그대로 중간에 펼친다.

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

- `files: ["**/*.ts"]` — TypeScript 파일에만 이 블록을 적용한다.
- `processor: angular.processInlineTemplates` — Angular component 의 inline template 을 template lint 대상으로 추출한다.
- `plugins["@typescript-eslint"]` — type-aware TypeScript lint 규칙을 제공한다.
- `plugins["@simplysm"]` — custom TS/Angular 규칙을 제공한다.
- `plugins["import-x"]` — import dependency 검사를 제공한다.
- `plugins["unused-imports"]` — unused import/variable 검사를 제공한다.
- `settings["import-x/resolver-next"]` — import-x resolver 설정이다.
- `alwaysTryTypes: true` — TypeScript import resolver 가 `@types/*` resolution 도 시도한다.
- `parser: tseslint.parser` — TypeScript parser 를 사용한다.
- `parserOptions.project: true` — 타입 정보 기반 lint 를 켠다.
- `no-console: "error"` — TS 파일의 `console.*` 호출을 오류로 보고한다. 사용법: [logging.md](../../manuals/logging.md)
- `@typescript-eslint/require-await: "error"` — `await` 없는 async function 을 오류로 보고한다.
- `@typescript-eslint/await-thenable: "error"` — thenable 이 아닌 값의 `await` 를 오류로 보고한다.
- `@typescript-eslint/return-await: ["error", "in-try-catch"]` — try/catch 안에서는 return await 를 요구한다.
- `@typescript-eslint/no-floating-promises: "error"` — 처리되지 않은 Promise 를 오류로 보고한다.
- `@typescript-eslint/no-shadow: "error"` — scope shadowing 을 오류로 보고한다.
- `@typescript-eslint/no-unnecessary-condition: ["error", { allowConstantLoopConditions: true }]` — 불필요한 조건식을 오류로 보고하되 상수 loop 조건은 허용한다.
- `allowConstantLoopConditions: true` — constant loop condition 은 `no-unnecessary-condition` 예외로 둔다.
- `@typescript-eslint/no-unnecessary-type-assertion: "error"` — 불필요한 type assertion 을 오류로 보고한다.
- `@typescript-eslint/prefer-reduce-type-parameter: "error"` — `reduce` 에 type assertion 대신 type parameter 사용을 요구한다.
- `@typescript-eslint/prefer-return-this-type: "error"` — `this` 반환 메서드의 return type 을 `this` 로 쓰도록 요구한다.
- `@typescript-eslint/no-unused-expressions: "error"` — 사용되지 않는 expression statement 를 오류로 보고한다.
- `@typescript-eslint/strict-boolean-expressions: ["error", { allowNullableBoolean: true, allowNullableObject: true }]` — boolean context 값을 엄격히 검사하되 nullable boolean/object 는 허용한다.
- `allowNullableBoolean: true` — nullable boolean 을 boolean context 에 허용한다.
- `allowNullableObject: true` — nullable object 를 boolean context 에 허용한다.
- `@typescript-eslint/ban-ts-comment: ["error", options]` — TS directive comment 를 제한한다.
- `"ts-expect-error": "allow-with-description"` — 설명이 있는 `@ts-expect-error` 만 허용한다.
- `minimumDescriptionLength: 3` — 허용되는 `@ts-expect-error` 설명 최소 길이다.
- `@typescript-eslint/prefer-readonly: "error"` — 쓰기 없는 private member 를 readonly 로 만들도록 요구한다.
- `@typescript-eslint/naming-convention: ["error", options]` — private member naming 을 검사한다.
- `selector: "memberLike"` — class/interface member 류를 검사 대상으로 삼는다.
- `modifiers: ["private"]` — private member 만 naming convention 대상으로 삼는다.
- `format: null` — 특정 casing format 은 강제하지 않는다.
- `leadingUnderscore: "require"` — private member 에 leading underscore 를 요구한다.
- `@typescript-eslint/no-misused-promises: ["error", { checksVoidReturn: { arguments: false, inheritedMethods: false } }]` — Promise 오용을 검사하되 void-return argument/inherited method 위치는 제외한다.
- `checksVoidReturn.arguments: false` — callback argument 위치의 Promise 반환을 이 규칙에서 허용한다.
- `checksVoidReturn.inheritedMethods: false` — inherited method 의 Promise 반환을 이 규칙에서 허용한다.
- `@typescript-eslint/only-throw-error: "error"` — Error 가 아닌 값 throw 를 오류로 보고한다.
- `@typescript-eslint/no-array-delete: "error"` — array element 에 `delete` 사용을 오류로 보고한다.
- `@simplysm/ng-no-async-effect: "error"` — Angular effect async callback 을 오류로 보고한다. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@simplysm/no-hard-private: "error"` — hard private identifier 를 오류로 보고한다. 자세히: [rules.md](./rules.md)
- `@simplysm/no-subpath-imports-from-simplysm: "error"` — simplysm `src` subpath import 를 오류로 보고한다. 자세히: [rules.md](./rules.md)
- `@simplysm/ts-no-throw-not-implemented-error: "warn"` — `NotImplementedError` 생성자 사용을 경고로 보고한다. 자세히: [rules.md](./rules.md)
- `@simplysm/ts-no-unused-injects: "error"` — 미사용 Angular `inject()` field 를 오류로 보고한다. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@simplysm/ts-no-unused-protected-readonly: "error"` — 미사용 Angular component `protected readonly` field 를 오류로 보고한다. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@angular-eslint/no-output-native: "off"` — native event 이름과 같은 output 이름 검사를 끈다.
- `unused-imports/no-unused-imports` / `unused-imports/no-unused-vars` — JS 블록과 같은 unused-imports 묶음이 적용된다.
- `import-x/no-extraneous-dependencies: "error"` — TS 파일에서는 추가 option 없이 manifest 밖 import 를 오류로 보고한다.
- 공유 규칙 묶음 — `noNodeBuiltinsRules`, `noDirectEnvAccessRules` 가 TS 블록에 함께 spread 된다.

## 6. HTML 파일 블록

```ts
{
  files: ["**/*.html"];
  extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility];
  plugins: { "@simplysm": plugin };
  rules: FlatConfig.Rules;
}
```

- `files: ["**/*.html"]` — Angular HTML template 파일에만 이 블록을 적용한다.
- `extends` — `angular-eslint` template recommended 와 accessibility config 를 함께 적용한다.
- `plugins["@simplysm"]` — custom template 규칙을 제공한다.
- `@simplysm/ng-template-no-strict-null-check: "error"` — 템플릿 nil 엄격 비교를 오류로 보고한다. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@simplysm/ng-template-no-todo-comments: "warn"` — HTML TODO 주석을 경고로 보고한다. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@simplysm/ng-template-sd-require-binding-attrs: "error"` — 대상 컴포넌트 plain attribute 를 오류로 보고한다. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- `@angular-eslint/template/eqeqeq: ["error", { allowNullOrUndefined: true }]` — template equality 검사를 켜되 null/undefined 비교는 허용한다.
- `allowNullOrUndefined: true` — null 또는 undefined 와의 비교는 template eqeqeq 위반에서 제외한다.
- `@angular-eslint/template/label-has-associated-control: "off"` — label-control 연결 접근성 검사를 끈다.
- `@angular-eslint/template/no-any: "error"` — template `$any` 사용을 오류로 보고한다. 사용법: [client-rules.md](../../manuals/client-rules.md)

## 7. tests 오버라이드

```ts
{ files: ["**/tests/**/*.ts"], rules: FlatConfig.Rules }
```

- `files: ["**/tests/**/*.ts"]` — `tests` 디렉토리 아래 TypeScript 파일에만 이 오버라이드를 적용한다.
- `no-console: "off"` — tests 파일에서 `console.*` 금지 규칙을 끈다.
- `import-x/no-extraneous-dependencies: "off"` — tests 파일에서 manifest 밖 import 검사를 끈다.
- `@simplysm/ts-no-throw-not-implemented-error: "off"` — tests 파일에서 `NotImplementedError` 사용 경고를 끈다.

## 8. vitest.config 오버라이드

```ts
{ files: ["**/vitest.config.ts"], rules: { "no-restricted-properties": "off" } }
```

- `files: ["**/vitest.config.ts"]` — Vitest 설정 파일에만 이 오버라이드를 적용한다.
- `no-restricted-properties: "off"` — Vitest 설정 파일에서 `process.env` 직접 접근 금지를 끈다.

## 공유 규칙 묶음

### commonRules

- `no-warning-comments: "warn"` — warning comment 를 경고로 보고한다.
- `eqeqeq: ["error", "always", { null: "never" }]` — null 비교 외 동등 비교는 엄격 비교를 요구한다.
- `no-self-compare: "error"` — 자기 비교를 오류로 보고한다.
- `array-callback-return: "error"` — 배열 callback return 누락을 오류로 보고한다.

### noNodeBuiltinsRules

- `no-restricted-globals` — `Buffer` 전역 사용을 오류로 보고한다.
- `name: "Buffer"` — 제한할 전역 식별자 이름이다.
- `message` — `Uint8Array` 또는 `@simplysm/core-common` 의 `BytesUtils` 사용을 안내한다.
- `no-restricted-imports` — 금지 import path 를 오류로 보고한다.
- `paths[].name: "buffer"` — `buffer` import 를 금지한다.
- `paths[].name: "events"` — `events` import 를 금지한다.
- `paths[].name: "eventemitter3"` — `eventemitter3` import 를 금지한다.
- `paths[].message` — `buffer` 는 `Uint8Array`/`BytesUtils`, event emitter 계열은 `@simplysm/core-common` 의 `EventEmitter` 사용을 안내한다.

### noDirectEnvAccessRules

- `no-restricted-properties` — 특정 object property 접근을 오류로 보고한다.
- `object: "process"` — 제한할 object 이름이다.
- `property: "env"` — 제한할 property 이름이다.
- `message` — `process.env` 직접 접근 대신 `env("...")` 사용을 안내한다.
- `no-restricted-syntax` — AST selector 로 잡은 구문을 오류로 보고한다.
- `selector: 'MemberExpression[object.type="MetaProperty"][property.name="env"]'` — `import.meta.env` 직접 접근을 금지한다.
- `selector: 'CallExpression[callee.name="env"][arguments.0.value="NODE_ENV"]'` — `env("NODE_ENV")` 호출을 금지한다.
- `selector: 'BinaryExpression[operator="==="][right.type="Identifier"][right.name="undefined"]'` — 오른쪽 `undefined` 와의 `===` 비교를 금지한다.
- `selector: 'BinaryExpression[operator="==="][left.type="Identifier"][left.name="undefined"]'` — 왼쪽 `undefined` 와의 `===` 비교를 금지한다.
- `selector: 'BinaryExpression[operator="!=="][right.type="Identifier"][right.name="undefined"]'` — 오른쪽 `undefined` 와의 `!==` 비교를 금지한다.
- `selector: 'BinaryExpression[operator="!=="][left.type="Identifier"][left.name="undefined"]'` — 왼쪽 `undefined` 와의 `!==` 비교를 금지한다.
- 각 `message` — env 직접 접근 금지는 `env("...")`, `undefined` 엄격 비교 금지는 `== null` 또는 `!= null` 사용을 안내한다.

### unusedImportsRules

- `unused-imports/no-unused-imports: "error"` — 미사용 import 를 오류로 보고한다.
- `unused-imports/no-unused-vars: ["error", options]` — 미사용 변수·인자를 오류로 보고한다.
- `vars: "all"` — 모든 변수를 검사한다.
- `varsIgnorePattern: "^_"` — `_` prefix 변수는 제외한다.
- `args: "after-used"` — 마지막 사용 인자 뒤 인자만 검사한다.
- `argsIgnorePattern: "^_"` — `_` prefix 인자는 제외한다.
