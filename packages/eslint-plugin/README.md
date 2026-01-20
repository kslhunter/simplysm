# @simplysm/eslint-plugin

심플리즘 프레임워크의 ESLint 플러그인이다. 프로젝트 컨벤션을 강제하기 위한 커스텀 규칙들을 제공한다.

## 설치

```bash
npm install @simplysm/eslint-plugin
# or
yarn add @simplysm/eslint-plugin
```

## 설정

### ESLint Flat Config (eslint.config.js)

```javascript
import simplysm from "@simplysm/eslint-plugin";

export default [
  // recommended 설정 사용
  simplysm.configs.recommended,

  // 또는 개별 규칙 설정
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

`new` 키워드로 생성하는 모든 경우에 경고가 발생한다. (`throw` 여부와 관계없음)

```typescript
import { NotImplementedError } from "@simplysm/core-common";

new NotImplementedError();           // 경고
throw new NotImplementedError();     // 경고
const err = new NotImplementedError(); // 경고
```

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
- `eqeqeq`: `===` 사용 강제 (null 체크 제외)
- `no-warning-comments`: TODO/FIXME 주석 경고

### Node.js 내장 모듈 사용 금지 (neutral/browser 타겟)

- `Buffer`, `EventEmitter` 등 Node.js 내장 모듈 사용 금지
- `.ts`, `.tsx` 파일에 적용

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
| `typedef` | 타입 정의 필수 |
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

### JS 파일 전용 규칙

JS 파일에만 적용되는 규칙이다. TS 파일에서는 TypeScript 컴파일러 또는 `@typescript-eslint` 규칙이 대체한다.

| 규칙 | 설명 |
|------|------|
| `no-duplicate-imports` | 중복 import 금지 |
| `no-undef` | 정의되지 않은 변수 사용 금지 |

## 라이선스

Apache-2.0
