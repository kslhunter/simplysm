# @simplysm/lint

심플리즘 워크스페이스 전용 ESLint 플러그인. 커스텀 규칙 9종 묶음(`eslint-plugin`)과, 그 규칙들을 포함해 JS/TS/HTML 파일별로 완성된 flat config 배열(`eslint-recommended`)을 서브패스 export 로 제공. `src/index.ts` 없음 — `package.json` 의 `exports`(`./eslint-plugin`, `./eslint-recommended`)가 진입점.

## 사용 트리거 인덱스

- **eslint-recommended** — 프로젝트 `eslint.config.{js,mjs,cjs}` 에서 simplysm 표준 lint 규칙 전체(JS/TS/HTML 파일별 + tseslint/angular-eslint 통합)를 한 번에 적용할 때 import 하는 default export(완성된 flat config 배열).
- **eslint-plugin** — `@simplysm/<rule>` 커스텀 규칙 9종을 직접 켜거나, 개별 규칙의 감지 범위·메시지·autofix·옵션을 파악할 때. 자세히: [rules.md](./rules.md)

## eslint-recommended

`@simplysm/lint/eslint-recommended` 의 default export. `tseslint.config(...)` 결과(`FlatConfig` 배열)이므로 호출형이 아니라 완성된 상수. 그대로 export 하거나 spread 후 항목을 덧붙여 사용.

```js
// eslint.config.js
import recommended from "@simplysm/lint/eslint-recommended";
export default recommended;
// 규칙 추가 시: export default [...recommended, { files: ["**/*.ts"], rules: { "no-debugger": "error" } }];
```

config 가 강제하는 핵심 내용(파일 glob 블록별):

- **ignores** — `**/node_modules/**`, `**/dist/**`, `**/.*/**`(숨김 디렉터리 전체). 순회 자체를 건너뜀.
- **`**/*.{js,mjs,cjs}`** — node globals 적용. 켜는 규칙: `require-await`(async 함수에 await 없으면 오류), `no-shadow`(상위 스코프 변수 가림 금지), `no-duplicate-imports`(같은 모듈 중복 import 금지), `no-unused-expressions`(부수효과 없는 표현식 금지), `no-undef`(선언 안 된 식별자 사용 금지), `unused-imports/no-unused-imports`(미사용 import 제거, autofix), `unused-imports/no-unused-vars`(미사용 변수·인자 경고, `^_` 접두는 무시), `import/no-extraneous-dependencies`(미선언 의존성 import 금지, 단 `lib/**`·`eslint.config.*`·`simplysm.*`·`vitest.config.*` 는 devDependencies 허용), `@simplysm/no-subpath-imports-from-simplysm`, `@simplysm/no-hard-private` + 아래 공통 규칙군.
- **`**/*.ts`** — `angular.configs.tsRecommended` 를 펼친 뒤 추가. `processInlineTemplates` 로 인라인 템플릿 분리, `tseslint.parser`(`parserOptions.project: true`) 사용, `eslint-import-resolver-typescript` resolver 를 `import.meta.resolve` 로 자동 등록. 켜는 규칙: `no-console`(error), 그리고 타입 인식 `@typescript-eslint/*` 규칙 — `require-await`, `await-thenable`(thenable 만 await), `return-await`(`in-try-catch` = try/catch 안에서만 return await 요구), `no-floating-promises`(await/void 안 한 Promise 금지), `no-shadow`, `no-unnecessary-condition`(`allowConstantLoopConditions: true` = 상수 루프 조건 허용), `no-unnecessary-type-assertion`, `prefer-reduce-type-parameter`, `prefer-return-this-type`, `no-unused-expressions`, `strict-boolean-expressions`(`allowNullableBoolean`·`allowNullableObject` = nullable boolean/object 의 조건식 허용), `ban-ts-comment`(`ts-expect-error` 는 3자 이상 설명 필수), `prefer-readonly`, `naming-convention`(private 멤버는 `_` 접두 필수, 그 외 포맷 제약 없음), `no-misused-promises`(`checksVoidReturn.arguments:false`·`inheritedMethods:false` = 콜백 인자·상속 메서드의 void 반환 검사는 끔), `only-throw-error`(Error 외 throw 금지), `no-array-delete`(배열에 `delete` 금지). 커스텀 규칙 6종: `@simplysm/ng-no-async-effect`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error`(warn), `ts-no-unused-injects`, `ts-no-unused-protected-readonly`. + `@angular-eslint/no-output-native`(off).
- **`**/*.html`** — `angular.configs.templateRecommended` + `templateAccessibility` 확장. 커스텀 템플릿 규칙: `@simplysm/ng-template-no-strict-null-check`, `ng-template-no-todo-comments`(warn), `ng-template-sd-require-binding-attrs` + `@angular-eslint/template/eqeqeq`(`allowNullOrUndefined: true` = null/undefined 비교는 느슨한 비교 허용), `label-has-associated-control`(off), `no-any`(error).
- **`**/tests/**/*.ts`(override)** — 테스트 완화: `no-console`(off), `import/no-extraneous-dependencies`(off), `@simplysm/ts-no-throw-not-implemented-error`(off).
- **`**/vitest.config.ts`(override)** — `no-restricted-properties`(off). 설정 파일에서 `process.env` 직접 접근 허용.

공통 규칙군(JS/TS 양쪽 적용): `no-warning-comments`(warn, TODO/FIXME 등 경고), `eqeqeq`(`always`, 단 `null` 비교는 `==`/`!=` 허용), `no-self-compare`, `array-callback-return`(map/filter 등 콜백에 return 강제). 추가 공통 금지: `no-restricted-globals`(`Buffer` 전역 금지 → `Uint8Array`/`BytesUtils`), `no-restricted-imports`(`buffer`·`events`·`eventemitter3` 모듈 금지), `no-restricted-properties`(`process.env` 직접 접근 금지 → `env("...")`), `no-restricted-syntax`(`import.meta.env` 직접 접근·`env("NODE_ENV")`·`=== undefined`/`!== undefined` 류 strict 비교 금지 → `== null`/`!= null`).

주의: 타입 인식 `@typescript-eslint` 규칙이 켜져 있어 TS 파일은 `parserOptions.project: true` 가 동작하는 환경(tsconfig 포함)이어야 함.

## eslint-plugin

`@simplysm/lint/eslint-plugin` 의 default export 는 `{ rules: { ... } }` 형태의 ESLint 플러그인 객체. 9개 규칙을 규칙 ID → 규칙 정의로 매핑. 보통 `eslint-recommended` 가 내부에서 `@simplysm` 네임스페이스로 등록하므로, 직접 import 는 recommended 없이 커스텀 config 를 짜거나 특정 규칙만 개별 제어할 때만 필요. 규칙별 상세는 [rules.md](./rules.md).

```js
import plugin from "@simplysm/lint/eslint-plugin";
export default [{ plugins: { "@simplysm": plugin }, rules: { "@simplysm/no-hard-private": "error" } }];
```

규칙 ID 9종: `ng-no-async-effect`, `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly`.
