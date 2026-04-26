# @simplysm/lint

> Simplysm 규칙을 담은 ESLint 플러그인과 공유 Flat Config를 제공한다.
> ESLint Flat Config 환경에서 사용하며, TypeScript와 Angular 템플릿 프로젝트에 맞춘 규칙을 포함한다.
> 권장 설정은 Simplysm 코딩 규칙을 전제로 하므로 범용 ESLint preset으로 쓰지 않는다.

## Installation

```bash
npm install @simplysm/lint
```

## 하려는 작업 → 읽을 파일

### ESLint 설정하기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 프로젝트에 Simplysm 권장 ESLint Flat Config를 적용할 때 | 이 문서의 [`@simplysm/lint/eslint-recommended`](#simplysmlinteslint-recommended) |
| 권장 설정 전체가 아니라 일부 커스텀 규칙만 직접 켤 때 | 이 문서의 [`@simplysm/lint/eslint-plugin`](#simplysmlinteslint-plugin) |
| JS, TS, HTML, 테스트 파일에 어떤 규칙 블록이 적용되는지 확인할 때 | 이 문서의 [`@simplysm/lint/eslint-recommended`](#simplysmlinteslint-recommended) |

### 규칙 동작 확인하기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| `#private` 필드, `@simplysm/*/src` import, 미사용 `inject()` 필드 같은 커스텀 규칙의 이름과 용도를 확인할 때 | 이 문서의 [`@simplysm/lint/eslint-plugin`](#simplysmlinteslint-plugin) |
| `sd-*` Angular 컴포넌트에서 plain attribute를 property binding으로 강제할 때 | 이 문서의 [`@simplysm/lint/eslint-plugin`](#simplysmlinteslint-plugin) |
| `effect(async () => ...)`나 Angular 템플릿 null 비교 규칙을 권장 설정으로 적용할 때 | 이 문서의 [`@simplysm/lint/eslint-recommended`](#simplysmlinteslint-recommended) |

## `@simplysm/lint/eslint-plugin`

> **읽어야 하는 상황**: 권장 설정을 사용하지 않고 `@simplysm` 커스텀 ESLint 규칙만 직접 등록해야 할 때. 프로젝트 전체 Simplysm 기본 규칙을 한 번에 적용하려면 [`@simplysm/lint/eslint-recommended`](#simplysmlinteslint-recommended)를 먼저 사용한다.

## When to use

- ✅ 이런 상황에 사용: Flat Config에서 `plugins: { "@simplysm": plugin }` 형태로 플러그인을 등록하고 필요한 규칙만 직접 활성화한다.
- ❌ 이런 상황엔 대신 [`@simplysm/lint/eslint-recommended`](#simplysmlinteslint-recommended) — JS/TS/HTML 파일 패턴별 기본 규칙과 외부 플러그인 조합이 모두 필요하다.

## Signature

```typescript
declare const plugin: {
  rules: {
    "ng-no-async-effect": typeof ngNoAsyncEffect;
    "ng-template-no-strict-null-check": typeof ngTemplateNoStrictNullCheck;
    "ng-template-no-todo-comments": typeof ngTemplateNoTodoComments;
    "ng-template-sd-require-binding-attrs": typeof ngTemplateSdRequireBindingAttrs;
    "no-hard-private": typeof noHardPrivate;
    "no-subpath-imports-from-simplysm": typeof noSubpathImportsFromSimplysm;
    "ts-no-throw-not-implemented-error": typeof tsNoThrowNotImplementedError;
    "ts-no-unused-injects": typeof tsNoUnusedInjects;
    "ts-no-unused-protected-readonly": typeof tsNoUnusedProtectedReadonly;
  };
};

export default plugin;
```

## Usage

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

## Rules

| Rule | Type | Fixable | 언제 쓰나 |
|------|------|---------|-----------|
| `ng-no-async-effect` | problem | - | `@angular/core`의 `effect()`에 async 함수를 직접 전달하지 못하게 할 때 |
| `ng-template-no-strict-null-check` | problem | - | Angular 템플릿에서 `=== null`, `!== null`, `=== undefined`, `!== undefined` 대신 `== null`, `!= null`을 쓰게 할 때 |
| `ng-template-no-todo-comments` | problem | - | HTML 템플릿 안의 `<!-- TODO: ... -->` 주석을 경고할 때 |
| `ng-template-sd-require-binding-attrs` | problem | code | `sd-*` 컴포넌트의 허용되지 않은 plain attribute를 `[attr]="..."` property binding으로 바꾸게 할 때 |
| `no-hard-private` | problem | code | ECMAScript `#private` 멤버를 TypeScript `private _name` 멤버로 바꾸게 할 때 |
| `no-subpath-imports-from-simplysm` | problem | code | `@simplysm/pkg/src/...` subpath import를 `@simplysm/pkg` 공개 API import로 바꾸게 할 때 |
| `ts-no-throw-not-implemented-error` | problem | - | `@simplysm/core-common`의 `NotImplementedError` 생성이 남아 있는지 경고할 때 |
| `ts-no-unused-injects` | problem | code | Angular `inject()`로 초기화했지만 클래스 안에서 참조되지 않는 필드를 제거할 때 |
| `ts-no-unused-protected-readonly` | problem | code | Angular 컴포넌트의 인라인 템플릿과 클래스 본문에서 쓰이지 않는 `protected readonly` 필드를 제거할 때 |

## Related Types

### `RuleOptions`

`ng-template-sd-require-binding-attrs` 규칙만 사용자 옵션을 받는다.

```typescript
export interface RuleOptions {
  selectorPrefixes?: string[];
  allowAttributes?: string[];
  allowAttributePrefixes?: string[];
}
```

| Field | Type | 채우는 값 |
|-------|------|-----------|
| `selectorPrefixes` | `string[]` | 검사 대상 element tag 접두사 목록. 기본값은 `["sd-"]`이다. |
| `allowAttributes` | `string[]` | plain attribute로 허용할 정확한 속성명 목록. 기본값은 `["id", "class", "style", "title", "tabindex", "role"]`이다. |
| `allowAttributePrefixes` | `string[]` | plain attribute로 허용할 속성명 접두사 목록. 기본값은 `["aria-", "data-", "sd-"]`이다. |

옵션 커스터마이징 예:

```typescript
// eslint.config.js
import recommended from "@simplysm/lint/eslint-recommended";

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

## Anti-patterns

### `effect()`에 async 콜백 직접 전달

```typescript
// 잘못된 예: await 이후 signal read가 의존성으로 추적되지 않는다.
effect(async () => {
  this.someSignal();
  await this.doAsync();
});

// 올바른 예: 동기 콜백에서 signal을 읽고 비동기 작업을 untracked 내부로 분리한다.
effect(() => {
  this.someSignal();
  void untracked(async () => {
    await this.doAsync();
  });
});
```

**근거**: `ng-no-async-effect` 규칙의 JSDoc은 async effect callback이 `await` 이후 signal read 추적과 `EffectCleanupFn` 등록을 깨뜨린다고 설명한다.

## `@simplysm/lint/eslint-recommended`

> **읽어야 하는 상황**: Simplysm 프로젝트에 JS, TS, Angular HTML 파일별 권장 ESLint 규칙을 한 번에 적용해야 할 때. 일부 규칙만 직접 등록해야 하면 [`@simplysm/lint/eslint-plugin`](#simplysmlinteslint-plugin)을 사용한다.

## When to use

- ✅ 이런 상황에 사용: `eslint.config.js`에서 `...recommended`를 spread하여 Simplysm 기본 규칙과 Angular/TypeScript ESLint 구성을 한 번에 적용한다.
- ❌ 이런 상황엔 대신 [`@simplysm/lint/eslint-plugin`](#simplysmlinteslint-plugin) — Angular 의존성이나 Simplysm 전체 규칙 세트가 필요하지 않고 커스텀 규칙 일부만 켠다.

## Signature

```typescript
import tseslint, { type FlatConfig } from "typescript-eslint";

declare const recommended: FlatConfig.ConfigArray;

export default recommended;
```

## Usage

```typescript
// eslint.config.js
import recommended from "@simplysm/lint/eslint-recommended";

export default [
  ...recommended,
];
```

## Config Blocks

| 파일 패턴 | 적용 내용 |
|-----------|-----------|
| 전역 | `**/node_modules/**`, `**/dist/**`, `**/.*/**` 경로를 무시한다. |
| `**/*.js`, `**/*.mjs`, `**/*.cjs` | Node global, `import`, `@simplysm`, `unused-imports` 플러그인과 JS 기본 규칙을 적용한다. |
| `**/*.ts` | `angular.processInlineTemplates`, TypeScript parser, import resolver, TypeScript 엄격 규칙, Simplysm TS 규칙을 적용한다. |
| `**/*.html` | Angular template recommended/accessibility config와 Simplysm 템플릿 규칙을 적용한다. |
| `**/tests/**/*.ts` | 테스트 파일에서 `no-console`, `import/no-extraneous-dependencies`, `@simplysm/ts-no-throw-not-implemented-error`를 끈다. |
| `**/vitest.config.ts` | Vitest 설정 파일에서 `no-restricted-properties`를 끈다. |

## Included Rule Groups

| 그룹 | 언제 쓰나 |
|------|-----------|
| `commonRules` | `eqeqeq`에서 null 비교만 loose equality로 허용하고, self compare와 callback return 누락을 막을 때 |
| `noNodeBuiltinsRules` | `Buffer`, `buffer`, `events`, `eventemitter3` 사용을 금지하고 Simplysm 대체 API를 쓰게 할 때 |
| `noDirectEnvAccessRules` | `process.env`, `import.meta.env`, `NODE_ENV`, `=== undefined`, `!== undefined` 사용을 막을 때 |
| `unusedImportsRules` | 미사용 import를 error로 보고하고, `_` 접두사 변수나 인자는 허용할 때 |

## 이 패키지를 쓰지 말아야 할 때

- Simplysm 코딩 규칙을 따르지 않는 프로젝트에는 `eslint-recommended`를 적용하지 않는다.
- Angular를 사용하지 않는 프로젝트에서 Angular 의존성과 템플릿 규칙이 필요 없으면 `eslint-plugin`만 import해 필요한 규칙을 직접 등록한다.

---

> API 이름으로 검색: 이 패키지는 README 단독 구조이며 공개 Entry는 `@simplysm/lint/eslint-plugin`, `@simplysm/lint/eslint-recommended` 두 개다.
