# @simplysm/lint — rules

`eslint-plugin` 이 노출하는 커스텀 ESLint 규칙 9종. 규칙 ID 는 등록 시 `@simplysm/<name>`. 개별 규칙을 켜거나 lint 위반 메시지·autofix·옵션 의미를 파악할 때 읽음. 옵션 없는 규칙은 `schema: []`. autofix 는 `fixable: "code"` 표시 규칙만 제공. 모든 규칙은 `createRule`(= `ESLintUtils.RuleCreator`)로 생성되어 문서 URL 이 자동 부여됨.

## ng-no-async-effect

`type: problem`, autofix 없음. `@angular/core` 의 `effect()` 첫 인자로 async 함수(화살표/함수표현식이며 `async` 플래그)를 직접 전달하는 것을 금지. `await` 이후 읽은 signal 이 반응형 컨텍스트를 벗어나 의존성 추적에서 빠지는 버그, 그리고 반환값이 `Promise<void>` 가 되어 cleanup 등록이 막히는 문제를 방지.

- 감지 범위: named import(`effect`), aliased import(`effect as ngEffect`), namespace import(`ng.effect(...)`). `@angular/core` 가 아닌 모듈·로컬 선언 `effect` 는 무시(스코프·import 정의를 추적해 판별).
- `noAsyncEffect` — async 직접 전달 금지 메시지. 비동기 작업은 `void untracked(async () => { ... })` 안에서 수행하라고 안내.

```ts
// 위반
effect(async () => { await load(); });
// 권장
effect(() => { sig(); void untracked(async () => { await load(); }); });
```

## no-hard-private

`type: problem`, autofix 있음. ECMAScript hard private(`#field`) 금지, TypeScript `private _` 스타일 강제.

- 감지: 필드 선언 `#field`, 메서드 선언 `#method()`, 접근자 선언 `accessor #field`, 사용처 `this.#field`. 중첩 클래스도 스택으로 추적.
- autofix: `#a` → `_a` 이름 변경 + 선언부 앞에 `private ` 삽입(데코레이터·`static`·`async`·`readonly` 순서 보존; 사용처 `this.#a` → `this._a`). 단, 같은 클래스에 `_a` 멤버가 이미 있으면 충돌로 변환 불가 → 보고만 하고 autofix 안 함.
- `preferSoftPrivate` — hard private 금지(이름 변경 가능 시 적용되는 일반 메시지).
- `nameConflict` — `_{{name}}` 멤버가 이미 존재해 변환 불가. `{{name}}` 치환.

## no-subpath-imports-from-simplysm

`type: problem`, autofix 있음. `@simplysm/<pkg>/src/...` 형태의 `src` 하위 경로 import 금지(`@simplysm/<pkg>` 및 `src` 가 아닌 하위 경로는 허용).

- 감지: 정적 `import ... from '...'`, 동적 `import('...')`, 재내보내기 `export { ... } from '...'`, 전체 재내보내기 `export * from '...'`. 경로를 `/` 로 분해해 3번째 세그먼트가 `src` 인 경우만 위반.
- autofix: `@simplysm/pkg/src/x` → `@simplysm/pkg` 로 치환(원본 따옴표 종류 유지).
- `noSubpathImport` — `{{pkg}}`(패키지명)·`{{importPath}}`(원본 경로) 치환.

## ts-no-throw-not-implemented-error

`type: suggestion`, autofix 없음, recommended 에서 `warn`(테스트에서는 off). `@simplysm/core-common` 의 `NotImplementedError` 를 `new` 로 생성하는 코드를 감지해 미구현 코드의 프로덕션 유입을 경고.

- 감지: named/aliased import(`NotImplementedError`, `NotImplementedError as NIE`), namespace import(`new CC.NotImplementedError()`). import 소스가 `@simplysm/core-common` 인지 스코프로 검증. 동적 import 는 무시.
- `noThrowNotImplementedError` — `{{text}}` 치환. `new` 첫 인자가 비어있지 않은 문자열 리터럴이면 그 문자열을, 아니면 `"미구현"` 을 그대로 출력.

```ts
throw new NotImplementedError("결제 모듈 미구현"); // → "결제 모듈 미구현" 경고
```

## ts-no-unused-injects

`type: problem`, autofix 있음. 클래스 내 `inject()` 호출로 초기화된 프로퍼티 중 같은 클래스 어디에서도 참조되지 않는 필드를 보고.

- 감지: `PropertyDefinition` 의 값이 `inject(...)` 호출이고 key 가 식별자인 필드. 클래스 본문 전체를 재귀 순회해 필드명과 동일한 식별자(자기 key 제외)가 하나도 없으면 미사용으로 판정.
- autofix: 해당 필드 제거(앞 토큰 끝 ~ 뒤 토큰 사이 range 삭제).
- `unusedInject` — `inject() field "{{name}}" is never used.`

## ts-no-unused-protected-readonly

`type: problem`, autofix 있음. `@Component` 데코레이터가 달린 클래스에서 `protected readonly`(non-static) 필드가 인라인 `template` 과 클래스 본문 어디에서도 참조되지 않으면 보고.

- 동작: `@Component({ template: ... })` 의 인라인 템플릿 문자열(템플릿 리터럴/문자열 리터럴)을 `@angular/compiler` 의 `parseTemplate` 으로 파싱해 바인딩 식별자를 수집. `@for` item·context 변수, `@if (...; as alias)`, `@let` 선언, 구조 디렉티브(`*ngFor` 등) 로컬 변수는 스코프에서 제외(오탐 방지). 템플릿·클래스 양쪽 모두 미사용일 때만 보고. `template` prop 이 없거나 빈 문자열이면 검사하지 않음(외부 `templateUrl` 미지원).
- autofix: 필드 선언 라인 제거(앞 들여쓰기·뒤 세미콜론/개행 포함).
- `unusedField` — `Protected readonly field "{{name}}" is not used in class or template.`

## ng-template-no-strict-null-check

`type: problem`, autofix 없음(인라인 템플릿 offset 매핑 문제로 미제공). Angular 템플릿 바인딩에서 `=== null`/`undefined`, `!== null`/`undefined` 금지, `== null`/`!= null` 강제.

- 감지: `===`/`!==` 이항 연산의 한쪽 피연산자가 `null`/`undefined` 리터럴(value 가 nil)인 경우.
- `noStrictNullCheck` — `{{actual}}`(원본 표현식)·`{{replacement}}`(권장 표현식, `x == null`/`x != null`) 치환.

## ng-template-no-todo-comments

`type: problem`, autofix 없음, recommended 에서 `warn`. HTML 템플릿의 `<!-- TODO: ... -->` 주석을 감지. AST visitor 가 아니라 raw 텍스트 정규식으로 처리(visitor 는 빈 객체 반환).

- 감지: HTML 주석(`<!-- ... -->`) 내부에 `TODO:` 가 포함된 경우. 메시지에는 `TODO:` 이후를 trim 한 본문을 그대로 출력.
- `noTodo` — `{{content}}` 치환(주석에 적힌 TODO 내용).

## ng-template-sd-require-binding-attrs

`type: problem`, autofix 있음, 옵션 있음. `sd-` 접두사 컴포넌트에서 허용 목록 밖 plain attribute 사용을 금지하고 Angular property binding(`[attr]="..."`)을 강제.

- 옵션(객체 1개, 모든 키 선택):
  - `selectorPrefixes: string[]` — 검사 대상 엘리먼트 태그 접두사. 기본 `["sd-"]`. 이 접두사로 시작하는 태그만 검사. 다른 디자인 시스템 접두사를 쓰면 그 값으로 교체.
  - `allowAttributes: string[]` — plain 으로 허용할 attribute 이름. 기본 `["id","class","style","title","tabindex","role"]`. 대소문자 무시. 표준 전역 속성을 추가 허용할 때 확장.
  - `allowAttributePrefixes: string[]` — plain 으로 허용할 attribute 접두사. 기본 `["aria-","data-","sd-"]`. 접근성·데이터 속성군을 통째로 허용.
- autofix: 값 없는 attr → `[attr]="true"`, 값 있는 attr → `[attr]="'<escaped>'"`(`\`·`'` 이스케이프). 빈 span 이면 fix 생략.
- `requireBindingForAttribute` — `{{attrName}}`·`{{elementName}}` 치환.

```js
{ "@simplysm/ng-template-sd-require-binding-attrs": ["error", { allowAttributes: ["id", "for"] }] }
```
