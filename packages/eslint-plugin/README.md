# @simplysm/eslint-plugin

SIMPLYSM 프로젝트를 위한 커스텀 ESLint 플러그인입니다.

## 설치

```bash
yarn add -D @simplysm/eslint-plugin
```

## 사용법

### 권장 설정 사용

```javascript
// eslint.config.js
import sdPlugin from "@simplysm/eslint-plugin";

export default [
  ...sdPlugin.configs.root,
];
```

### 개별 규칙 사용

```javascript
// eslint.config.js
import sdPlugin from "@simplysm/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": sdPlugin,
    },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
    },
  },
];
```

## 규칙 목록

### TypeScript/JavaScript 규칙

| 규칙 | 권장 | Fixable | 설명 |
|------|:----:|:-------:|------|
| [no-hard-private](#no-hard-private) | error | O | ECMAScript `#` private 대신 TypeScript `private` 사용 강제 |
| [no-subpath-imports-from-simplysm](#no-subpath-imports-from-simplysm) | error | X | `@simplysm/*/src/*` 경로 import 금지 |
| [ts-no-buffer-in-typedarray-context](#ts-no-buffer-in-typedarray-context) | off | X | TypedArray 컨텍스트에서 Buffer 직접 사용 금지 |
| [ts-no-exported-types](#ts-no-exported-types) | off | X | 지정된 타입의 public API 노출 금지 |
| [ts-no-throw-not-implement-error](#ts-no-throw-not-implement-error) | warn | X | NotImplementError throw 경고 |
| [ts-no-unused-injects](#ts-no-unused-injects) | error | O | 미사용 Angular inject() 필드 감지 |
| [ts-no-unused-protected-readonly](#ts-no-unused-protected-readonly) | error | O | 미사용 protected readonly 필드 감지 |

### Angular 템플릿 규칙

| 규칙 | 권장 | Fixable | 설명 |
|------|:----:|:-------:|------|
| [ng-template-no-todo-comments](#ng-template-no-todo-comments) | warn | X | 템플릿 내 TODO 주석 경고 |
| [ng-template-sd-require-binding-attrs](#ng-template-sd-require-binding-attrs) | error | O | sd-* 컴포넌트에 바인딩 속성 강제 |

---

## 규칙 상세

### no-hard-private

ECMAScript `#` private 필드/메서드 대신 TypeScript `private _` 스타일을 강제합니다.

#### 위반 예시

```typescript
class MyClass {
  #field = 1;
  #method() {
    return this.#field;
  }
}
```

#### 올바른 예시

```typescript
class MyClass {
  private _field = 1;
  private _method() {
    return this._field;
  }
}
```

---

### no-subpath-imports-from-simplysm

`@simplysm` 패키지에서 `src` 서브경로를 직접 import하는 것을 금지합니다.

#### 위반 예시

```typescript
import { Something } from "@simplysm/sd-core-common/src/utils";
```

#### 올바른 예시

```typescript
import { Something } from "@simplysm/sd-core-common";
```

---

### ts-no-buffer-in-typedarray-context

TypedArray 타입이 기대되는 컨텍스트에서 Node.js Buffer를 직접 사용하는 것을 금지합니다.

#### 위반 예시

```typescript
function process(data: Uint8Array) { /* ... */ }

const buffer = Buffer.from([1, 2, 3]);
process(buffer);  // Error!
```

#### 올바른 예시

```typescript
function process(data: Uint8Array) { /* ... */ }

const buffer = Buffer.from([1, 2, 3]);
process(new Uint8Array(buffer));  // OK
```

---

### ts-no-exported-types

지정된 타입이 export된 API나 public 클래스 멤버에서 노출되는 것을 금지합니다.

#### 설정 예시

```javascript
"@simplysm/ts-no-exported-types": ["error", {
  types: [
    { ban: "ArrayBuffer", safe: "Buffer", ignoreInGeneric: true },
    { ban: "Uint8Array", safe: "Buffer" },
  ]
}]
```

---

### ts-no-throw-not-implement-error

`NotImplementError`를 throw하는 코드에 경고를 표시합니다.
구현되지 않은 코드가 남아있음을 개발자에게 알려줍니다.

#### 경고 예시

```typescript
throw new NotImplementError("이 기능은 아직 구현되지 않았습니다");
```

---

### ts-no-unused-injects

Angular의 `inject()` 함수로 주입받았지만 사용하지 않는 필드를 감지합니다.

#### 위반 예시

```typescript
@Component({ /* ... */ })
class MyComponent {
  private service = inject(MyService);  // Error: 사용되지 않음
}
```

---

### ts-no-unused-protected-readonly

Angular `@Component` 클래스에서 템플릿이나 클래스 메서드에서 사용되지 않는 `protected readonly` 필드를 감지합니다.

#### 위반 예시

```typescript
@Component({
  template: '<div></div>'
})
class MyComponent {
  protected readonly unusedService = inject(SomeService);  // Error!
}
```

#### 올바른 예시

```typescript
@Component({
  template: '<div>{{ title }}</div>'
})
class MyComponent {
  protected readonly title = 'Hello';  // OK: 템플릿에서 사용됨

  protected readonly service = inject(SomeService);  // OK: 메서드에서 사용됨

  doSomething() {
    this.service.call();
  }
}
```

---

### ng-template-no-todo-comments

Angular HTML 템플릿 내의 `<!-- TODO: ... -->` 주석을 경고합니다.

#### 경고 예시

```html
<!-- TODO: 이 부분 나중에 수정 -->
<div>Content</div>
```

---

### ng-template-sd-require-binding-attrs

`sd-*` 접두사를 가진 컴포넌트에서 허용되지 않은 plain 속성 사용을 금지하고, Angular 바인딩 사용을 강제합니다.

#### 위반 예시

```html
<sd-textfield placeholder="Enter name" disabled></sd-textfield>
```

#### 올바른 예시

```html
<sd-textfield [placeholder]="'Enter name'" [disabled]="true"></sd-textfield>
```

#### 허용되는 plain 속성

- 기본: `id`, `class`, `style`, `title`, `tabindex`, `role`
- 접두사: `aria-*`, `data-*`, `sd-*`

#### 설정 옵션

```javascript
"@simplysm/ng-template-sd-require-binding-attrs": ["error", {
  selectorPrefixes: ["sd-"],           // 대상 컴포넌트 접두사
  allowAttributes: ["id", "class"],    // 허용할 plain 속성
  allowAttributePrefixes: ["aria-"]    // 허용할 속성 접두사
}]
```

---

## 라이선스

MIT
