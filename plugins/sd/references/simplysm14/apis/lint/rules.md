# @simplysm/lint 규칙 상세 가이드

## TypeScript 규칙

### ng-no-async-effect

Angular `effect()` 콜백에 async 함수를 직접 전달하는 것을 금지하는 규칙.

#### 문제 상황

```typescript
import { effect } from "@angular/core";

// 금지됨 ❌
effect(async () => {
  const data = await fetchData();
  console.log(data); // await 이후 읽은 signal은 반응형이 아님
});
```

#### 해결책

```typescript
import { effect, untracked } from "@angular/core";

// 올바름 ✅
effect(() => {
  const data = signal();
  void untracked(async () => {
    const result = await fetchData();
    data.set(result);
  });
});
```

#### 지원 import 형태

- Named import: `import { effect } from "@angular/core"`
- Aliased import: `import { effect as ngEffect } from "@angular/core"`
- Namespace import: `import * as ng from "@angular/core"` → `ng.effect(...)`

#### 메시지

```
effect()에 async 함수를 직접 전달하지 마세요. await 이후의 signal read는 의존성으로 추적되지 않습니다. 비동기 작업은 `void untracked(async () => { ... })` 내부에서 수행하세요.
```

#### Autofix

없음. 패턴 리팩토링이 필요함.

---

### no-hard-private

ECMAScript hard private 필드(`#field`)를 금지하고 TypeScript `private _` 스타일을 강제하는 규칙.

#### 문제 상황

```typescript
class MyClass {
  #privateName = "secret"; // 금지됨 ❌

  greet() {
    console.log(this.#privateName);
  }
}
```

#### 해결책

```typescript
class MyClass {
  private _privateName = "secret"; // 올바름 ✅

  greet() {
    console.log(this._privateName);
  }
}
```

#### 검사 항목

- 필드 선언: `#field = ...`
- 메서드 선언: `#method() { ... }`
- 접근자: `accessor #field`
- 멤버 접근: `this.#field`

#### 메시지

```
hard private 필드(#)은 사용할 수 없습니다. "private _" 스타일을 사용하세요.
```

혹은 이름 충돌 시:

```
hard private 필드 "#{{name}}"을(를) "_{{name}}"(으)로 변환할 수 없습니다. 동일한 이름의 멤버가 이미 존재합니다.
```

#### Autofix

이름 충돌이 없을 때 제공. `#fieldName` → `private _fieldName`로 자동 변환.

```typescript
class MyClass {
  private _field = "value"; // autofix 결과
}
```

이름이 충돌하면 수동 처리 필요.

---

### no-subpath-imports-from-simplysm

`@simplysm/*` 패키지의 'src' 하위 경로 import를 금지하는 규칙.

#### 문제 상황

```typescript
// 금지됨 ❌
import { MyClass } from "@simplysm/core-common/src/utils/my-class";
export { MyFunction } from "@simplysm/storage/src/internal";
await import("@simplysm/orm-common/src/models");
```

#### 해결책

```typescript
// 올바름 ✅
import { MyClass } from "@simplysm/core-common";
export { MyFunction } from "@simplysm/storage";
await import("@simplysm/orm-common");
```

#### 지원 import 형태

- 정적 import: `import { x } from "..."`
- 동적 import: `import(...)`
- 재내보내기(named): `export { x } from "..."`
- 재내보내기(all): `export * from "..."`

#### 메시지

```
'@simplysm/{{pkg}}' 패키지에서 'src' 하위 경로를 import할 수 없습니다: '{{importPath}}'
```

#### Autofix

`@simplysm/pkg/src/x` → `@simplysm/pkg`로 단순 자동 수정.

---

### ts-no-throw-not-implemented-error

`@simplysm/core-common`의 `NotImplementedError` 사용을 감지해 경고하는 제안 규칙.

#### 문제 상황

```typescript
import { NotImplementedError } from "@simplysm/core-common";

function future() {
  throw new NotImplementedError("아직 구현되지 않음"); // 경고 ⚠
}
```

#### 의도

미구현 코드가 프로덕션에 포함되었을 가능성을 팀에 인지시킴.

#### 지원 import 형태

- Named import: `import { NotImplementedError }`
- Aliased import: `import { NotImplementedError as NIE }`
- Namespace import: `import * as CC from "@simplysm/core-common"` → `new CC.NotImplementedError()`

#### 메시지

첫 인자가 문자열 리터럴이면 그 내용, 없으면:

```
미구현
```

#### Autofix

없음. 수동 구현이 필요함.

---

### ts-no-unused-injects

클래스 내 `inject()` 필드 중 미사용 필드를 감지하는 규칙.

#### 문제 상황

```typescript
import { Component, inject } from "@angular/core";
import { MyService } from "./my-service";

@Component({
  selector: "app-example",
  template: `
    <p>Hello</p>
  `,
})
export class ExampleComponent {
  private unusedService = inject(MyService); // 금지됨 ❌
  private usedService = inject(MyService);

  ngOnInit() {
    this.usedService.doSomething();
  }
}
```

#### 해결책

```typescript
export class ExampleComponent {
  private usedService = inject(MyService);

  ngOnInit() {
    this.usedService.doSomething();
  }
}
```

#### 메시지

```
inject() field "{{name}}" is never used.
```

#### Autofix

감지된 필드를 전체 제거.

---

### ts-no-unused-protected-readonly

Angular `@Component` 내 미사용 `protected readonly` 필드를 감지하는 규칙.

#### 문제 상황

```typescript
import { Component } from "@angular/core";

@Component({
  selector: "app-example",
  template: `
    <p>{{ usedValue }}</p>
  `,
})
export class ExampleComponent {
  protected readonly usedValue = "사용됨";
  protected readonly unusedValue = "미사용"; // 금지됨 ❌
}
```

#### 해결책

```typescript
@Component({
  selector: "app-example",
  template: `
    <p>{{ usedValue }}</p>
  `,
})
export class ExampleComponent {
  protected readonly usedValue = "사용됨";
}
```

#### 감지 범위

- 인라인 템플릿: `@Component({ template: "..." })`의 표현식 내 참조
- 클래스 본문: 메서드/접근자 내 참조

#### 로컬 변수 제외

템플릿 로컬 변수는 별도로 처리되어 field명 충돌로 간주되지 않음:

```typescript
template: `
  <div *ngFor="let item of items"> <!-- 'item' 로컬 변수 -->
    {{ item }}
  </div>
  <ng-container *ngIf="condition; as alias"> <!-- 'alias' 로컬 변수 -->
    ...
  </ng-container>
`;
```

#### 메시지

```
Protected readonly field "{{name}}" is not used in class or template.
```

#### Autofix

감지된 필드를 전체 제거.

---

## HTML 템플릿 규칙

### ng-template-no-strict-null-check

Angular 템플릿의 `=== null`, `!== null`, `=== undefined`, `!== undefined` 사용을 금지하는 규칙.

#### 문제 상황

```html
<!-- 금지됨 ❌ -->
<div *ngIf="value === null">null입니다</div>
<div *ngIf="data !== undefined">값이 있습니다</div>
```

#### 해결책

```html
<!-- 올바름 ✅ -->
<div *ngIf="value == null">null/undefined입니다</div>
<div *ngIf="data != null">null/undefined이 아닙니다</div>
```

#### 메시지

```
`{{actual}}`을 사용하지 마세요. `{{replacement}}`를 사용하세요.
```

예시:

```
`value === null`을 사용하지 마세요. `value == null`을 사용하세요.
```

#### Autofix

없음. 인라인 템플릿의 offset 매핑 복잡도로 인해 제공하지 않음.

---

### ng-template-no-todo-comments

HTML 주석 내 TODO 표기를 감지해 경고하는 제안 규칙.

#### 문제 상황

```html
<!-- TODO: 이 부분 나중에 구현하기 -->
<div>임시 구현</div>
```

#### 메시지

```
이 부분 나중에 구현하기
```

(TODO: 뒤의 내용이 메시지로 표시됨)

#### Autofix

없음. 수동으로 구현을 완성하거나 TODO를 제거해야 함.

---

### ng-template-sd-require-binding-attrs

`sd-` 접두사 컴포넌트에서 plain attribute 사용을 제한하고 Angular property binding 강제하는 규칙.

#### 문제 상황

```html
<!-- 금지됨 ❌ -->
<sd-grid data-rows="[...]" show-header="true" sort-column="id" allow-edit="false"></sd-grid>
```

#### 해결책

```html
<!-- 올바름 ✅ -->
<sd-grid data-rows="[...]" [showHeader]="true" [sortColumn]="'id'" [allowEdit]="false"></sd-grid>
```

#### 허용되는 plain attribute

기본값:

- `id`, `class`, `style` — HTML 표준
- `title`, `tabindex`, `role` — 접근성
- `aria-*` prefix — WAI-ARIA 속성
- `data-*` prefix — 커스텀 데이터
- `sd-*` prefix — @simplysm 컴포넌트 표준

#### 메시지

```
Attribute "{{attrName}}" is not allowed as a plain attribute on "{{elementName}}". Use a property binding instead, e.g. [{{attrName}}]="…".
```

#### Autofix

- `attr="value"` → `[attr]="'value'"`
- `attr=""` (빈 값) → `[attr]="true"`

#### 옵션 커스터마이징

`.eslintrc.json` 또는 `eslint.config.ts`:

```typescript
"@simplysm/ng-template-sd-require-binding-attrs": [
  "error",
  {
    // 대상 컴포넌트 선택자 prefix 변경/추가
    "selectorPrefixes": ["sd-", "app-"],

    // 허용 plain attribute 변경/추가
    "allowAttributes": ["id", "class", "style", "title", "tabindex", "role"],

    // 허용 prefix 변경/추가
    "allowAttributePrefixes": ["aria-", "data-", "sd-"]
  }
]
```

#### 예제: 커스텀 컴포넌트

```html
<!-- 커스텀 규칙: app-* 컴포넌트에 customData plain attr 허용 -->
<app-dialog customData="abc" [title]="dialogTitle" [visible]="showDialog"></app-dialog>
```

eslint 설정:

```typescript
"@simplysm/ng-template-sd-require-binding-attrs": [
  "error",
  {
    "selectorPrefixes": ["sd-", "app-"],
    "allowAttributes": ["id", "class", "style", "title", "tabindex", "role", "customData"],
  }
]
```
