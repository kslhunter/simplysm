# @simplysm/eslint-plugin

심플리즘 프레임워크의 ESLint 플러그인입니다. 프로젝트 컨벤션을 강제하기 위한 커스텀 규칙들을 제공합니다.

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

ECMAScript private 필드(`#field`) 사용을 제한합니다. TypeScript의 `private` 키워드 사용을 권장합니다.

**자동 수정 가능**: `--fix` 옵션으로 자동 변환됩니다.

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

`@simplysm/*` 패키지의 `/src/` 경로 임포트를 금지합니다.

**자동 수정 가능**: `--fix` 옵션으로 패키지 루트 경로로 자동 변환됩니다.

```typescript
// Bad
import { Foo } from "@simplysm/sd-core-common/src/types/DateOnly";

// Good
import { Foo } from "@simplysm/sd-core-common";
```

### ts-no-throw-not-implemented-error

`NotImplementedError`를 throw하는 코드에 대해 경고합니다. 미구현 코드가 프로덕션에 포함되는 것을 방지합니다.

```typescript
// Warning
throw new NotImplementedError();
```

## recommended 설정

recommended 설정에는 다음이 포함됩니다:

- TypeScript ESLint 권장 규칙
- Import 정리 규칙
- 심플리즘 커스텀 규칙

## 라이선스

Apache-2.0
