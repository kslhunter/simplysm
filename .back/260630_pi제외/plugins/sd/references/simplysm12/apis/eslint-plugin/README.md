# @simplysm/eslint-plugin

심플리즘 워크스페이스 전용 ESLint 9 플랫 설정(`configs.root`)과 커스텀 규칙 9종을 제공하는 ESLint 플러그인. `eslint.config.js` 에서 import 해 사용한다.

## 사용 트리거 인덱스

- **`configs.root`** — 워크스페이스 루트 `eslint.config.js` 를 구성할 때. js/ts/html/vitest 대상별 규칙·플러그인이 묶인 플랫 설정 배열.
- **`@simplysm/no-subpath-imports-from-simplysm`** — `@simplysm/*` 패키지를 `/src` 하위 경로로 import 하는 실수를 막을 때 (js/ts).
- **`@simplysm/no-hard-private`** — ECMAScript `#` private 대신 TS `private _` 스타일을 강제할 때 (js/ts, 자동수정).
- **`@simplysm/ts-no-unused-injects`** — Angular `inject()` 필드 미사용을 잡을 때 (ts, 자동수정).
- **`@simplysm/ts-no-unused-protected-readonly`** — `@Component` 의 `protected readonly` 필드가 클래스/템플릿 어디서도 안 쓰일 때 (ts, 자동수정).
- **`@simplysm/ts-no-throw-not-implement-error`** — `throw new NotImplementError()` 잔존 코드를 경고할 때 (ts).
- **`@simplysm/ts-no-buffer-in-typedarray-context`** — `Buffer` 를 TypedArray 자리에 직접 대입하는 코드를 막을 때 (ts).
- **`@simplysm/ts-no-exported-types`** — 특정 타입이 export/public 멤버로 노출되는 것을 막고 대체 타입을 안내할 때 (ts, opt-in. root 설정엔 비활성).
- **`@simplysm/ng-template-no-todo-comments`** — HTML 템플릿의 `<!-- TODO: -->` 주석을 경고할 때.
- **`@simplysm/ng-template-sd-require-binding-attrs`** — `sd-*` 컴포넌트에 화이트리스트 외 plain attribute 사용을 막고 property binding 으로 자동 전환할 때 (html, 자동수정).

## 엔트리 export

`src/index.js` 의 default export: `{ configs: { root } }`.
규칙은 플러그인 객체(`src/plugin.js`, `{ rules: { ... } }`)에 모여 있고 `root` 설정 안에서 `@simplysm/<규칙명>` 으로 등록된다. 규칙을 개별 import 하는 공개 진입점은 없으며, 사용은 `configs.root` 또는 그 안에서 활성화된 규칙명을 통한다.

## configs.root

`root` = 플랫 설정 객체 배열. 정의: `src/configs/root.js`. `process.cwd()` 를 워크스페이스 루트로 보고 `packages/*/package.json` 이 있는 디렉토리를 모아 `allPackageDirs` 를 만든다(vitest 설정의 `packageDir` 에 사용). 배열 순서대로의 항목:

- **ignores** — `**/node_modules/`, `**/dist/`, `**/tests/`, `**/.*/`(점 디렉토리), `**/_*/`(언더스코어 디렉토리)를 전 규칙에서 제외.
- **languageOptions(전역)** — globals 에 `node`+`es2021`+`browser` 병합, `ecmaVersion: 2022`, `sourceType: "module"`.
- **`**/*.js`, `**/*.jsx`** — plugins: `import`, `@simplysm`, `unused-imports`. 주요 규칙: `no-console`(warn), `no-warning-comments`(warn), `eqeqeq`(always, `null` 비교는 예외), `require-await`, `no-shadow`, `no-duplicate-imports`, `no-unused-expressions`, `no-undef`, `unused-imports/no-unused-imports`, `unused-imports/no-unused-vars`(`^_` 접두 변수·인자 무시), `import/no-extraneous-dependencies`(devDeps 예외: `*.spec.js`/`lib/**`/`eslint.config.js`/`simplysm.js`/`vitest.config.js`), `@simplysm/no-subpath-imports-from-simplysm`(error), `@simplysm/no-hard-private`(error).
- **`**/*.ts`, `**/*.tsx`** — plugins: `@typescript-eslint`, `@simplysm`, `@angular-eslint`, `import`, `unused-imports`. processor `ngeslint.processInlineTemplates`(인라인 템플릿 추출), parser `tseslint.parser`, `parserOptions.project: true`(타입 정보 필요 규칙용). 활성 `@simplysm` 규칙: `ts-no-throw-not-implement-error`(warn), `no-subpath-imports-from-simplysm`(error), `no-hard-private`(error), `ts-no-unused-injects`(error), `ts-no-unused-protected-readonly`(error). 그 밖에 `@typescript-eslint/*`(require-await, await-thenable, return-await=always, no-floating-promises, no-shadow, no-unnecessary-condition[allowConstantLoopConditions], no-unnecessary-type-assertion, non-nullable-type-assertion-style, prefer-reduce-type-parameter, prefer-return-this-type, typedef, no-unused-expressions, strict-boolean-expressions[allowNullableBoolean·allowNullableObject], prefer-ts-expect-error, prefer-readonly), `unused-imports/*`, `import/no-extraneous-dependencies`(devDeps 예외: `*.spec.ts`/`vitest.config.ts`). `ts-no-exported-types`·`ts-no-buffer-in-typedarray-context`·`no-restricted-imports` 블록은 소스에서 주석 처리되어 root 에서는 비활성.
- **`**/*.html`** — parser `ngeslint.templateParser`, plugin `@simplysm`. 규칙: `ng-template-no-todo-comments`(warn), `ng-template-sd-require-binding-attrs`(error).
- **`**/vitest.config.*`** — plugin `import`. `import/no-extraneous-dependencies`(`devDependencies: true`, `packageDir: allPackageDirs` — 루트+모든 `packages/*` 의 deps 를 dev 로 허용).

## 규칙: import 위생

### `@simplysm/no-subpath-imports-from-simplysm`
type `problem`. 옵션 없음. `@simplysm/` 로 시작하는 `import` 의 경로를 `/` 로 분할해 3번째 조각이 `src` 면 보고.
- 금지: `@simplysm/pkg/src`, `@simplysm/pkg/src/x`. 허용: `@simplysm/pkg`, `@simplysm/pkg/x`, `@simplysm/pkg/x/y`.
- 메시지에 `pkg`(2번째 조각), `importPath`(원본 경로) 삽입. 자동수정 없음.

## 규칙: TypeScript private/멤버 위생

### `@simplysm/no-hard-private`
type `problem`, `fixable: "code"`. 옵션 없음. ECMAScript hard private(`#`)을 TS `private _` 로 강제.
- 선언부(`PropertyDefinition`/`MethodDefinition` 의 `PrivateIdentifier`): `#a` → `_a` 로 개명하고, 접근제어자가 없으면 `private ` 삽입. 데코레이터가 있으면 마지막 데코레이터 다음 토큰(즉 `static`/`async`/`readonly`/이름) 앞에 삽입해 `@Deco private static _foo` 순서 유지.
- 사용부(`MemberExpression > PrivateIdentifier`, 예 `this.#field`): `#field` → `_field` 로 개명만.
- 메시지 `preferSoftPrivate`.

### `@simplysm/ts-no-unused-injects`
type `problem`, `fixable: "code"`. 옵션 없음. Angular `inject()` 로 초기화된 클래스 필드 중 미사용 보고.
- 대상: `PropertyDefinition` 이고 값이 `inject(...)` 호출이며 키가 식별자인 필드.
- 판정: 클래스 본문 전체를 순회해 같은 이름 식별자가 선언부 키 외에 한 번도 없으면 미사용. (참조 카운트만 보므로 동명 식별자가 있으면 오탐 가능)
- fix: 선언 앞 토큰 끝~필드 끝 범위 제거(앞 공백/개행 포함). 메시지 `unusedInject`(`name` 삽입).

### `@simplysm/ts-no-unused-protected-readonly`
type `problem`, `fixable: "code"`. 옵션 없음. `@Component` 클래스의 `protected readonly` 필드가 클래스·템플릿 어디서도 안 쓰이면 보고.
- 적용 조건: 클래스에 `Component(...)` 데코레이터가 있고 그 첫 인자 객체에 `template` 속성(TemplateLiteral 또는 문자열 리터럴)이 있을 때만. `templateUrl` 만 있고 인라인 `template` 이 없으면 검사 안 함.
- 대상 필드: `accessibility === "protected"` && `readonly === true` && static 아님 && 키가 식별자.
- 판정: 템플릿 텍스트에 `(?<![\w$])이름(?![\w$])` 매칭(`$`-시작 식별자 대응) 없음 AND 클래스 내 타 멤버에서 동명 식별자 참조 없음 → 미사용.
- fix: 필드 앞 줄바꿈/들여쓰기와 뒤 `;`+개행까지 포함해 제거. 메시지 `unusedField`(`name` 삽입).

## 규칙: 타입/런타임 안전성

### `@simplysm/ts-no-throw-not-implement-error`
type `suggestion`. 옵션 없음. 타입 정보 사용(parserServices 필요). `throw <expr>` 의 throw 인자 타입 심볼명이 `NotImplementError` 면 보고.
- 인자 타입 해석: Identifier/CallExpression/NewExpression/MemberExpression 은 직접 타입, Assignment 는 우변, Sequence 는 마지막 식, Logical/Conditional 은 좌/consequent 우선 후 우/alternate. `await`/`yield` 인자는 검사 제외.
- `throw new NotImplementError("메시지")` 처럼 NewExpression 첫 인자가 리터럴이면 그 값을 메시지로, 아니면 기본 `"구현되어있지 않습니다"`. 자동수정 없음(root 에서 warn).

### `@simplysm/ts-no-buffer-in-typedarray-context`
type `problem`. 옵션 없음. 타입 정보 사용. 값의 실제 타입이 `Buffer` 인데 기대 타입이 TypedArray(`Uint8Array`/`Uint8ClampedArray`/`Int8Array`/`Uint16Array`/`Int16Array`/`Uint32Array`/`Int32Array`/`Float32Array`/`Float64Array`)면 보고.
- 검사 위치: 변수 선언 초기화, 대입(좌변이 Identifier 일 때), `return`(contextual type), 함수 호출 인자(시그니처 파라미터 타입), 객체 `Property` 값, 배열 요소(SpreadElement 제외), 삼항의 consequent/alternate.
- 예외: 조상 중 `Buffer.xxx(...)` 정적 메서드 호출 안의 인자는 검사 제외. 메시지 `directBuffer`(`expected` = 기대 TypedArray 명). 자동수정 없음. (root 에서는 비활성, 직접 켜야 함)

### `@simplysm/ts-no-exported-types`
type `problem`. 타입 정보 사용. `types` 옵션으로 지정한 타입이 export 함수/변수, public 클래스 멤버에 노출되면 보고. **root 설정에는 주석 처리되어 비활성** — 쓰려면 직접 옵션과 함께 활성화.
- 옵션: `{ types: { ban: string; safe?: string; ignoreInGeneric?: boolean }[] }`(`types` 필수). `ban` = 금지 타입명, `safe` = 메시지에 안내할 대체 타입(없으면 안내 생략), `ignoreInGeneric` = `true` 면 제네릭 타입 인자로 등장한 경우 무시(예 `Array<금지타입>` 허용). `defaultOptions: [{ types: [] }]`.
- 검사 대상: `export` 된 `FunctionDeclaration`(반환타입+각 파라미터), public `MethodDefinition`(constructor 는 파라미터만, 그 외 반환+파라미터; private/protected 제외), public `PropertyDefinition`, `export` 된 `VariableDeclarator`(타입 주석 우선, 없으면 초기값 타입).
- 타입 매칭은 재귀: alias/symbol 이름이 ban 목록과 일치하는지 보고, alias 타입 인자·참조 타입 인자·유니온/인터섹션 멤버·number index 타입까지 순회. 메시지 `noExportedTypes`(`typeName`, `safeSuggestion`).

## 규칙: Angular 템플릿(HTML)

### `@simplysm/ng-template-no-todo-comments`
type `problem`. 옵션 없음. 소스 텍스트에서 `<!-- ... -->` 주석을 정규식으로 훑어 `TODO:`(대문자 정확 일치) 가 포함되면 보고.
- 보고 위치는 주석 전체 범위, 메시지(`content`)는 `TODO:` 뒤 텍스트를 trim 한 값. 자동수정 없음(root 에서 warn).

### `@simplysm/ng-template-sd-require-binding-attrs`
type `problem`, `fixable: "code"`. `sd-*`(접두사) 컴포넌트 엘리먼트에 화이트리스트 외 plain attribute 사용을 금지하고 property binding 으로 자동 전환.
- 옵션 `{ selectorPrefixes?: string[]; allowAttributes?: string[]; allowAttributePrefixes?: string[] }`. 기본값:
  - `selectorPrefixes: ["sd-"]` — 검사 대상 엘리먼트 태그명 접두(소문자 비교).
  - `allowAttributes: ["id","class","style","title","tabindex","role"]` — plain 으로 허용할 정확한 속성명(소문자 비교).
  - `allowAttributePrefixes: ["aria-","data-","sd-"]` — plain 으로 허용할 속성명 접두.
  - (옵션 객체를 주면 지정한 키만 기본값을 덮어씀)
- 보고: 대상 엘리먼트의 plain attribute 가 화이트리스트(정확명 또는 접두)에 없으면 보고. 메시지 `requireBindingForAttribute`(`attrName`, `elementName`).
- fix: 값이 빈 속성 `bbb` → `[bbb]="true"`; 값 있는 `aaa="bbb"` → `[aaa]="'bbb'"`(값의 `\`·`'` 이스케이프). sourceSpan offset 이 비정상이면 fix 미적용.
