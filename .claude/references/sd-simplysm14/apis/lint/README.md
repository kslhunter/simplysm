# @simplysm/lint

simplysm 전용 ESLint 9 flat-config 프리셋과 커스텀 규칙 9종을 제공하는 ESLint 플러그인 패키지. `src/index.ts` 없음 — `package.json` 의 `exports`(`./eslint-plugin`, `./eslint-recommended`) 두 subpath 가 진입점. 패키지 루트 import 는 없음.

## 사용 트리거 인덱스

- **eslint-recommended** (`@simplysm/lint/eslint-recommended`) — 프로젝트 `eslint.config.ts` 에서 통째로 spread 해 쓰는 완성형 flat-config 배열. JS/TS/HTML 파일별 규칙·ignore·플러그인·Angular 통합이 모두 포함됨. 새 프로젝트 lint 설정을 잡을 때.
- **eslint-plugin** (`@simplysm/lint/eslint-plugin`) — 커스텀 규칙만 담은 ESLint Plugin 객체(`{ rules }`). recommended 를 쓰지 않고 규칙을 직접 골라 등록할 때, 또는 규칙 동작을 개별 검토할 때. 자세히: [rules.md](./rules.md)

## eslint-recommended

`@simplysm/lint/eslint-recommended` 의 default export. `typescript-eslint` 의 `tseslint.config(...)` 결과 = flat-config 객체 배열. 그대로 spread 해서 사용함.

```typescript
// eslint.config.ts
import recommended from "@simplysm/lint/eslint-recommended";

export default [...recommended];
```

배열을 구성하는 config 블록(순서대로):

- **globalIgnores** — `**/node_modules/**`, `**/dist/**`, `**/.*/**` 순회 자체를 건너뜀. 점(.)으로 시작하는 디렉토리 전체가 제외 대상.
- **공통 languageOptions** — `ecmaVersion: "latest"`, `sourceType: "module"`.
- **JS 블록** (`**/*.js`, `**/*.mjs`, `**/*.cjs`) — node 글로벌, `import`/`@simplysm`/`unused-imports` 플러그인 등록. 활성 규칙: `require-await`, `no-shadow`, `no-duplicate-imports`, `no-unused-expressions`, `no-undef`, unused-imports 2종, `import/no-extraneous-dependencies`(lib·`eslint.config`·`simplysm`·`vitest.config` 파일은 devDeps 허용), `@simplysm/no-subpath-imports-from-simplysm`, `@simplysm/no-hard-private`, node 빌트인 차단 규칙군, env 직접접근 차단 규칙군.
- **angular tsRecommended** — `angular.configs.tsRecommended` spread.
- **TS 블록** (`**/*.ts`) — `processor: angular.processInlineTemplates`(인라인 템플릿 추출 후 별도 lint), `parserOptions.project: true`(타입 정보 사용), `import/resolver` 로 typescript resolver(`alwaysTryTypes: true`) 지정. typescript-eslint 타입체크 규칙 다수 + `@simplysm` 커스텀 규칙 6종 활성. 커스텀 규칙 심각도: `ng-no-async-effect`/`no-hard-private`/`no-subpath-imports-from-simplysm`/`ts-no-unused-injects`/`ts-no-unused-protected-readonly` = `error`, `ts-no-throw-not-implemented-error` = `warn`. `@angular-eslint/no-output-native` 은 `off`.
- **HTML 블록** (`**/*.html`) — `angular.configs.templateRecommended` + `templateAccessibility` extends. `@simplysm` 템플릿 규칙 3종 활성: `ng-template-no-strict-null-check`=`error`, `ng-template-no-todo-comments`=`warn`, `ng-template-sd-require-binding-attrs`=`error`. `@angular-eslint/template/eqeqeq` 는 `allowNullOrUndefined: true`, `label-has-associated-control`=`off`, `no-any`=`error`.
- **테스트 오버라이드** (`**/tests/**/*.ts`) — 테스트 코드 완화: `no-console`=`off`, `import/no-extraneous-dependencies`=`off`, `@simplysm/ts-no-throw-not-implemented-error`=`off`.
- **vitest.config 오버라이드** (`**/vitest.config.ts`) — `no-restricted-properties`=`off` (설정 파일에서 `process.env` 접근 허용).

주의:

- TS 블록은 타입 정보(`parserOptions.project: true`)를 요구하므로, 대상 프로젝트에 유효한 `tsconfig` 가 있어야 함.
- node 빌트인 차단(`noNodeBuiltinsRules`): `Buffer` 글로벌 및 `buffer`/`events`/`eventemitter3` import 금지 — 각각 `Uint8Array`/`@simplysm/core-common`의 `BytesUtils`·`EventEmitter` 로 대체 유도. JS·TS 블록 모두에 적용.
- env 직접접근 차단(`noDirectEnvAccessRules`): `process.env`·`import.meta.env` 직접 접근, `env("NODE_ENV")` 호출, `=== undefined`/`!== undefined`(엄격 비교) 를 `no-restricted-properties`/`no-restricted-syntax` 로 막음(엄격 비교는 `== null`/`!= null` 로 유도). JS·TS 블록 모두에 적용.

## eslint-plugin

`@simplysm/lint/eslint-plugin` 의 default export. ESLint Plugin 형태 객체.

```typescript
import plugin from "@simplysm/lint/eslint-plugin";
// plugin === { rules: { "ng-no-async-effect": ..., "no-hard-private": ..., ... } }
```

- `rules` — 규칙 id → 규칙 객체 맵. 등록된 9개 id: `ng-no-async-effect`, `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly`.

flat-config 에서 직접 등록할 때는 `plugins: { "@simplysm": plugin }` 로 매핑 후 `"@simplysm/<id>"` 로 켬. 각 규칙의 검사 대상·옵션·autofix·메시지는 [rules.md](./rules.md) 참조.
