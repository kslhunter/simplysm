# @simplysm/lint

Simplysm 프로젝트용 ESLint 설정과 커스텀 규칙 패키지. ESLint v9 flat config 기반.

## 설치

```bash
pnpm add @simplysm/lint
```

## 엔트리포인트

| Export 경로 | 설명 |
|---|---|
| `@simplysm/lint/eslint-recommended` | 권장 ESLint flat config 배열 (규칙 프리셋) |
| `@simplysm/lint/eslint-plugin` | 커스텀 ESLint 플러그인 (`@simplysm/*` 규칙) |

## 사용법

### 권장 설정 적용 (eslint-recommended)

프로젝트의 `eslint.config.js`에서 가져와 사용한다.

```typescript
// eslint.config.js
import eslintRecommended from "@simplysm/lint/eslint-recommended";

export default [
  ...eslintRecommended,
  // 추가 설정 오버라이드
];
```

이 설정에는 아래의 모든 규칙이 사전 구성되어 있으므로 별도로 플러그인을 등록할 필요가 없다.

### 플러그인 단독 사용 (eslint-plugin)

커스텀 규칙만 개별적으로 사용하려면 플러그인을 직접 등록한다.

```typescript
import plugin from "@simplysm/lint/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": plugin,
    },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/ts-no-throw-not-implemented-error": "warn",
    },
  },
];
```

## 권장 설정 구성 (eslint-recommended)

`eslint-recommended`는 `defineConfig()`으로 구성된 flat config 배열이다. 파일 타입별로 다른 규칙 세트가 적용된다.

### 글로벌 무시 패턴

```
**/node_modules/**, **/dist/**, **/.*/**, **/_*/**
```

### 공통 규칙 (JS/TS 모두 적용)

| 규칙 | 수준 | 설명 |
|---|---|---|
| `no-console` | error | `console.*` 사용 금지 |
| `no-warning-comments` | warn | TODO/FIXME 주석 경고 |
| `eqeqeq` | error | `===` 강제 (`== null`만 허용) |
| `no-self-compare` | error | 자기 자신과의 비교 방지 |
| `array-callback-return` | error | map/filter 콜백에서 return 누락 방지 |

### Node 빌트인 제한 규칙

| 규칙 | 대상 | 대안 |
|---|---|---|
| `Buffer` 전역 변수 | `no-restricted-globals` | `Uint8Array` 또는 `BytesUtils` 사용 |
| `buffer` 모듈 import | `no-restricted-imports` | `Uint8Array` 또는 `BytesUtils` 사용 |
| `events` 모듈 import | `no-restricted-imports` | `@simplysm/core-common`의 `EventEmitter` 사용 |
| `eventemitter3` import | `no-restricted-imports` | `@simplysm/core-common`의 `EventEmitter` 사용 |

### JS 전용 규칙 (*.js, *.jsx)

공통 규칙에 추가로 `require-await`, `no-shadow`, `no-duplicate-imports`, `no-unused-expressions`, `no-undef`가 적용된다.

### TypeScript 전용 규칙 (*.ts, *.tsx)

공통 규칙에 추가로 TypeScript 전용 규칙이 적용된다. `typescript-eslint` 파서를 사용하며 프로젝트 타입 정보가 필요하다 (`project: true`).

| 규칙 | 수준 | 설명 |
|---|---|---|
| `@typescript-eslint/require-await` | error | async 함수에 await 필수 |
| `@typescript-eslint/await-thenable` | error | thenable이 아닌 값에 await 금지 |
| `@typescript-eslint/return-await` | error | try-catch 내에서만 return await 허용 |
| `@typescript-eslint/no-floating-promises` | error | Promise를 반드시 await 또는 void 처리 |
| `@typescript-eslint/no-shadow` | error | 변수 섀도잉 금지 |
| `@typescript-eslint/no-unnecessary-condition` | error | 불필요한 조건 검사 금지 (상수 루프 허용) |
| `@typescript-eslint/no-unnecessary-type-assertion` | error | 불필요한 타입 단언 금지 |
| `@typescript-eslint/prefer-reduce-type-parameter` | error | reduce 타입 파라미터 사용 권장 |
| `@typescript-eslint/prefer-return-this-type` | error | this 반환 타입 사용 권장 |
| `@typescript-eslint/no-unused-expressions` | error | 미사용 표현식 금지 |
| `@typescript-eslint/strict-boolean-expressions` | error | 엄격한 boolean 표현식 (nullable boolean/object 허용) |
| `@typescript-eslint/ban-ts-comment` | error | `@ts-expect-error`만 설명 포함 시 허용 |
| `@typescript-eslint/prefer-readonly` | error | 재할당하지 않는 속성에 readonly 강제 |
| `@typescript-eslint/no-misused-promises` | error | void 콜백에 async 함수 전달 방지 (arguments/attributes 제외) |
| `@typescript-eslint/only-throw-error` | error | Error 객체만 throw 허용 |
| `@typescript-eslint/no-array-delete` | error | 배열에 delete 사용 금지 |

### 미사용 import 규칙

| 규칙 | 수준 | 설명 |
|---|---|---|
| `unused-imports/no-unused-imports` | error | 미사용 import 자동 제거 |
| `unused-imports/no-unused-vars` | error | 미사용 변수 금지 (`_` 접두사 허용) |

### SolidJS 규칙 (*.ts, *.tsx)

| 규칙 | 수준 | 설명 |
|---|---|---|
| `solid/no-destructure` | error | Props 구조분해 금지 (반응성 손실 방지) |
| `solid/components-return-once` | error | 컴포넌트 단일 반환 강제 |
| `solid/jsx-no-duplicate-props` | error | 중복 props 금지 |
| `solid/jsx-no-undef` | error | 미정의 변수 참조 금지 (TS 지원) |
| `solid/no-react-deps` | error | React 의존성 배열 패턴 금지 |
| `solid/no-react-specific-props` | error | React 전용 props 금지 (className 등) |
| `solid/no-innerhtml` | error | innerHTML 사용 금지 (XSS 방지) |
| `solid/jsx-no-script-url` | error | `javascript:` URL 금지 |
| `solid/jsx-uses-vars` | error | JSX 변수 사용 추적 |
| `solid/prefer-for` | error | `.map()` 대신 `<For>` 컴포넌트 사용 |
| `solid/event-handlers` | error | 이벤트 핸들러 네이밍 규칙 |
| `solid/imports` | error | import 일관성 |
| `solid/style-prop` | error | style prop 형식 |
| `solid/self-closing-comp` | error | 셀프 클로징 태그 |

### Tailwind CSS 규칙 (*.ts, *.tsx)

`clsx` 템플릿 리터럴 태그를 지원한다.

| 규칙 | 수준 | 설명 |
|---|---|---|
| `tailwindcss/classnames-order` | warn | 클래스 순서 자동 정렬 |
| `tailwindcss/enforces-negative-arbitrary-values` | error | 음수 임의 값 형식 통일 |
| `tailwindcss/enforces-shorthand` | error | 축약형 사용 권장 |
| `tailwindcss/no-contradicting-classname` | error | 충돌 클래스 금지 (`p-2 p-4` 등) |
| `tailwindcss/no-custom-classname` | error | Tailwind 외 커스텀 클래스 금지 |
| `tailwindcss/no-unnecessary-arbitrary-value` | error | 불필요한 임의 값 금지 |

### 테스트 파일 오버라이드

`**/tests/**`, `**/tests-e2e/**` 경로의 파일에는 다음 규칙이 완화된다:

- `no-console`: off
- `import/no-extraneous-dependencies`: off
- `@simplysm/ts-no-throw-not-implemented-error`: off

## 커스텀 규칙 상세

### @simplysm/no-hard-private

ECMAScript `#private` 필드/메서드 대신 TypeScript `private _` 키워드 사용을 강제한다.

- **타입**: problem
- **자동 수정**: 지원 (fixable)
- **적용 대상**: JS, TS 모두

**감지 범위:**
- 클래스 필드 선언: `#field`
- 클래스 메서드 선언: `#method()`
- 클래스 접근자 선언: `accessor #field`
- 멤버 접근 표현식: `this.#field`
- 중첩 클래스 지원 (스택 구조)

**자동 수정 동작:**
1. `#name` -> `_name`으로 이름 변경
2. `private` 접근 제한자가 없으면 자동 추가
3. 데코레이터가 있으면 데코레이터 뒤에 `private` 삽입
4. 동일 이름의 멤버가 이미 존재하면 충돌 에러 보고 (수정 불가)

```typescript
// Bad
class Foo {
  #bar = 1;
  #baz() { return this.#bar; }
}

// Good
class Foo {
  private _bar = 1;
  private _baz() { return this._bar; }
}
```

**메시지:**
- `preferSoftPrivate`: `Hard private fields (#) are not allowed. Use the "private _" style instead.`
- `nameConflict`: `Cannot convert hard private field "#name" to "_name". A member with the same name already exists.`

### @simplysm/no-subpath-imports-from-simplysm

`@simplysm/*` 패키지의 `src/` 서브경로 import를 금지한다.

- **타입**: problem
- **자동 수정**: 지원 (fixable)
- **적용 대상**: JS, TS 모두

**감지 범위:**
- 정적 import: `import { x } from "@simplysm/pkg/src/..."`
- 동적 import: `import("@simplysm/pkg/src/...")`
- named re-export: `export { x } from "@simplysm/pkg/src/..."`
- 전체 re-export: `export * from "@simplysm/pkg/src/..."`

**자동 수정 동작:**
- `@simplysm/pkg/src/...` -> `@simplysm/pkg`로 경로 축약

```typescript
// Bad
import { foo } from "@simplysm/core-common/src/utils/obj";
export { bar } from "@simplysm/solid/src/controls";

// Good
import { foo } from "@simplysm/core-common";
export { bar } from "@simplysm/solid";
```

### @simplysm/ts-no-throw-not-implemented-error

`@simplysm/core-common`의 `NotImplementedError` 사용을 경고한다. 프로덕션 코드에서 미구현 부분을 감지하기 위한 규칙.

- **타입**: suggestion
- **자동 수정**: 미지원
- **적용 대상**: TS 전용 (타입 분석 필요)
- **기본 수준**: warn (테스트 파일에서는 off)

**감지 범위:**
- named import: `import { NotImplementedError } from "@simplysm/core-common"`
- aliased import: `import { NotImplementedError as NIE } from "@simplysm/core-common"`
- namespace import: `import * as CC from "@simplysm/core-common"` -> `new CC.NotImplementedError()`
- 동적 import (`await import(...)`)는 감지하지 않음

**보고 메시지:**
- 첫 번째 인자가 문자열이면 해당 문자열을 메시지로 표시
- 인자가 없으면 `"Not implemented"` 표시

```typescript
// Warning: "TODO: 나중에 구현"
throw new NotImplementedError("TODO: 나중에 구현");

// Warning: "Not implemented"
throw new NotImplementedError();
```

## 유틸리티

### createRule

`@typescript-eslint/utils`의 `RuleCreator`를 래핑한 팩토리 함수. 커스텀 규칙 작성 시 사용한다.

```typescript
import { createRule } from "../utils/create-rule";

export default createRule({
  name: "my-rule",
  meta: {
    type: "problem",
    docs: { description: "규칙 설명" },
    messages: { errorId: "에러 메시지" },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // AST visitor
    };
  },
});
```

## 의존성

- `eslint` v9+
- `typescript-eslint` v8+
- `eslint-plugin-import` - import/export 규칙
- `eslint-plugin-unused-imports` - 미사용 import 자동 제거
- `eslint-plugin-solid` - SolidJS 규칙
- `eslint-plugin-tailwindcss` - Tailwind CSS 규칙
- `eslint-import-resolver-typescript` - TypeScript 경로 해석
- `globals` - 글로벌 변수 정의 (node, browser, es2024)
