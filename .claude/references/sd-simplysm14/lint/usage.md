# @simplysm/lint

Simplysm 모노레포 전용 ESLint 플러그인 및 공유 Flat Config 설정. 커스텀 규칙 7개와 권장 설정을 제공한다.

## Installation

```bash
npm install @simplysm/lint
```

## API Overview

### Plugin (`@simplysm/lint/eslint-plugin`)

| API | Type | Description |
|-----|------|-------------|
| `default` | object | `{ rules: {...} }` 형태의 ESLint 플러그인 객체. 7개의 커스텀 규칙을 포함한다 |

#### Rules

| Rule | Type | Fixable | Description |
|------|------|---------|-------------|
| `no-hard-private` | problem | autofix | ECMAScript `#private` 필드를 금지하고 TypeScript `private _` 스타일을 강제한다. 선언(`#field`, `#method()`, `accessor #field`)과 사용(`this.#field`) 모두 감지. 이름 충돌 시 `nameConflict` 메시지 보고 |
| `no-subpath-imports-from-simplysm` | problem | autofix | `@simplysm/*` 패키지에서 `src` 하위 경로 import를 금지한다. 정적 import, 동적 import, re-export 모두 감지. `@simplysm/pkg/src/...` -> `@simplysm/pkg`로 자동 수정 |
| `ts-no-throw-not-implemented-error` | suggestion | - | `@simplysm/core-common`의 `NotImplementedError` 사용을 경고한다. named import, aliased import, namespace import 모두 감지. 동적 import는 미감지 |
| `ts-no-unused-injects` | problem | autofix | 미사용 Angular `inject()` 필드를 감지하여 제거한다. 클래스 내 `inject()` 호출로 초기화된 프로퍼티 중 다른 곳에서 참조되지 않는 필드를 보고 |
| `ts-no-unused-protected-readonly` | problem | autofix | Angular `@Component` 클래스의 미사용 `protected readonly` 필드를 감지하여 제거한다. 인라인 템플릿과 클래스 본문 모두에서 참조 여부를 확인 |
| `ng-template-no-todo-comments` | problem | - | HTML 템플릿 내 `<!-- TODO: ... -->` 주석을 경고한다. raw text regex 방식으로 동작 |
| `ng-template-sd-require-binding-attrs` | problem | autofix | `sd-*` 컴포넌트에서 허용 목록 외 plain attribute 사용을 금지하고 Angular property binding(`[attr]="..."`)을 강제한다 |

#### `ng-template-sd-require-binding-attrs` Options

유일하게 사용자 옵션을 받는 규칙이다.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `selectorPrefixes` | `string[]` | `["sd-"]` | 검사 대상 엘리먼트의 태그명 접두사 목록 |
| `allowAttributes` | `string[]` | `["id", "class", "style", "title", "tabindex", "role"]` | plain attribute로 허용할 속성명 목록 |
| `allowAttributePrefixes` | `string[]` | `["aria-", "data-", "sd-"]` | plain attribute로 허용할 속성명 접두사 목록 |

### Recommended Config (`@simplysm/lint/eslint-recommended`)

| API | Type | Description |
|-----|------|-------------|
| `default` | `FlatConfig.Config[]` | `tseslint.config()`으로 생성된 Flat Config 배열. 커스텀 플러그인과 외부 플러그인을 조합한 권장 설정 |

#### Config 블록 구성

| 파일 패턴 | 적용 플러그인 | 주요 규칙 |
|-----------|-------------|-----------|
| `**/*.js`, `**/*.mjs`, `**/*.cjs` | `@simplysm`, `import`, `unused-imports` | `no-hard-private`, `no-subpath-imports-from-simplysm`, `require-await`, `no-shadow` |
| `**/*.ts` | `@typescript-eslint`, `@simplysm`, `import`, `unused-imports`, `angular-eslint` | 전체 커스텀 규칙 + `require-await`, `strict-boolean-expressions`, `prefer-readonly`, `only-throw-error`, `no-array-delete` 등 |
| `**/*.html` | `@simplysm`, `@angular-eslint/template` (recommended + accessibility) | `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs` |
| `**/tests/**/*.ts` | - | `no-console`, `import/no-extraneous-dependencies`, `ts-no-throw-not-implemented-error` 비활성화 |
| `**/vitest.config.ts` | - | `no-restricted-properties` 비활성화 (`process.env` 접근 허용) |

#### 공유 규칙 변수

| Variable | Description |
|----------|-------------|
| `commonRules` | `eqeqeq` (`null` 비교만 `==` 허용), `no-warning-comments`, `no-self-compare`, `array-callback-return` |
| `noNodeBuiltinsRules` | `Buffer` 전역 사용 금지, `buffer`/`events`/`eventemitter3` import 금지 |
| `noDirectEnvAccessRules` | `process.env` 및 `import.meta.env` 직접 접근 금지 (`env("...")` 사용 강제), `NODE_ENV` 환경변수 사용 금지 |
| `unusedImportsRules` | 미사용 import 자동 제거 (`_` 접두사 변수 무시) |

#### Ignores

`node_modules/`, `dist/`, `.*` (dotfiles), `_*` (underscore-prefixed) 디렉토리를 무시한다.

### Utility (internal)

| API | Type | Description |
|-----|------|-------------|
| `createRule` | const | `ESLintUtils.RuleCreator` 래퍼. 규칙 문서 URL을 자동 생성한다. 패키지 내부에서만 사용되며 entrypoint에서 export되지 않는다 |

## Usage Examples

### Flat Config에서 권장 설정 사용

```typescript
// eslint.config.js
import recommended from "@simplysm/lint/eslint-recommended";

export default [
  ...recommended,
  // 프로젝트별 추가 설정
];
```

### 플러그인만 사용하여 개별 규칙 활성화

```typescript
// eslint.config.js
import plugin from "@simplysm/lint/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": plugin,
    },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
    },
  },
];
```

### `ng-template-sd-require-binding-attrs` 옵션 커스터마이징

```typescript
// eslint.config.js
export default [
  ...recommended,
  {
    files: ["**/*.html"],
    rules: {
      "@simplysm/ng-template-sd-require-binding-attrs": [
        "error",
        {
          selectorPrefixes: ["sd-", "app-"],
          allowAttributes: ["id", "class", "style", "title", "tabindex", "role", "name"],
          allowAttributePrefixes: ["aria-", "data-", "sd-", "app-"],
        },
      ],
    },
  },
];
```
