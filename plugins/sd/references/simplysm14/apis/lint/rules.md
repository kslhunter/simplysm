# @simplysm/lint — rules

`@simplysm/lint/eslint-plugin` default export 가 노출하는 커스텀 ESLint 규칙 9종. `@simplysm/<id>` 로 켜는 규칙의 검사 대상·옵션(schema)·메시지·autofix 를 확인할 때 읽는다. 규칙 id 는 plugin namespace `@simplysm` 아래에 등록되어 실제 설정명은 `@simplysm/<id>` 다.

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

- `rules` — 규칙 id → 규칙 객체 매핑. 각 규칙은 `ESLintUtils.RuleCreator`(`createRule`) 로 생성되며 문서 URL 이 자동 부여된다.

---

## ng-no-async-effect

Angular `effect()` 에 async 콜백을 직접 넘기는 호출을 보고한다(`meta.type: "problem"`). 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ng-no-async-effect"
Options: []   // schema: [], defaultOptions: []
Message ids: "noAsyncEffect"
Autofix: 없음
```

- `Options: []` — 설정 옵션을 받지 않는다.
- `noAsyncEffect` — `effect()` 에 async 콜백을 넘기지 말라는 메시지. `await` 이후 signal read 는 의존성으로 추적되지 않으니 비동기 작업은 `void untracked(async () => { ... })` 안에서 수행하라고 안내한다.
- 검사 대상 — `@angular/core` 에서 import 한 `effect` 의 호출만 대상. named import(`effect`), aliased import(`effect as ngEffect`), namespace import(`ns.effect(...)`) 를 scope·import 정의로 추적해 식별한다. 첫 번째 인자가 `async` 인 `ArrowFunctionExpression` 또는 `FunctionExpression` 이면 그 인자 위치에 보고한다.
- 제외 — 다른 모듈에서 온 `effect`, 로컬 선언 `effect`, 첫 인자가 없거나 non-async 콜백인 경우는 보고하지 않는다.

## ng-template-no-strict-null-check

Angular 템플릿에서 nil(`null`/`undefined`) 과의 엄격 비교(`===`/`!==`)를 보고하고 `==`/`!=` 로 통일하도록 한다(`meta.type: "problem"`). 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ng-template-no-strict-null-check"
Options: []   // schema: [], defaultOptions: []
Message ids: "noStrictNullCheck"
Autofix: 없음   // 인라인 템플릿 offset 매핑 문제로 미제공
```

- `Options: []` — 설정 옵션을 받지 않는다.
- `noStrictNullCheck` — 위반 표현식(`actual`)과 권장 대체(`replacement`)를 넣어 보고한다.
- `actual: string` — 템플릿 원문에서 `nil 아닌 쪽 + 연산자 + nil 쪽` 을 이어 만든 위반 표현식.
- `replacement: string` — `===`→`==`, `!==`→`!=` 로 바꾸고 nil 쪽을 `null` 로 통일한 표현식.
- 검사 대상 — Angular template `Binary` 노드 중 `operation` 이 `"==="` 또는 `"!=="` 이고 좌·우 중 한쪽의 `value` 가 `null`/`undefined`(즉 `== null`) 인 경우.
- 제외 — `==`/`!=` 비교, nil 이 없는 `===`/`!==` 비교.

## ng-template-no-todo-comments

HTML 템플릿 원문 주석(`<!-- ... -->`) 안의 `TODO:` 를 경고한다(`meta.type: "problem"`). 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ng-template-no-todo-comments"
Options: []   // schema: [], defaultOptions: []
Message ids: "noTodo"
Autofix: 없음
```

- `Options: []` — 설정 옵션을 받지 않는다.
- `noTodo` — `TODO:` 뒤 텍스트를 trim 한 `content` 값을 메시지 본문으로 그대로 보고한다.
- `content: string` — HTML 주석 본문에서 `TODO:` 다음에 오는 내용.
- 검사 대상 — source text 전체를 정규식 `/<!--([\s\S]*?)-->/g` 로 훑어 찾은 HTML 주석 중 `TODO:` 를 포함한 주석. AST 방문자 없이 raw text 스캔으로 동작하므로 `create` 는 빈 객체를 반환한다.
- 제외 — HTML 주석이 아니거나 `TODO:` 문자열이 없는 주석.

## ng-template-sd-require-binding-attrs

지정 접두사 컴포넌트(기본 `sd-*`)의 허용되지 않은 plain attribute 를 Angular property binding 으로 바꾸도록 보고하고 autofix 한다(`meta.type: "problem"`). 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ng-template-sd-require-binding-attrs"
Options: [RuleOptions?]   // defaultOptions: [{}]
interface RuleOptions {
  selectorPrefixes?: string[];
  allowAttributes?: string[];
  allowAttributePrefixes?: string[];
}
Message ids: "requireBindingForAttribute"
Autofix: code
```

- `selectorPrefixes?: string[]` — 검사 대상 element tag 접두사 목록. 미지정 시 `["sd-"]`. tag 이름을 소문자로 바꾼 뒤 각 prefix 소문자값으로 `startsWith` 비교한다.
- `allowAttributes?: string[]` — plain attribute 로 허용할 정확한 이름 목록. 미지정 시 `["id", "class", "style", "title", "tabindex", "role"]`. attribute 이름을 소문자로 바꿔 Set exact match 로 검사한다.
- `allowAttributePrefixes?: string[]` — plain attribute 로 허용할 접두사 목록. 미지정 시 `["aria-", "data-", "sd-"]`. attribute 이름을 소문자로 바꾼 뒤 prefix 소문자값으로 `startsWith` 비교한다.
- `additionalProperties: false` — schema 가 위 3개 외 option key 를 허용하지 않는다.
- `requireBindingForAttribute` — `attrName`·`elementName` 을 넣어 plain attribute 불가 및 `[attrName]="…"` 사용을 보고한다.
- `attrName: string` — 위반한 plain attribute 이름.
- `elementName: string` — 위반 attribute 가 붙은 element tag 이름.
- 검사 대상 — 대상 접두사로 시작하는 Angular template `Element` 의 `attributes` 중 허용 exact 이름·허용 접두사 어디에도 걸리지 않는 plain attribute.
- Autofix — 값이 빈 문자열이면 `[attr]="true"` 로, 값이 있으면 `\` 와 `'` 를 escape 한 뒤 `[attr]="'값'"` 으로 치환한다. source span 의 `start >= end` 면 fix 를 반환하지 않는다.

## no-hard-private

ECMAScript private identifier(`#`) 선언·접근을 보고하고 TypeScript `private _` 형태로 고친다(`meta.type: "problem"`).

```ts
Rule id: "@simplysm/no-hard-private"
Options: []   // schema: [], defaultOptions: []
Message ids: "preferSoftPrivate" | "nameConflict"
Autofix: code
```

- `Options: []` — 설정 옵션을 받지 않는다.
- `preferSoftPrivate` — hard private(`#`) 대신 `private _` 스타일을 쓰라고 보고한다.
- `nameConflict` — `#name` 을 `_name` 으로 바꾸려는데 같은 클래스 body 에 `_name` 멤버가 이미 있으면 보고한다(이 경우 autofix 없음).
- `name: string` — `nameConflict` 메시지에 들어가는 private identifier 이름(`#` 제외).
- 검사 대상 — class field/method/accessor 의 `PrivateIdentifier` 선언, 그리고 member expression(`this.#x`, `other.#x`, `Cls.#x`) 안의 `PrivateIdentifier` 접근.
- Autofix — 선언은 `#x`→`_x` 로 바꾸고, 접근 제어자가 없으면 첫 토큰(`static`/`async`/`readonly`/`accessor`/이름) 앞에 `private ` 를 삽입한다(데코레이터가 있으면 마지막 데코레이터 다음 토큰 앞). 접근은 `#x`→`_x`. `nameConflict` 또는 삽입 토큰 계산 실패 시 선언 fix 는 비워 반환한다. 중첩/클래스식 클래스도 `ClassBody` 스택으로 지원한다.

## no-subpath-imports-from-simplysm

`@simplysm/*/src` 하위 경로 import·동적 import·re-export 를 보고하고 패키지 루트 경로로 고친다(`meta.type: "problem"`).

```ts
Rule id: "@simplysm/no-subpath-imports-from-simplysm"
Options: []   // schema: [], defaultOptions: []
Message ids: "noSubpathImport"
Autofix: code
```

- `Options: []` — 설정 옵션을 받지 않는다.
- `noSubpathImport` — `pkg`·`importPath` 를 넣어 `@simplysm/<pkg>` 의 `src` 하위 경로 import 불가를 보고한다.
- `pkg: string` — import path 를 `/` 로 나눈 두 번째 segment(패키지 짧은 이름).
- `importPath: string` — 위반한 전체 import source 문자열.
- 검사 대상 — `ImportDeclaration`, string literal `ImportExpression`(동적 import), source 가 있는 `ExportNamedDeclaration`, `ExportAllDeclaration` 의 source 값이 `@simplysm/` 로 시작하고 `/` 분할 segment 3개 이상이며 세 번째 segment 가 `src` 인 경우.
- 제외 — `@simplysm/<pkg>` 루트나 `src` 가 아닌 subpath, `@simplysm/` 로 시작하지 않는 경로, string literal 이 아닌 동적 import source.
- Autofix — source literal 을 `@simplysm/<pkg>` 로 바꾸고 원래 quote 문자를 유지한다.

## ts-no-throw-not-implemented-error

`@simplysm/core-common` 에서 import 한 `NotImplementedError` 생성자를 `new` 로 호출하면 경고해 미구현 코드가 프로덕션에 남는 것을 막는다(`meta.type: "suggestion"`).

```ts
Rule id: "@simplysm/ts-no-throw-not-implemented-error"
Options: []   // schema: [], defaultOptions: []
Message ids: "noThrowNotImplementedError"
Autofix: 없음
```

- `Options: []` — 설정 옵션을 받지 않는다.
- `noThrowNotImplementedError` — `text` 를 메시지 본문으로 보고한다.
- `text: string` — 첫 번째 생성자 인자가 비어 있지 않은 string literal 이면 그 값, 아니면 `"미구현"`.
- 검사 대상 — `@simplysm/core-common` 에서 온 named/aliased `NotImplementedError` 의 `new` 호출, 그리고 namespace import 의 `new ns.NotImplementedError()`. import 정의를 scope 로 추적해 식별한다.
- 제외 — 다른 모듈 동명 식별자, 로컬 선언, namespace 가 아닌 member expression, 동적 import.

## ts-no-unused-injects

클래스 안에서 `inject()` 호출로 초기화했지만 같은 클래스에서 다시 참조되지 않는 필드를 보고하고 제거한다(`meta.type: "problem"`). 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ts-no-unused-injects"
Options: []   // schema: [], defaultOptions: []
Message ids: "unusedInject"
Autofix: code
```

- `Options: []` — 설정 옵션을 받지 않는다.
- `unusedInject` — 미사용 inject 필드 이름 `name` 을 넣어 보고한다.
- `name: string` — `inject()` 로 초기화된 class property 의 identifier 이름.
- 검사 대상 — `ClassBody` 안의 `PropertyDefinition` 중 value 가 callee 이름 `inject` 인 call expression 이고 key 가 identifier 인 필드. 같은 class body 전체를 재귀 순회해 key 자신 외 동일 identifier 참조가 0개면 보고한다.
- 제외 — key 가 identifier 가 아닌 필드, `inject` 호출이 아닌 초기화, 같은 class body 내부에 동일 이름 identifier 참조가 있는 필드.
- Autofix — 앞 토큰 끝부터 field 끝까지 제거한다.

## ts-no-unused-protected-readonly

Angular `@Component` 의 인라인 템플릿과 클래스 본문 어디에서도 참조되지 않는 `protected readonly` 필드를 보고하고 제거한다(`meta.type: "problem"`). 사용법: [client-rules.md](../../manuals/client-rules.md)

```ts
Rule id: "@simplysm/ts-no-unused-protected-readonly"
Options: []   // schema: [], defaultOptions: []
Message ids: "unusedField"
Autofix: code
```

- `Options: []` — 설정 옵션을 받지 않는다.
- `unusedField` — 미사용 `protected readonly` 필드 이름 `name` 을 넣어 보고한다.
- `name: string` — 보고된 class property 의 identifier 이름.
- 검사 대상 — `@Component(...)` decorator 가 있고 첫 인자 object 에 비어 있지 않은 string/template literal `template` property 가 있는 class 의, non-static `protected readonly` identifier property.
- 템플릿 참조 수집 — `@angular/compiler` 의 `parseTemplate` 결과에서 `ImplicitReceiver`/`ThisReceiver` 위의 `PropertyRead` 이름을 모은다. 구조 디렉티브 variables, `@let`, `@if` expressionAlias, `@for` item/contextVariables 는 로컬 스코프로 취급해 제외한다. interpolation·BoundAttribute(inputs)·BoundEvent(outputs)·templateAttrs 와 `@if`/`@switch`/`@for`(iterable·trackBy·@empty)/`@defer`(트리거·@placeholder/@loading/@error) 표현식을 순회한다.
- 클래스 참조 수집 — 같은 class body 의 다른 member AST 를 재귀 순회해 필드 이름 identifier 가 쓰이는지 확인한다.
- 제외 — `@Component` 가 아닌 class, `template` 없는 class(`templateUrl` 포함), 빈 template, static 필드, `protected readonly` 가 아닌 필드, 템플릿이나 다른 class member 에서 참조되는 필드.
- Autofix — 필드 선언을 앞 들여쓰기와 뒤 `;`/개행 범위까지 포함해 제거한다.
