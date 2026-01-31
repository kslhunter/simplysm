# @simplysm/eslint-plugin

심플리즘 프레임워크의 ESLint 플러그인이다. 프로젝트 컨벤션을 강제하기 위한 커스텀 규칙들을 제공한다.

## 설치

```bash
npm install @simplysm/eslint-plugin
# or
pnpm add @simplysm/eslint-plugin
```

## 설정

### ESLint Flat Config (eslint.config.js)

```javascript
import simplysm from "@simplysm/eslint-plugin";

export default [
  // recommended 설정 사용
  simplysm.configs.recommended,

  // 개별 규칙만 사용하려면
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

## 규칙

### no-hard-private

ECMAScript private 필드(`#field`) 사용을 제한한다. TypeScript의 `private` 키워드 사용을 권장한다.

`--fix` 옵션으로 자동 변환된다.

```typescript
// Bad
class Foo {
  #value = 1;
}

// Good
class Foo {
  private _value = 1;
}
```

**제한 사항**: 기존에 `_` 접두사가 붙은 동일 이름의 멤버가 있으면 이름 충돌이 발생할 수 있다. 이 경우 수동으로 이름을 조정해야 한다.

### no-subpath-imports-from-simplysm

`@simplysm/*` 패키지의 `/src/` 경로 import를 금지한다.

`--fix` 옵션으로 패키지 루트 경로로 자동 변환된다.

```typescript
// Bad
import { Foo } from "@simplysm/core-common/src/types/DateOnly";

// Good
import { Foo } from "@simplysm/core-common";
```

### ts-no-throw-not-implemented-error

`@simplysm/core-common`의 `NotImplementedError`를 사용하는 코드에 대해 경고한다. 미구현 코드가 프로덕션에 포함되는 것을 방지한다.

`new` 키워드로 생성하는 모든 경우에 경고가 발생한다. `throw` 없이 생성만 해도 경고 대상이다.

```typescript
import { NotImplementedError } from "@simplysm/core-common";

new NotImplementedError();           // 경고
throw new NotImplementedError();     // 경고
const err = new NotImplementedError(); // 경고
```

**제한 사항**:
- 동적 import(`await import(...)`)로 가져온 `NotImplementedError`는 감지하지 않는다.
- 다른 모듈에서 re-export된 `NotImplementedError`는 감지하지 않는다.

## recommended 설정

recommended 설정에는 다음이 포함된다:

### 심플리즘 커스텀 규칙

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `no-hard-private` | error | ECMAScript `#field` 대신 TypeScript `private` 사용 강제 |
| `no-subpath-imports-from-simplysm` | error | `@simplysm/*/src/` 경로 import 금지 |
| `ts-no-throw-not-implemented-error` | warn | `NotImplementedError` 사용 경고 |

### 공통 규칙

- `no-console`: 콘솔 사용 금지 (error)
- `eqeqeq`: `===` 사용 강제, null 체크 제외 (error)
- `no-warning-comments`: TODO/FIXME 주석 경고 (error)
- `no-shadow`: 변수 섀도잉 금지 (error)

### Node.js 내장 모듈 사용 금지

모든 패키지에서 코드 통일을 위해 Node.js 전용 API 사용을 금지한다.

- `Buffer` → `Uint8Array`, `@simplysm/core-common`의 `BytesUtils` 사용
- `EventEmitter` → `@simplysm/core-common`의 `EventEmitter` 사용

### TypeScript 규칙

`@typescript-eslint` 규칙 기반으로 다음 규칙들이 적용된다:

| 규칙 | 설명 |
|------|------|
| `require-await` | async 함수에 await 필수 |
| `await-thenable` | thenable 객체만 await 허용 |
| `return-await` | try-catch 내에서만 return await 사용 |
| `no-floating-promises` | 처리되지 않은 Promise 금지 |
| `no-shadow` | 변수 섀도잉 금지 |
| `no-unnecessary-condition` | 불필요한 조건 검사 금지 |
| `no-unnecessary-type-assertion` | 불필요한 타입 단언 금지 |
| `non-nullable-type-assertion-style` | non-null 단언 스타일 강제 |
| `prefer-reduce-type-parameter` | reduce 타입 파라미터 사용 권장 |
| `prefer-return-this-type` | this 반환 타입 사용 권장 |
| `no-unused-expressions` | 미사용 표현식 금지 |
| `strict-boolean-expressions` | 엄격한 boolean 표현식 강제 |
| `ban-ts-comment` | @ts-expect-error는 설명 필수 |
| `prefer-readonly` | readonly 사용 권장 |

추가 플러그인:
- 미사용 import 자동 제거 (`eslint-plugin-unused-imports`)
- import 순서 정렬 및 외부 의존성 검사 (`eslint-plugin-import`)

### 파일별 설정

- **JS 파일** (`.js`, `.jsx`): JavaScript 전용 규칙 적용
- **TS 파일** (`.ts`, `.tsx`): TypeScript ESLint 규칙 적용
- **TSX 파일** (`.tsx`): SolidJS 규칙 추가 적용

### TSX 파일 (SolidJS)

TSX 파일에는 `eslint-plugin-solid`의 `flat/typescript` 규칙이 추가로 적용된다.

| 규칙 | 설명 |
|------|------|
| `solid/jsx-no-undef` | use:directive import가 미사용으로 처리되지 않도록 허용 |

### JS 파일 전용 규칙

JS 파일에만 적용되는 규칙이다. TS 파일에서는 TypeScript 컴파일러가 동일한 검사를 수행한다.

| 규칙 | 설명 |
|------|------|
| `no-duplicate-imports` | 중복 import 금지 |
| `no-undef` | 정의되지 않은 변수 사용 금지 |

## 라이선스

Apache-2.0
