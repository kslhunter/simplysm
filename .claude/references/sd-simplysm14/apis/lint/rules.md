# @simplysm/lint — rules

`eslint-plugin` 이 노출하는 커스텀 ESLint 규칙 9종. 규칙 id 는 등록 시 `@simplysm/<name>`. 개별 규칙을 켜거나 lint 위반 메시지·autofix·옵션 의미를 파악할 때 읽음. 모든 규칙은 `createRule`(= `ESLintUtils.RuleCreator`, `src/utils/create-rule.ts`)로 생성되어 문서 URL 이 자동 부여됨. 옵션 없는 규칙은 `schema: []`. autofix 는 아래 "autofix" 표기 규칙만 제공.

## no-hard-private

ECMAScript hard private(`#field`) 사용을 금지하고 TypeScript `private _` 스타일을 강제. `type: "problem"`, autofix 있음, 옵션 없음. JS·TS 양쪽에서 동작.

검사 대상: 클래스 필드 선언(`#field`), 메서드 선언(`#method()`), 접근자 선언(`accessor #field`), 멤버 접근 표현식(`this.#field`).

메시지:
- `preferSoftPrivate` — hard private(#) 금지, `private _` 스타일 사용 안내. autofix 는 `#name` → `_name` 으로 치환하고, 선언부에 접근제어자가 없으면 `private ` 를 앞에 삽입(데코레이터·`static`·`async`·`readonly` 순서를 보존해 그 뒤 삽입). 토큰 계산 실패 시 이름만 바뀌는 불완전 수정을 막기 위해 수정 전체를 건너뜀.
- `nameConflict` — `#{{name}}` 을 `_{{name}}` 으로 바꿀 수 없음(동일 이름 멤버가 클래스에 이미 존재). 이 경우 보고만 하고 autofix 안 함. 중첩 클래스는 스택으로 각 클래스 멤버 집합을 관리.

```typescript
class A { #count = 0; inc() { this.#count++; } }
// → private _count = 0; inc() { this._count++; }
```

## no-subpath-imports-from-simplysm

`@simplysm/*` 패키지의 `src` 하위 경로 import 를 금지(빌드 산출물 export 경유를 강제). `type: "problem"`, autofix 있음, 옵션 없음. JS·TS 양쪽에서 동작.

검사 대상: 정적 import(`import ... from`), 동적 import(`import("...")`), 재내보내기(`export { x } from`), 전체 재내보내기(`export * from`). import 경로를 `/` 로 분리해 3번째 세그먼트가 `src` 인 경우(`@simplysm/pkg/src`, `@simplysm/pkg/src/xxx`)만 위반. `@simplysm/pkg`·`@simplysm/pkg/xxx`(src 가 아닌 subpath)는 허용.

메시지:
- `noSubpathImport` — `'@simplysm/{{pkg}}'` 에서 `src` 하위 경로 import 불가. autofix 는 경로를 `@simplysm/<pkg>`(원래 따옴표 유지)로 치환.

```typescript
import { x } from "@simplysm/core-common/src/x"; // → "@simplysm/core-common"
```

## ng-no-async-effect

Angular `@angular/core` 의 `effect()` 에 async 함수를 직접 전달하는 것을 금지. `type: "problem"`, autofix 없음, 옵션 없음. `await` 이후 signal read 가 reactive 의존성으로 추적되지 않고 반환값이 `Promise<void>` 가 되어 cleanup 등록이 막히는 문제 방지.

검사 대상: `effect(...)` 호출의 첫 인자가 async ArrowFunction/FunctionExpression 인 경우. `effect` 식별자가 `@angular/core` 에서 import 되었는지 스코프로 검증 — named(`import { effect }`)·aliased(`effect as ngEffect`)·namespace(`import * as ng` → `ng.effect(...)`) import 만 인정. 다른 모듈 또는 로컬 선언 `effect` 는 무시.

메시지:
- `noAsyncEffect` — async 함수 직접 전달 금지. 비동기는 `void untracked(async () => { ... })` 내부에서 수행하라고 안내. 보고 위치는 첫 인자(콜백) 노드.

```typescript
effect(() => { this.sig(); void untracked(async () => { await this.load(); }); });
```

## ts-no-throw-not-implemented-error

`@simplysm/core-common` 의 `NotImplementedError` 를 `new` 로 인스턴스화하는 코드를 감지(미구현 코드의 프로덕션 유입 방지). `type: "suggestion"`, autofix 없음, 옵션 없음. recommended 에서 `warn`(테스트 파일은 `off`).

검사 대상: `new NotImplementedError(...)`(named/aliased import), `new CC.NotImplementedError(...)`(namespace import). 식별자가 `@simplysm/core-common` 에서 import 되었는지 스코프로 검증. 동적 import(`await import(...)`)는 감지 안 함.

메시지:
- `noThrowNotImplementedError` — 메시지 본문은 `{{text}}` 치환. 첫 인자가 비어있지 않은 문자열 리터럴이면 그 값을, 아니면 `"미구현"` 을 출력.

```typescript
import { NotImplementedError } from "@simplysm/core-common";
new NotImplementedError("결제 연동"); // → "결제 연동" 경고
```

## ts-no-unused-injects

미사용 Angular `inject()` 필드를 감지. `type: "problem"`, autofix 있음, 옵션 없음.

검사 대상: 클래스 본문에서 `inject(...)` 호출로 초기화된 PropertyDefinition(키가 Identifier). 같은 클래스 본문 전체를 순회해 필드명과 동일한 Identifier 참조(필드 키 자신 제외)가 0개면 미사용으로 판정. 클래스 내부 참조만 검사 — 템플릿 사용 여부는 보지 않음.

메시지:
- `unusedInject` — `inject() field "{{name}}" is never used.` autofix 는 해당 필드 선언을 앞 토큰 끝부터 제거(뒤 토큰이 있으면 필드 끝까지).

```typescript
class C { private _svc = inject(MyService); } // _svc 미참조 시 제거
```

## ts-no-unused-protected-readonly

Angular `@Component` 의 인라인 템플릿·클래스 본문 어디에서도 안 쓰이는 `protected readonly` 필드를 감지. `type: "problem"`, autofix 있음, 옵션 없음.

검사 대상: `@Component` 데코레이터가 있고 그 첫 인자 객체에 `template` 속성(문자열 리터럴 또는 템플릿 리터럴)이 있는 클래스. 그 클래스의 `protected readonly` 비-static 필드(키가 Identifier)가 ① 인라인 템플릿에서 미참조 ② 클래스 본문 다른 멤버에서 미참조 둘 다일 때 보고. 템플릿 식별자는 `@angular/compiler` 의 `parseTemplate` 으로 AST 파싱 후 `ImplicitReceiver`/`ThisReceiver` 위 `PropertyRead`(클래스 필드 참조)만 수집하며, `*ngFor` 로컬·`@let`·`@if ... as`·`@for` item/별칭 등 스코프 로컬 변수는 제외. `@if`/`@switch`/`@for`/`@defer` 블록, 입력/이벤트/구조 디렉티브 바인딩까지 순회. `templateUrl`(외부 템플릿)은 대상 아님(`template` 문자열만).

메시지:
- `unusedField` — `Protected readonly field "{{name}}" is not used in class or template.` autofix 는 필드 선언과 앞 들여쓰기·뒤 `;`·개행을 함께 제거.

```typescript
@Component({ template: `<div>{{title}}</div>` })
class C { protected readonly title = "x"; protected readonly unused = 1; } // unused 제거
```

## ng-template-no-strict-null-check

Angular HTML 템플릿에서 엄격 비교(`=== null`, `!== null`, `=== undefined`, `!== undefined`)를 금지하고 `== null`/`!= null` 로 통일하도록 강제. `type: "problem"`, autofix 없음(인라인 템플릿 offset 매핑 문제로 미제공), 옵션 없음. HTML 파일 대상.

검사 대상: 템플릿 표현식의 `Binary` 노드 중 연산자가 `===`/`!==` 이고 양변 중 하나가 nil 리터럴(value 가 null/undefined)인 경우.

메시지:
- `noStrictNullCheck` — `{{actual}}`(예: `x === null`) 사용 금지, `{{replacement}}`(예: `x == null`) 사용 안내. `===`→`==`, `!==`→`!=` 로 변환한 권장 표현을 제시.

```html
@if (user !== null) {}  <!-- user != null 사용하라고 보고 -->
```

## ng-template-no-todo-comments

Angular HTML 템플릿 내 `<!-- TODO: ... -->` 주석을 경고. `type: "problem"`, autofix 없음, 옵션 없음. recommended 에서 `warn`. HTML 파일 대상.

동작: raw 텍스트를 `<!--...-->` 정규식으로 훑어 주석 내용에 `TODO:` 가 있으면 보고(AST 방문자 없이 빈 객체 반환). 메시지 본문은 `TODO:` 뒤 trim 한 내용.

메시지:
- `noTodo` — 본문은 `{{content}}`(TODO 뒤 텍스트) 그대로 출력.

```html
<!-- TODO: 페이징 추가 -->  <!-- "페이징 추가" 경고 -->
```

## ng-template-sd-require-binding-attrs

`sd-*` 접두사 커스텀 컴포넌트에서 허용목록 밖 plain attribute 사용을 금지하고 Angular property binding(`[attr]="..."`)을 강제. `type: "problem"`, autofix 있음. HTML 파일 대상. **유일하게 옵션 있는 규칙**.

옵션(`RuleOptions`, 모두 선택):
- `selectorPrefixes: string[]` — 검사 대상 요소 태그 접두사. 미지정 시 `["sd-"]`. 태그명을 소문자로 비교. 다른 디자인 시스템 접두사를 검사하려면 지정.
- `allowAttributes: string[]` — plain attribute 로 허용할 정확한 이름 목록. 미지정 시 `["id","class","style","title","tabindex","role"]`. 소문자 비교. 추가로 허용할 표준 속성을 늘릴 때.
- `allowAttributePrefixes: string[]` — plain attribute 로 허용할 접두사 목록. 미지정 시 `["aria-","data-","sd-"]`. 소문자 비교. 접두사 기반(aria/data 등) 속성군을 통째 허용할 때.

동작: 대상 태그(접두사 매칭) 요소의 attribute 중 `allowAttributes`(정확 일치)·`allowAttributePrefixes`(접두사 일치) 어디에도 안 드는 것을 보고.

메시지:
- `requireBindingForAttribute` — `"{{attrName}}"` 은 `"{{elementName}}"` 의 plain attribute 로 불가, property binding 사용 안내. autofix 는 값이 빈 문자열이면 `[attr]="true"`, 값이 있으면 `\` 와 `'` 를 이스케이프해 `[attr]="'값'"` 로 치환(span 의 start≥end 면 수정 안 함).

```html
<sd-button myattr="hello"></sd-button>   <!-- → <sd-button [myattr]="'hello'"></sd-button> -->
<sd-button disabled></sd-button>          <!-- → <sd-button [disabled]="true"></sd-button> -->
```
