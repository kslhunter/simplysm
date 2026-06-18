# @simplysm/lint — rules

`@simplysm/lint/eslint-plugin` 이 노출하는 커스텀 규칙 9종. `plugins: { "@simplysm": plugin }` 매핑 후 `"@simplysm/<id>"` 로 켠다. id 접두어로 검사 대상 파일군이 갈림: `ts-*` 는 TS 소스, `ng-*` 는 Angular(TS effect 또는 HTML 템플릿), `no-*` 는 JS/TS 공통. 모든 규칙은 `createRule`(`ESLintUtils.RuleCreator` 래퍼)로 생성되어 문서 URL 이 자동 부여된다. 옵션 없는 규칙은 `schema: []`.

---

## ng-no-async-effect

- **검사 대상**: `@angular/core` 에서 import 한 `effect()` 호출의 첫 인자가 async 함수(`async () => {}` 또는 `async function`)인 경우. `effect` 식별자가 `@angular/core` 출처인지 스코프로 검증 — named(`import { effect }`) / aliased(`effect as ngEffect`) / namespace(`import * as ng` → `ng.effect(...)`) import 만 인정. 다른 모듈 또는 로컬 선언 `effect` 는 무시.
- **메시지** `noAsyncEffect`: effect 콜백을 async 로 하면 `await` 이후 signal read 가 reactive 의존성으로 추적되지 않으니, 비동기 작업은 `void untracked(async () => { ... })` 안에서 하라고 안내. 보고 위치는 첫 인자(콜백) 노드.
- **autofix**: 없음. **옵션**: 없음.

```typescript
effect(() => { this.sig(); void untracked(async () => { await this.load(); }); });
```

---

## ng-template-no-strict-null-check

- **검사 대상**: Angular 템플릿(`*.html` 및 인라인)의 `Binary` 표현식 중 연산자가 `===` / `!==` 이고 한쪽 피연산자가 nil 리터럴(value 가 null/undefined)인 경우. 즉 `x === null`, `x !== null`, `x === undefined`, `x !== undefined`. `== null` / `!= null` 은 통과.
- **메시지** `noStrictNullCheck`: `{{actual}}`(예: `x === null`) 대신 `{{replacement}}`(`===`→`==`, `!==`→`!=` 로 바꾸고 우변을 `null` 로 통일한 형태) 를 쓰라고 안내.
- **autofix**: 없음 — 인라인 템플릿 offset 매핑 문제로 미제공(JSDoc 근거). **옵션**: 없음.

```html
@if (user !== null) {}   <!-- "user != null 사용" 으로 보고 -->
```

---

## ng-template-no-todo-comments

- **검사 대상**: 템플릿 raw 텍스트의 HTML 주석 `<!-- ... -->` 중 본문에 `TODO:` 를 포함하는 것. AST 방문자가 아니라 정규식(`/<!--([\s\S]*?)-->/g`)으로 원문을 스캔(빈 visitor `{}` 반환). 한 파일의 여러 TODO 주석을 각각 개별 보고.
- **메시지** `noTodo`: 본문은 `{{content}}` — `TODO:` 이후 텍스트를 trim 한 내용을 그대로 출력.
- **autofix**: 없음. **옵션**: 없음.

```html
<!-- TODO: 페이징 추가 -->   <!-- "페이징 추가" 경고 -->
```

---

## ng-template-sd-require-binding-attrs

`sd-*` 접두사 컴포넌트의 허용목록 밖 plain attribute 를 금지하고 property binding(`[attr]="..."`)을 강제. **9종 중 유일하게 옵션이 있는 규칙**.

- **검사 대상**: 태그명이 지정 접두사(기본 `sd-`)로 시작하는 Element 의 attribute 중 `allowAttributes`(정확 일치)·`allowAttributePrefixes`(접두사 일치) 어디에도 안 드는 것(태그명·attribute 명 소문자 비교).
- **메시지** `requireBindingForAttribute`: `"{{attrName}}"` 는 `"{{elementName}}"` 의 plain attribute 로 불가, `[{{attrName}}]="…"` property binding 을 쓰라고 안내.
- **autofix**: 있음. 값이 빈 문자열이면 `[attr]="true"`, 값이 있으면 `\`·`'` 를 escape 해 `[attr]="'값'"` 로 치환. attribute span 이 비정상(`start >= end`)이면 fix 생략(`null` 반환).
- **옵션**(객체 1개, 모두 string 배열, `additionalProperties: false`):
  - `selectorPrefixes` — 검사 대상 태그 접두사. 기본 `["sd-"]`. 다른 디자인 시스템 접두사를 함께 검사할 때 지정.
  - `allowAttributes` — plain 허용 attribute 정확 이름. 기본 `["id","class","style","title","tabindex","role"]`. 표준 속성을 추가 허용할 때.
  - `allowAttributePrefixes` — plain 허용 attribute 접두사. 기본 `["aria-","data-","sd-"]`. aria/data 류 속성군을 통째 허용할 때.

```html
<sd-button myattr="hello"></sd-button>   <!-- → <sd-button [myattr]="'hello'"></sd-button> -->
<sd-button disabled></sd-button>          <!-- → <sd-button [disabled]="true"></sd-button> -->
```

---

## no-hard-private

ECMAScript hard private(`#`) 멤버 금지 → TypeScript `private _` 스타일 강제. JS·TS 양쪽 동작.

- **검사 대상**: 선언(`#field`, `#method()`, `accessor #field`, getter/setter, static/async/generator 변형)과 사용(`this.#field`, `other.#field`, `MyClass.#static`) 모두. 중첩 클래스·클래스 표현식은 멤버 집합을 스택으로 추적.
- **메시지**:
  - `preferSoftPrivate`: hard private(`#`) 금지, `private _` 스타일 안내.
  - `nameConflict`: `#{{name}}` 을 `_{{name}}` 로 바꾸려는데 동일 이름 멤버가 클래스에 이미 있어 변환 불가 — 보고만, autofix 안 함.
- **autofix**: 있음. 선언은 `#x → _x`, 접근 제어자가 없으면 데코레이터·`static`·`async`·`readonly` 순서를 보존해 그 앞에 `private ` 삽입(`static #x → private static _x`, `@Deco #x → @Deco private _x`). 기존 `private`/`public`/`protected` 가 있으면 접근자는 두고 이름만 변경. 사용처는 `this.#x → this._x`. 토큰 계산 실패 시 이름만 바뀌는 불완전 수정을 막으려 fix 전체 생략.
- **옵션**: 없음.

```typescript
class A { #count = 0; inc() { this.#count++; } }
// → private _count = 0; inc() { this._count++; }
```

---

## no-subpath-imports-from-simplysm

`@simplysm/*` 패키지의 `src` 하위 경로 import 금지(빌드 export 경유 강제). JS·TS 양쪽 동작.

- **검사 대상**: import 경로를 `/` 로 분리해 첫 패키지 세그먼트 뒤가 `src` 인 경우(`@simplysm/<pkg>/src`, `@simplysm/<pkg>/src/...`). `@simplysm/<pkg>` 루트·`src` 외 하위 경로(`@simplysm/<pkg>/utils`)는 통과, 비-`@simplysm` 패키지(`lodash/src/...`)도 통과. 정적 import, 동적 `import(...)`, `export { } from`, `export * from` 모두 검사(side-effect·type-only import 포함).
- **메시지** `noSubpathImport`: `'@simplysm/{{pkg}}'` 에서 `src` 하위 경로 `'{{importPath}}'` 를 import 할 수 없다는 위반.
- **autofix**: 있음. 경로를 패키지 루트 `@simplysm/<pkg>` 로 치환하며 원본 따옴표(`'`/`"`) 보존.
- **옵션**: 없음.

```typescript
import { x } from "@simplysm/core-common/src/x"; // → "@simplysm/core-common"
```

---

## ts-no-throw-not-implemented-error

`@simplysm/core-common` 의 `NotImplementedError` `new` 인스턴스화 감지(미구현 코드 프로덕션 유입 방지).

- **검사 대상**: `new NotImplementedError(...)`(named/aliased import), `new CC.NotImplementedError(...)`(namespace import). 식별자가 `@simplysm/core-common` 출처인지 스코프로 검증. 다른 모듈 동명 클래스, import 없는 사용, 동적 `await import(...)`, 재내보내기 경유는 감지 안 함(JSDoc·테스트 근거).
- **메시지** `noThrowNotImplementedError`: 본문은 `{{text}}` — `new` 의 첫 인자가 비어있지 않은 문자열 리터럴이면 그 값을, 아니면(템플릿 리터럴·숫자·빈 문자열·인자 없음) 기본값 `"미구현"` 을 출력.
- **autofix**: 없음. **옵션**: 없음. recommended 에서 TS 는 `warn`, tests 는 `off`.

```typescript
import { NotImplementedError } from "@simplysm/core-common";
new NotImplementedError("결제 연동"); // → "결제 연동" 경고
```

---

## ts-no-unused-injects

미사용 Angular `inject()` 필드 감지.

- **검사 대상**: 클래스 본문에서 `inject(...)` 호출로 초기화된 PropertyDefinition(key 가 Identifier). 같은 클래스 본문 전체를 순회해 필드명과 동일한 Identifier 참조(선언 key 자신 제외)가 0개면 미사용 판정. 클래스 내부 참조만 검사 — 템플릿 사용 여부는 안 봄.
- **메시지** `unusedInject`: `inject() field "{{name}}" is never used.`
- **autofix**: 있음. 해당 필드 선언을 앞 토큰 끝부터 제거(뒤 토큰이 있으면 필드 끝까지). 사용 중인 다른 inject 필드는 보존.
- **옵션**: 없음.

```typescript
class C { private _svc = inject(MyService); } // _svc 미참조 시 제거
```

---

## ts-no-unused-protected-readonly

Angular `@Component` 인라인 템플릿·클래스 본문 어디에서도 안 쓰이는 `protected readonly` 필드 감지.

- **검사 대상**: `@Component({ template: ... })` 데코레이터(첫 인자 객체에 `template` 키, 비어있지 않은 문자열/템플릿 리터럴)가 달린 클래스의 `protected readonly` 비-static 필드(key 가 Identifier) 중 ① 인라인 템플릿 미참조 ② 클래스 본문 다른 멤버 미참조 둘 다인 것. 템플릿 식별자는 `@angular/compiler` 의 `parseTemplate` 로 AST 파싱 후 `ImplicitReceiver`/`ThisReceiver` 위 `PropertyRead`(클래스 필드 참조)만 수집하며, `*ngFor` 로컬·`@let`·`@if ... as`·`@for` item/별칭 등 스코프 로컬은 제외. `@if`/`@switch`/`@for`/`@defer` 블록과 입력/이벤트/구조 디렉티브 바인딩까지 순회. `templateUrl`(외부 템플릿)은 대상 아님.
- **메시지** `unusedField`: `Protected readonly field "{{name}}" is not used in class or template.`
- **autofix**: 있음. 필드 선언을 앞 들여쓰기·뒤 `;`·개행까지 줄 단위로 제거.
- **옵션**: 없음.

```typescript
@Component({ template: `<div>{{title}}</div>` })
class C { protected readonly title = "x"; protected readonly unused = 1; } // unused 제거
```
