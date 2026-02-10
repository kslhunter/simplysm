# @simplysm/eslint-plugin

Simplysm 프레임워크의 ESLint 플러그인이다. 프로젝트 코드 컨벤션을 강제하기 위한 커스텀 규칙과 recommended 사전 설정을 제공한다.

ESLint Flat Config 형식을 사용하며, TypeScript, SolidJS, Tailwind CSS에 대한 규칙을 포함한다.

## 설치

```bash
npm install @simplysm/eslint-plugin
# or
pnpm add @simplysm/eslint-plugin
```

### 필수 피어 의존성

이 플러그인은 다음 패키지에 의존한다:

| 패키지 | 설명 |
|--------|------|
| `eslint` | ESLint 코어 |
| `typescript` | TypeScript 컴파일러 |
| `typescript-eslint` | TypeScript ESLint 파서 및 플러그인 |
| `eslint-plugin-import` | import/export 관련 규칙 |
| `eslint-plugin-unused-imports` | 미사용 import 자동 제거 |
| `eslint-plugin-solid` | SolidJS 전용 규칙 |
| `eslint-plugin-tailwindcss` | Tailwind CSS 전용 규칙 |
| `globals` | 전역 변수 정의 |

## 설정 방법

### ESLint Flat Config (eslint.config.js)

#### recommended 설정 사용 (권장)

`recommended` 설정은 커스텀 규칙, TypeScript 규칙, SolidJS 규칙, Tailwind CSS 규칙을 모두 포함하는 종합 설정이다. 대부분의 경우 이 설정만으로 충분하다.

```javascript
import simplysm from "@simplysm/eslint-plugin";

export default [
  // recommended 설정 사용
  simplysm.configs.recommended,
];
```

#### 개별 규칙만 사용

특정 커스텀 규칙만 선택적으로 적용하려면 다음과 같이 설정한다:

```javascript
import simplysm from "@simplysm/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": simplysm,
    },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/ts-no-throw-not-implemented-error": "warn",
    },
  },
];
```

---

## 커스텀 규칙

이 플러그인이 직접 제공하는 규칙은 3가지이다.

| 규칙 | 유형 | 자동 수정 | 기본 심각도 | 설명 |
|------|------|-----------|-------------|------|
| [`no-hard-private`](#no-hard-private) | problem | 지원 | error | ECMAScript `#field` 대신 TypeScript `private` 사용 강제 |
| [`no-subpath-imports-from-simplysm`](#no-subpath-imports-from-simplysm) | problem | 지원 | error | `@simplysm/*/src/` 경로 import 금지 |
| [`ts-no-throw-not-implemented-error`](#ts-no-throw-not-implemented-error) | suggestion | 미지원 | warn | `NotImplementedError` 사용 경고 |

---

### no-hard-private

ECMAScript private 필드(`#field`) 사용을 제한한다. TypeScript의 `private` 키워드와 `_` 접두사 네이밍을 사용해야 한다.

`--fix` 옵션으로 자동 변환을 지원한다.

**검사 대상:**

- 클래스 필드 선언: `#field`
- 클래스 메서드 선언: `#method()`
- 클래스 접근자 선언: `accessor #field`
- 멤버 접근 표현식: `this.#field`

**올바른 코드:**

```typescript
class Foo {
  private _value = 1;
  private _count: number;

  private _doSomething() {
    return this._value;
  }
}
```

**잘못된 코드:**

```typescript
class Foo {
  #value = 1;
  #count: number;

  #doSomething() {
    return this.#value;
  }
}
```

**데코레이터가 있는 경우의 자동 수정:**

데코레이터가 존재하는 멤버도 올바르게 변환된다. `private` 키워드는 데코레이터 다음, `static` 등 다른 키워드 앞에 삽입된다.

```typescript
// 수정 전
class Foo {
  @Deco
  static #value = 1;
}

// 수정 후
class Foo {
  @Deco
  private static _value = 1;
}
```

**제한 사항:**

- 기존에 `_` 접두사가 붙은 동일 이름의 멤버가 이미 존재하면 이름 충돌이 발생할 수 있다. 이 경우 자동 수정이 적용되지 않으며, `nameConflict` 메시지로 수동 조정을 요구한다.

```typescript
class Foo {
  private _value = 1;
  #value = 2; // 오류: "#value"를 "_value"로 변환할 수 없음 (이름 충돌)
}
```

---

### no-subpath-imports-from-simplysm

`@simplysm/*` 패키지의 `/src/` 경로를 통한 import를 금지한다. 패키지의 공식 진입점(패키지 루트)을 통해서만 import해야 한다.

`--fix` 옵션으로 패키지 루트 경로로 자동 변환을 지원한다.

**검사 대상:**

- 정적 import 문: `import ... from '...'`
- 동적 import: `import('...')`
- re-export 문: `export { ... } from '...'`
- re-export all 문: `export * from '...'`

**올바른 코드:**

```typescript
import { Foo } from "@simplysm/core-common";
import { Bar } from "@simplysm/core-node";

const mod = await import("@simplysm/core-common");

export { Baz } from "@simplysm/orm-common";
export * from "@simplysm/service-common";
```

**잘못된 코드:**

```typescript
import { Foo } from "@simplysm/core-common/src/types/DateOnly";
import { Bar } from "@simplysm/core-node/src/utils";

const mod = await import("@simplysm/core-common/src/index");

export { Baz } from "@simplysm/orm-common/src/query-builder";
export * from "@simplysm/service-common/src/protocols";
```

**허용되는 서브경로:**

`/src/`가 아닌 다른 서브경로는 허용된다.

```typescript
// 허용: /src/ 경로가 아님
import { Foo } from "@simplysm/core-common/utils";
```

---

### ts-no-throw-not-implemented-error

`@simplysm/core-common`의 `NotImplementedError`를 `new` 키워드로 생성하는 코드에 대해 경고한다. 미구현 코드가 프로덕션에 포함되는 것을 방지하기 위한 규칙이다.

`throw` 없이 생성만 해도 경고 대상이다. 자동 수정은 지원하지 않는다.

**지원하는 import 형태:**

| import 형태 | 감지 여부 |
|-------------|-----------|
| named import: `import { NotImplementedError } from "@simplysm/core-common"` | 감지 |
| aliased import: `import { NotImplementedError as NIE } from "@simplysm/core-common"` | 감지 |
| namespace import: `import * as CC from "@simplysm/core-common"` | 감지 |
| 동적 import: `await import("@simplysm/core-common")` | 미감지 |
| 다른 모듈에서 re-export된 경우 | 미감지 |

**잘못된 코드 (경고 발생):**

```typescript
import { NotImplementedError } from "@simplysm/core-common";

throw new NotImplementedError();            // 경고: "미구현"
throw new NotImplementedError("기능 X");     // 경고: "기능 X"
const err = new NotImplementedError();       // 경고: "미구현"
```

**aliased import도 감지한다:**

```typescript
import { NotImplementedError as NIE } from "@simplysm/core-common";

throw new NIE(); // 경고
```

**namespace import도 감지한다:**

```typescript
import * as CC from "@simplysm/core-common";

throw new CC.NotImplementedError(); // 경고
```

**메시지 표시 규칙:**

- 인자 없이 `new NotImplementedError()`를 호출하면 "미구현"이라는 경고 메시지가 출력된다.
- 문자열 인자를 전달하면 해당 문자열이 경고 메시지로 사용된다.

---

## recommended 설정 상세

`recommended` 설정에 포함된 전체 규칙 목록이다.

### 전역 무시 패턴

다음 디렉터리는 린트 대상에서 제외된다:

- `**/node_modules/**`
- `**/dist/**`
- `**/.legacy-packages/**`
- `**/.*/**`
- `**/_*/**`

### 공통 규칙 (JS/TS)

모든 JS, TS 파일에 적용되는 규칙이다.

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `no-console` | error | 콘솔 사용 금지 (프로덕션 성능 저하 방지) |
| `no-warning-comments` | warn | TODO/FIXME 주석 경고 (미완성 코드 확인용) |
| `eqeqeq` | error | `===` 사용 강제, `== null` 체크는 허용 |
| `no-self-compare` | error | `x === x`와 같은 자기 자신과의 비교 금지 (오타 방지) |
| `array-callback-return` | error | `map`/`filter` 등 배열 콜백에서 `return` 누락 방지 |

### Node.js 내장 모듈 사용 제한

모든 패키지에서 코드 통일을 위해 Node.js 전용 API 사용을 제한한다.

| 제한 대상 | 규칙 | 대안 |
|-----------|------|------|
| `Buffer` (전역) | `no-restricted-globals` | `Uint8Array`, `@simplysm/core-common`의 `BytesUtils` |
| `buffer` (import) | `no-restricted-imports` | `Uint8Array`, `@simplysm/core-common`의 `BytesUtils` |
| `events` (import) | `no-restricted-imports` | `@simplysm/core-common`의 `SdEventEmitter` |
| `eventemitter3` (import) | `no-restricted-imports` | `@simplysm/core-common`의 `SdEventEmitter` |

### 미사용 import 규칙

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `unused-imports/no-unused-imports` | error | 미사용 import 자동 제거 |
| `unused-imports/no-unused-vars` | error | 미사용 변수 감지 (`_` 접두사 변수/인자는 허용) |

### import 의존성 검사

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `import/no-extraneous-dependencies` | error | `package.json`에 선언되지 않은 외부 의존성 import 금지 |

`devDependencies`는 다음 경로에서만 허용된다:

- JS 파일: `**/lib/**`, `**/eslint.config.js`, `**/simplysm.js`, `**/vitest.config.js`
- TS 파일: `**/lib/**`, `**/eslint.config.ts`, `**/simplysm.ts`, `**/vitest.config.ts`, `**/vitest.setup.ts`

---

### JS 파일 전용 규칙 (.js, .jsx)

JS 파일에만 적용되는 규칙이다. TS 파일에서는 TypeScript 컴파일러가 동일한 검사를 수행하므로 별도로 적용하지 않는다.

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `require-await` | error | `async` 함수에 `await` 필수 |
| `no-shadow` | error | 변수 섀도잉 금지 |
| `no-duplicate-imports` | error | 중복 import 금지 |
| `no-unused-expressions` | error | 미사용 표현식 금지 |
| `no-undef` | error | 정의되지 않은 변수 사용 금지 |

---

### TypeScript 규칙 (.ts, .tsx)

`@typescript-eslint` 기반으로 적용되는 규칙이다. 타입 정보를 활용한 정밀한 검사를 수행한다.

#### 비동기 관련

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `@typescript-eslint/require-await` | error | `async` 함수에 `await` 필수 |
| `@typescript-eslint/await-thenable` | error | thenable 객체만 `await` 허용 |
| `@typescript-eslint/return-await` | error | `try-catch` 내에서만 `return await` 허용 |
| `@typescript-eslint/no-floating-promises` | error | 처리되지 않은 Promise 금지 |
| `@typescript-eslint/no-misused-promises` | error | void 콜백에 async 함수 전달 시 에러 누락 방지 (`arguments`, `attributes` 제외) |

#### 타입 안전성

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `@typescript-eslint/strict-boolean-expressions` | error | 엄격한 boolean 표현식 강제 (nullable boolean/object 허용) |
| `@typescript-eslint/no-unnecessary-condition` | error | 불필요한 조건 검사 금지 (상수 루프 조건 허용) |
| `@typescript-eslint/no-unnecessary-type-assertion` | error | 불필요한 타입 단언 금지 |
| `@typescript-eslint/only-throw-error` | error | Error 객체가 아닌 것을 throw하는 것 금지 (스택 트레이스 보존) |

#### 코드 스타일

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `@typescript-eslint/no-shadow` | error | 변수 섀도잉 금지 |
| `@typescript-eslint/prefer-reduce-type-parameter` | error | `reduce` 타입 파라미터 사용 권장 |
| `@typescript-eslint/prefer-return-this-type` | error | `this` 반환 타입 사용 권장 |
| `@typescript-eslint/no-unused-expressions` | error | 미사용 표현식 금지 |
| `@typescript-eslint/prefer-readonly` | error | 변경하지 않는 멤버에 `readonly` 사용 권장 |
| `@typescript-eslint/no-array-delete` | error | 배열에 `delete` 사용 금지 (희소 배열 버그 방지) |

#### ts-comment 규칙

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `@typescript-eslint/ban-ts-comment` | error | `@ts-expect-error`는 3글자 이상의 설명 필수 |

---

### SolidJS 규칙 (.ts, .tsx)

`eslint-plugin-solid` 기반으로 적용되는 규칙이다. `.ts`, `.tsx` 파일 모두에 적용된다.

#### 실수 방지

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `solid/reactivity` | error | 반응성 손실 감지 (`makePersisted` 커스텀 반응 함수 등록) |
| `solid/no-destructure` | error | props 구조분해 금지 (반응성 손실 방지) |
| `solid/components-return-once` | error | 컴포넌트의 early return 금지 |
| `solid/jsx-no-duplicate-props` | error | 중복 props 금지 |
| `solid/jsx-no-undef` | error | 정의되지 않은 JSX 변수 사용 금지 (TypeScript 지원 활성화) |
| `solid/no-react-deps` | error | React 스타일 의존성 배열 사용 금지 |
| `solid/no-react-specific-props` | error | React 전용 props 사용 금지 (`className` 등) |

#### 보안

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `solid/no-innerhtml` | error | `innerHTML` 사용 금지 (XSS 방지) |
| `solid/jsx-no-script-url` | error | `javascript:` URL 사용 금지 |

#### 도구 지원

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `solid/jsx-uses-vars` | error | JSX에서 사용된 변수가 unused import로 오탐되지 않도록 방지 |

#### 컨벤션

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `solid/prefer-for` | error | `For` 컴포넌트 사용 권장 |
| `solid/event-handlers` | error | 이벤트 핸들러 네이밍 규칙 강제 |
| `solid/imports` | error | import 일관성 강제 |
| `solid/style-prop` | error | `style` prop 형식 강제 |
| `solid/self-closing-comp` | error | 자체 닫기 태그 강제 |

---

### Tailwind CSS 규칙 (.ts, .tsx)

`eslint-plugin-tailwindcss` 기반으로 적용되는 규칙이다. `clsx` 템플릿 리터럴 태그도 인식한다.

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `tailwindcss/classnames-order` | warn | 클래스 순서 자동 정렬 |
| `tailwindcss/enforces-negative-arbitrary-values` | error | 음수 임의값 형식 통일 |
| `tailwindcss/enforces-shorthand` | error | 축약형 사용 권장 |
| `tailwindcss/no-contradicting-classname` | error | 충돌하는 클래스 금지 (`p-2 p-4` 등) |
| `tailwindcss/no-custom-classname` | error | Tailwind에 정의되지 않은 커스텀 클래스 금지 |
| `tailwindcss/no-unnecessary-arbitrary-value` | error | 불필요한 임의값 금지 |

---

### 테스트 파일 예외 규칙

`**/tests/**/*.ts`, `**/tests/**/*.tsx` 경로의 테스트 파일에는 다음 규칙이 완화된다:

| 규칙 | 변경 | 이유 |
|------|------|------|
| `no-console` | off | 테스트에서 디버그 출력 허용 |
| `import/no-extraneous-dependencies` | off | 루트 `devDependencies`(vitest 등) 사용 허용 |
| `@simplysm/ts-no-throw-not-implemented-error` | off | 테스트 코드에서 미구현 에러 사용 허용 |
| `solid/reactivity` | off | 테스트에서 `waitFor` 등 비동기 콜백 내 signal 접근은 의도된 동작 |

---

## 파일별 설정 요약

| 파일 패턴 | 적용 규칙 |
|-----------|-----------|
| `.js`, `.jsx` | 공통 규칙 + JS 전용 규칙 + `@simplysm` 커스텀 규칙 + import/unused-imports 규칙 |
| `.ts`, `.tsx` | 공통 규칙 + `@typescript-eslint` 규칙 + `@simplysm` 커스텀 규칙 + SolidJS 규칙 + Tailwind CSS 규칙 + import/unused-imports 규칙 |
| `**/tests/**` | 위 규칙에서 일부 완화 |

## 라이선스

Apache-2.0
