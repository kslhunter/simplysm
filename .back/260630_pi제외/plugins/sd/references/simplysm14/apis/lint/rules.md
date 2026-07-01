# @simplysm/lint — rules

`@simplysm/lint/eslint-plugin` default export 가 노출하는 커스텀 ESLint 규칙 묶음. `@simplysm/<rule-id>` 로 켜는 규칙의 검사 대상·옵션·autofix 를 확인할 때 같이 읽는다.

## plugin default export

```ts
export default {
  rules: {
    "ng-no-async-effect": RuleModule;
    "ng-template-no-strict-null-check": RuleModule;
    "ng-template-no-todo-comments": RuleModule;
    "ng-template-sd-require-binding-attrs": RuleModule;
    "no-hard-private": RuleModule;
    "no-subpath-imports-from-simplysm": RuleModule;
    "ts-no-throw-not-implemented-error": RuleModule;
    "ts-no-unused-injects": RuleModule;
    "ts-no-unused-protected-readonly": RuleModule;
  };
}
```

- `rules` — 규칙 id 를 규칙 객체로 매핑한다. `eslint-plugin.ts` 가 각 rule 파일의 default export 를 그대로 이 필드 아래에 둔다.

## ng-no-async-effect

Angular `effect()` 에 async 콜백을 직접 넘기는 호출을 보고한다. 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ng-no-async-effect"
Options: []
Message ids: "noAsyncEffect"
Autofix: 없음
```

- `Options: []` — `schema: []`, `defaultOptions: []`; 설정 옵션을 받지 않는다.
- `noAsyncEffect` — `effect()` async 콜백 금지 메시지. `await` 이후 signal read 가 의존성으로 추적되지 않고 비동기 작업은 `void untracked(async () => { ... })` 내부에서 수행하라고 보고한다.
- 검사 대상 — `@angular/core` 에서 온 `effect` named import, alias import, namespace import(`*.effect`)만 대상이다. 첫 번째 인자가 async `ArrowFunctionExpression` 또는 async `FunctionExpression` 이면 보고한다.
- 제외 — 다른 모듈에서 온 `effect`, 로컬 선언 `effect`, 첫 인자 없음, 비-async 콜백은 보고하지 않는다.

## ng-template-no-strict-null-check

Angular 템플릿에서 nil 값과의 엄격 비교를 보고한다. 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ng-template-no-strict-null-check"
Options: []
Message ids: "noStrictNullCheck"
Autofix: 없음
```

- `Options: []` — `schema: []`, `defaultOptions: []`; 설정 옵션을 받지 않는다.
- `noStrictNullCheck` — 실제 표현식(`actual`)과 대체 표현식(`replacement`)을 넣어 보고한다.
- `actual: string` — 템플릿 원문에서 nil 이 아닌 쪽, 연산자, nil 쪽을 이어 만든 위반 표현식이다.
- `replacement: string` — `===` 는 `==`, `!==` 는 `!=` 로 바꾸고 nil 쪽은 `null` 로 통일한 표현식이다.
- 검사 대상 — Angular template `Binary` 노드의 `operation` 이 `"==="|"!=="` 이고 좌우 중 하나의 `value` 가 `null` 또는 `undefined` 인 경우다.
- 제외 — `==`/`!=` 비교, nil 이 없는 `===`/`!==` 비교는 보고하지 않는다.

## ng-template-no-todo-comments

HTML 템플릿 원문 주석 안의 `TODO:` 를 보고한다. 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ng-template-no-todo-comments"
Options: []
Message ids: "noTodo"
Autofix: 없음
```

- `Options: []` — `schema: []`, `defaultOptions: []`; 설정 옵션을 받지 않는다.
- `noTodo` — `TODO:` 뒤 텍스트를 trim 한 `content` 값을 그대로 메시지로 보고한다.
- `content: string` — HTML 주석 본문에서 `TODO:` 다음에 있는 내용이다.
- 검사 대상 — source text 전체에서 `/<!--([\s\S]*?)-->/g` 로 찾은 HTML 주석 중 `TODO:` 를 포함한 주석이다.
- 제외 — HTML 주석이 아니거나 `TODO:` 문자열이 없는 주석은 보고하지 않는다.

## ng-template-sd-require-binding-attrs

지정 접두사 컴포넌트의 허용되지 않은 plain attribute 를 Angular property binding 으로 바꾸도록 보고한다. 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ng-template-sd-require-binding-attrs"
Options: [RuleOptions?]
interface RuleOptions {
  selectorPrefixes?: string[];
  allowAttributes?: string[];
  allowAttributePrefixes?: string[];
}
Message ids: "requireBindingForAttribute"
Autofix: code
```

- `selectorPrefixes?: string[]` — 검사 대상 element tag prefix 목록. 미지정 시 `["sd-"]`; tag 이름을 소문자로 바꾼 뒤 각 prefix 의 소문자 값으로 `startsWith` 비교한다.
- `allowAttributes?: string[]` — plain attribute 로 허용할 정확한 attribute 이름 목록. 미지정 시 `["id", "class", "style", "title", "tabindex", "role"]`; attribute 이름을 소문자로 바꿔 Set exact match 로 검사한다.
- `allowAttributePrefixes?: string[]` — plain attribute 로 허용할 attribute prefix 목록. 미지정 시 `["aria-", "data-", "sd-"]`; attribute 이름을 소문자로 바꾼 뒤 prefix 소문자 값으로 `startsWith` 비교한다.
- `additionalProperties: false` — 위 3개 외 option key 는 schema 에서 허용하지 않는다.
- `requireBindingForAttribute` — `attrName` 과 `elementName` 을 넣어 plain attribute 불가 및 `[attrName]="…"` 사용을 보고한다.
- `attrName: string` — 위반한 plain attribute 이름이다.
- `elementName: string` — 위반 attribute 가 붙은 element tag 이름이다.
- 검사 대상 — 대상 prefix 로 시작하는 Angular template `Element` 의 `attributes` 중 허용 exact 이름·허용 prefix 어디에도 걸리지 않는 plain attribute 다.
- Autofix — attribute 값이 빈 문자열이면 `[attr]="true"` 로, 값이 있으면 `\` 와 `'` 를 escape 한 뒤 `[attr]="'값'"` 로 치환한다. source span 의 `start >= end` 이면 fix 를 반환하지 않는다.

## no-hard-private

ECMAScript private identifier(`#`) 선언·접근을 보고하고 TypeScript `private _` 형태로 고치도록 한다.

```ts
Rule id: "@simplysm/no-hard-private"
Options: []
Message ids: "preferSoftPrivate" | "nameConflict"
Autofix: code
```

- `Options: []` — `schema: []`, `defaultOptions: []`; 설정 옵션을 받지 않는다.
- `preferSoftPrivate` — hard private(`#`) 대신 `private _` 스타일을 쓰라고 보고한다.
- `nameConflict` — `#name` 을 `_name` 으로 바꾸려 할 때 같은 클래스 body 에 `_name` 멤버가 이미 있으면 보고한다.
- `name: string` — `nameConflict` 메시지에 들어가는 private identifier 이름이며 `#` 문자는 제외된다.
- 검사 대상 — class field, method, accessor 의 `PrivateIdentifier` 선언과 member expression 안의 `PrivateIdentifier` 접근이다.
- Autofix — 선언은 `#x` 를 `_x` 로 바꾸고 접근 제어자가 없으면 첫 토큰 앞에 `private ` 를 삽입한다. decorator 가 있으면 마지막 decorator 다음 토큰 앞에 삽입한다. 접근은 `#x` 를 `_x` 로 바꾼다. 이름 충돌 또는 삽입 토큰 계산 실패 시 선언 fix 는 반환하지 않는다.

## no-subpath-imports-from-simplysm

`@simplysm/*/src` 하위 경로 import·re-export 를 보고하고 패키지 루트 경로로 고친다.

```ts
Rule id: "@simplysm/no-subpath-imports-from-simplysm"
Options: []
Message ids: "noSubpathImport"
Autofix: code
```

- `Options: []` — `schema: []`, `defaultOptions: []`; 설정 옵션을 받지 않는다.
- `noSubpathImport` — `pkg` 와 `importPath` 를 넣어 `@simplysm/<pkg>` 의 `src` 하위 경로 import 불가를 보고한다.
- `pkg: string` — import path 를 `/` 로 나눴을 때 두 번째 segment 인 패키지 짧은 이름이다.
- `importPath: string` — 위반한 전체 import source 문자열이다.
- 검사 대상 — `ImportDeclaration`, string literal `ImportExpression`, source 가 있는 `ExportNamedDeclaration`, `ExportAllDeclaration` 의 source 값이 `@simplysm/` 로 시작하고 세 번째 segment 가 `src` 인 경우다.
- 제외 — `@simplysm/<pkg>` 루트, 세 번째 segment 가 `src` 가 아닌 subpath, `@simplysm/` 로 시작하지 않는 경로, string literal 이 아닌 dynamic import source 는 보고하지 않는다.
- Autofix — source literal 을 `@simplysm/<pkg>` 로 바꾸고 원래 quote 문자를 유지한다.

## ts-no-throw-not-implemented-error

`@simplysm/core-common` 에서 import 한 `NotImplementedError` 생성자를 `new` 로 호출하면 보고한다.

```ts
Rule id: "@simplysm/ts-no-throw-not-implemented-error"
Options: []
Message ids: "noThrowNotImplementedError"
Autofix: 없음
```

- `Options: []` — `schema: []`, `defaultOptions: []`; 설정 옵션을 받지 않는다.
- `noThrowNotImplementedError` — `text` 를 메시지 본문으로 보고한다.
- `text: string` — 첫 번째 생성자 인자가 비어 있지 않은 string literal 이면 그 값이고, 그 외에는 `"미구현"` 이다.
- 검사 대상 — `@simplysm/core-common` 에서 온 named/alias `NotImplementedError` 의 `new` 호출과 namespace import 의 `.NotImplementedError` `new` 호출이다.
- 제외 — 다른 모듈 동명 식별자, 로컬 선언, namespace 가 아닌 member expression, dynamic import 는 보고하지 않는다.

## ts-no-unused-injects

클래스 안에서 `inject()` 호출로 초기화했지만 같은 클래스에서 다시 참조되지 않는 필드를 보고한다. 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ts-no-unused-injects"
Options: []
Message ids: "unusedInject"
Autofix: code
```

- `Options: []` — `schema: []`, `defaultOptions: []`; 설정 옵션을 받지 않는다.
- `unusedInject` — 미사용 inject field 이름 `name` 을 넣어 보고한다.
- `name: string` — `inject()` 로 초기화된 class property 의 identifier 이름이다.
- 검사 대상 — `ClassBody` 안의 `PropertyDefinition` 중 value 가 callee 이름 `inject` 인 call expression 이고 key 가 identifier 인 필드다. 같은 class body 전체를 순회해 key 자신 외 동일 identifier 참조가 0개면 보고한다.
- 제외 — key 가 identifier 가 아닌 필드, `inject` 라는 identifier call 이 아닌 초기화, 같은 class body 내부에 동일 이름 identifier 가 있는 필드는 보고하지 않는다.
- Autofix — 해당 field 를 앞 token 끝부터 field 끝까지 제거한다.

## ts-no-unused-protected-readonly

Angular `@Component` 인라인 템플릿과 클래스 본문에서 모두 참조되지 않는 `protected readonly` 필드를 보고한다. 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ts-no-unused-protected-readonly"
Options: []
Message ids: "unusedField"
Autofix: code
```

- `Options: []` — `schema: []`, `defaultOptions: []`; 설정 옵션을 받지 않는다.
- `unusedField` — 미사용 `protected readonly` field 이름 `name` 을 넣어 보고한다.
- `name: string` — report 된 class property 의 identifier 이름이다.
- 검사 대상 — `@Component(...)` decorator 가 있고 첫 번째 인자 object 에 비어 있지 않은 string literal 또는 template literal `template` property 가 있는 class 의 non-static `protected readonly` identifier property 다.
- 템플릿 참조 수집 — `parseTemplate` 결과에서 `ImplicitReceiver` 또는 `ThisReceiver` 의 `PropertyRead` 이름을 수집한다. 구조 directive variables, `@let`, `@if` expressionAlias, `@for` item/context variables 는 로컬로 취급해 제외한다. inputs, outputs, templateAttrs, `@if`, `@switch`, `@for`, `@defer` 관련 expression 을 순회한다.
- 클래스 참조 수집 — 같은 class body 의 다른 member AST 를 재귀 순회해 field 이름 identifier 가 있는지 확인한다.
- 제외 — `@Component` 가 아닌 class, `template` property 가 없는 class, 비어 있는 template, `templateUrl`, static field, `protected readonly` 가 아닌 field, 템플릿 또는 다른 class member 에서 참조되는 field 는 보고하지 않는다.
- Autofix — field 선언을 앞 들여쓰기와 뒤 `;`/개행 범위까지 제거한다.
