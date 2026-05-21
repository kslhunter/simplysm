# @simplysm/lint

Simplysm 컨벤션용 ESLint 플러그인 패키지. 커스텀 규칙 묶음(`./eslint-plugin`)과 typescript-eslint·angular-eslint 통합 flat config 프리셋(`./eslint-recommended`)을 제공한다.

## 사용 트리거 인덱스

- **`./eslint-recommended` (default export)** — 프로젝트 `eslint.config.{js,mjs,cjs}` 에서 그대로 spread 해 simplysm 표준 lint 규칙을 적용할 때.
- **`./eslint-plugin` (default export)** — recommended 를 사용하지 않고 개별 규칙만 골라 쓰거나, 다른 flat config 에서 `@simplysm/<rule>` 로 참조할 때.
  - **`ng-no-async-effect`** — Angular `effect()` 콜백을 async 로 작성하지 않게 막을 때.
  - **`ng-template-no-strict-null-check`** — Angular 템플릿에서 `=== null|undefined` 대신 `== null` 로 통일시킬 때.
  - **`ng-template-no-todo-comments`** — Angular 템플릿 내 `<!-- TODO: ... -->` 를 빌드 경고로 남길 때.
  - **`ng-template-sd-require-binding-attrs`** — `sd-*` 컴포넌트에 plain attribute 못 쓰게 하고 property binding 으로 강제할 때.
  - **`no-hard-private`** — `#field` 대신 TypeScript `private _field` 스타일을 강제할 때.
  - **`no-subpath-imports-from-simplysm`** — `@simplysm/<pkg>/src/...` 직접 import 를 차단할 때.
  - **`ts-no-throw-not-implemented-error`** — `NotImplementedError` 잔존을 빌드 경고로 표면화할 때.
  - **`ts-no-unused-injects`** — Angular `inject()` 로 받은 미사용 필드를 정리할 때.
  - **`ts-no-unused-protected-readonly`** — Angular 컴포넌트 인라인 템플릿/클래스 어느 쪽에서도 안 쓰는 `protected readonly` 필드를 정리할 때.

## `./eslint-recommended`

```ts
// eslint.config.mjs
import recommended from "@simplysm/lint/eslint-recommended";
export default recommended;
// 또는 추가 config 와 함께
export default [...recommended, { /* overrides */ }];
```

`typescript-eslint.config(...)` 결과(flat config 배열). 다음을 합쳐 export 한다:

- `ignores`: `**/node_modules/**`, `**/dist/**`, `**/.*/**` (디렉터리 단위 스킵).
- `**/*.{js,mjs,cjs}` 블록: globals=node, 플러그인 `import`/`@simplysm`/`unused-imports`, `import/no-extraneous-dependencies` 예외 경로 = `**/lib/**`, `**/eslint.config.{js,cjs,mjs}`, `**/simplysm.{js,cjs,mjs}`, `**/vitest.config.{js,cjs,mjs}`.
- `angular.configs.tsRecommended` + `**/*.ts` 블록: `tseslint.parser` + `parserOptions.project: true`, `angular.processInlineTemplates` processor, `eslint-import-resolver-typescript` resolver(`alwaysTryTypes: true`).
- `**/*.html` 블록: `angular.configs.templateRecommended` + `templateAccessibility` extends, `@angular-eslint/template/eqeqeq` 는 `allowNullOrUndefined: true`, `label-has-associated-control` off, `template/no-any` error.
- `**/tests/**/*.ts` override: `no-console`, `import/no-extraneous-dependencies`, `@simplysm/ts-no-throw-not-implemented-error` off.
- `**/vitest.config.ts` override: `no-restricted-properties` off (vitest 가 `process` 접근 필요).

공통으로 강제되는 simplysm 컨벤션:

- `Buffer`/`buffer`/`events`/`eventemitter3` 금지 → `Uint8Array`/`@simplysm/core-common` 사용 유도.
- `process.env`/`import.meta.env` 직접 접근 금지 → `env("...")` 호출 강제. `env("NODE_ENV")` 자체 금지.
- `=== undefined` / `!== undefined` 금지 → `== null` / `!= null` 통일.
- TS 블록 전용: `naming-convention` 으로 `private` 멤버에 leading underscore(`_foo`) 강제, `strict-boolean-expressions` (nullable boolean/object 허용), `ban-ts-comment` (`ts-expect-error` 는 3자 이상 설명 필수), `only-throw-error`, `no-floating-promises` 등.
- `unused-imports/no-unused-imports` error, `unused-imports/no-unused-vars` error (vars=all, args=after-used, 둘 다 `^_` 시작 식별자는 제외).
- `@typescript-eslint/no-misused-promises`: `checksVoidReturn.arguments=false`, `inheritedMethods=false` (Angular 이벤트 핸들러 패턴 허용).
- TS 블록에 등록되는 `@simplysm/*` 룰: `ng-no-async-effect`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly` 는 error, `ts-no-throw-not-implemented-error` 는 warn.
- HTML 블록에 등록되는 `@simplysm/*` 룰: `ng-template-no-strict-null-check` error, `ng-template-sd-require-binding-attrs` error, `ng-template-no-todo-comments` warn.
- JS 블록에 등록되는 `@simplysm/*` 룰: `no-subpath-imports-from-simplysm`, `no-hard-private` (둘 다 error).

## `./eslint-plugin`

```ts
// eslint.config.mjs
import simplysm from "@simplysm/lint/eslint-plugin";
export default [{
  plugins: { "@simplysm": simplysm },
  rules: { "@simplysm/no-hard-private": "error" },
}];
```

`{ rules: { ... } }` 형태의 ESLint 플러그인 객체. 노출 규칙(전부 `@simplysm/<name>` 으로 참조):

### `ng-no-async-effect` (problem)
`@angular/core`에서 import 한 `effect()` 1번째 인자가 async 함수면 보고. named/aliased/namespace import 모두 추적. `await` 이후 signal read 가 의존성 추적 밖으로 빠지는 문제 방지. 안내: 비동기 작업은 `void untracked(async () => { ... })` 로 감쌀 것.

### `ng-template-no-strict-null-check` (problem)
HTML 템플릿 바인딩에서 `=== null|undefined`, `!== null|undefined` 사용 시 보고. `== null`/`!= null` 로 통일 유도. autofix 없음(인라인 템플릿 offset 매핑 문제).

### `ng-template-no-todo-comments` (problem, recommended=warn)
HTML 주석 `<!-- TODO: ... -->` 를 정규식으로 탐지해 본문을 메시지로 보고. AST 방문자 없이 raw text 스캔.

### `ng-template-sd-require-binding-attrs` (problem, fixable)
`sd-*` 접두사 컴포넌트의 plain attribute 사용을 제한하고 property binding 으로 변환.
- 옵션: `selectorPrefixes`(기본 `["sd-"]`), `allowAttributes`(기본 `["id","class","style","title","tabindex","role"]`), `allowAttributePrefixes`(기본 `["aria-","data-","sd-"]`).
- Autofix: `foo="bar"` → `[foo]="'bar'"`, 값 없으면 `[foo]="true"`.

### `no-hard-private` (problem, fixable)
ES private 필드(`#field`, `#method()`, `accessor #field`, `this.#field`) 금지. TypeScript `private _field` 스타일 강제. Autofix 로 `#x` → `_x` 치환 + 선언부에 `private` 키워드 삽입(데코레이터/`static`/`async`/`readonly` 순서 보존). 동일 클래스에 `_x` 멤버가 이미 있으면 `nameConflict` 로 보고만(자동 수정 안 함).

### `no-subpath-imports-from-simplysm` (problem, fixable)
`@simplysm/<pkg>/src/...` 형태 import 금지. 정적 `import`, 동적 `import()`, `export ... from`, `export * from` 모두 검사. Autofix: `@simplysm/<pkg>` 로 단축.

### `ts-no-throw-not-implemented-error` (suggestion, recommended=warn)
`@simplysm/core-common` 에서 import 한 `NotImplementedError` 의 `new` 호출 보고. named/aliased/namespace import 추적. 인자가 비어있지 않은 문자열 리터럴이면 메시지에 그대로 노출(없으면 `"미구현"`). 동적 import 는 미지원. `**/tests/**/*.ts` 에서는 off.

### `ts-no-unused-injects` (problem, fixable)
클래스 내 `inject()` 로 초기화된 PropertyDefinition 중 같은 클래스 본문에서 식별자로 단 한 번도 참조되지 않는 필드 보고. Autofix 로 해당 필드 라인 제거.

### `ts-no-unused-protected-readonly` (problem, fixable)
`@Component({ template: "..." })` 클래스의 `protected readonly` 인스턴스 필드(=static 제외) 중 인라인 템플릿과 클래스 본문 모두에서 미참조면 보고·자동 제거. `templateUrl` 만 있는 경우(=`template` 프로퍼티 없음) 검사 스킵. 템플릿은 `@angular/compiler` 의 `parseTemplate` 로 파싱하며 `*ngFor` 로컬 변수, `@let`, `@if as alias`, `@for item/context`, `@switch`/`@defer` 트리거까지 스코프 처리.

## 규칙 작성용 유틸 (내부)

`createRule` 은 패키지 내부 규칙 정의 전용 헬퍼(`ESLintUtils.RuleCreator` 래퍼)로, 외부 export 표면(`exports` 필드) 에 노출되지 않는다. 소비자 코드에서 직접 사용하지 않음.
