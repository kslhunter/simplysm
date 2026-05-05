# @simplysm/lint

> Simplysm 모노레포 전용 ESLint 플러그인 및 공유 Flat Config 설정.
> 커스텀 규칙 9개(`@simplysm/*`)와 TypeScript/Angular/HTML 파일별 권장 설정을 제공한다.
> ESLint Flat Config(`eslint.config.js`) 환경에서 동작한다.

## Installation

```bash
npm install @simplysm/lint
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| 프로젝트에 ESLint 설정 적용 | 이 문서의 [Usage Examples](#usage-examples) |
| 개별 규칙만 활성화 | 이 문서의 [Plugin](#plugin-simplysmlinteslint-plugin) |
| 파일 패턴별 적용 규칙 확인 | 이 문서의 [Config 블록 구성](#config-블록-구성) |

## API Overview

### Plugin (`@simplysm/lint/eslint-plugin`)

`{ rules: {...} }` 형태의 ESLint 플러그인 객체. 9개의 커스텀 규칙을 포함한다.

#### Rules

| Rule | Type | Fixable | 언제 쓰나 |
|------|------|---------|-----------|
| `no-hard-private` | problem | autofix | ECMAScript `#private` 필드를 금지하고 TypeScript `private _` 스타일을 강제할 때. 선언(`#field`, `#method()`, `accessor #field`)과 사용(`this.#field`) 모두 감지. 이름 충돌 시 `nameConflict` 메시지 보고 |
| `no-subpath-imports-from-simplysm` | problem | autofix | `@simplysm/*` 패키지에서 `src` 하위 경로 import를 금지할 때. 정적 import, 동적 import, re-export 모두 감지. `@simplysm/pkg/src/...` -> `@simplysm/pkg`로 자동 수정 |
| `ts-no-throw-not-implemented-error` | suggestion | - | `@simplysm/core-common`의 `NotImplementedError`가 프로덕션에 남아있는지 경고할 때. named/aliased/namespace import 감지. 동적 import는 미감지 |
| `ts-no-unused-injects` | problem | autofix | 미사용 Angular `inject()` 필드를 자동 제거할 때. 클래스 내 `inject()` 호출로 초기화된 프로퍼티 중 참조되지 않는 필드를 보고 |
| `ts-no-unused-protected-readonly` | problem | autofix | Angular `@Component` 클래스의 미사용 `protected readonly` 필드를 자동 제거할 때. 인라인 템플릿(`template` 프로퍼티)과 클래스 본문 모두에서 참조 여부를 확인. `@angular/compiler`의 `parseTemplate`으로 템플릿 AST 기반 정확 추출 |
| `ng-no-async-effect` | problem | - | `@angular/core`의 `effect()`에 async 함수 직접 전달을 금지할 때. `await` 이후의 signal read가 의존성으로 추적되지 않는 함정을 방지. named/aliased/namespace import 모두 감지 |
| `ng-template-no-strict-null-check` | problem | - | Angular 템플릿에서 `=== null`/`!== null`/`=== undefined`/`!== undefined` 사용을 금지하고 `== null`/`!= null`로 통일할 때. autofix 미제공(인라인 템플릿 offset 매핑 문제) |
| `ng-template-no-todo-comments` | problem | - | HTML 템플릿 내 `<!-- TODO: ... -->` 주석을 경고할 때. raw text regex 방식으로 동작 |
| `ng-template-sd-require-binding-attrs` | problem | autofix | `sd-*` 컴포넌트에서 허용 목록 외 plain attribute 사용을 금지하고 Angular property binding(`[attr]="..."`)을 강제할 때 |

#### `ng-template-sd-require-binding-attrs` Options

유일하게 사용자 옵션을 받는 규칙이다.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `selectorPrefixes` | `string[]` | `["sd-"]` | 검사 대상 엘리먼트의 태그명 접두사 목록 |
| `allowAttributes` | `string[]` | `["id", "class", "style", "title", "tabindex", "role"]` | plain attribute로 허용할 속성명 목록 |
| `allowAttributePrefixes` | `string[]` | `["aria-", "data-", "sd-"]` | plain attribute로 허용할 속성명 접두사 목록 |

### Recommended Config (`@simplysm/lint/eslint-recommended`)

`tseslint.config()`으로 생성된 `FlatConfig.Config[]` 배열. 커스텀 플러그인과 외부 플러그인(`typescript-eslint`, `angular-eslint`, `eslint-plugin-import`, `eslint-plugin-unused-imports`)을 조합한 권장 설정이다.

#### Config 블록 구성

| 파일 패턴 | 적용 플러그인 | 주요 규칙 |
|-----------|-------------|-----------|
| `**/*.js`, `**/*.mjs`, `**/*.cjs` | `@simplysm`, `import`, `unused-imports` | `no-hard-private`, `no-subpath-imports-from-simplysm`, `require-await`, `no-shadow` |
| `**/*.ts` | `@typescript-eslint`, `@simplysm`, `import`, `unused-imports`, `angular-eslint` | 전체 커스텀 규칙 + `require-await`, `strict-boolean-expressions`, `prefer-readonly`, `only-throw-error`, `no-array-delete` 등 |
| `**/*.html` | `@simplysm`, `@angular-eslint/template` (recommended + accessibility) | `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs` |
| `**/tests/**/*.ts` | - | `no-console`, `import/no-extraneous-dependencies`, `ts-no-throw-not-implemented-error` 비활성화 |
| `**/vitest.config.ts` | - | `no-restricted-properties` 비활성화 (`process.env` 접근 허용) |

#### 공유 규칙 변수

| Variable | Description |
|----------|-------------|
| `commonRules` | `eqeqeq` (`null` 비교만 `==` 허용), `no-warning-comments`, `no-self-compare`, `array-callback-return` |
| `noNodeBuiltinsRules` | `Buffer` 전역 사용 금지, `buffer`/`events`/`eventemitter3` import 금지 |
| `noDirectEnvAccessRules` | `process.env` 및 `import.meta.env` 직접 접근 금지 (`env("...")` 사용 강제), `NODE_ENV` 환경변수 사용 금지, `=== undefined` / `!== undefined` 비교 금지 (`== null` / `!= null` 사용 강제) |
| `unusedImportsRules` | 미사용 import 자동 제거 (`_` 접두사 변수 무시) |

#### Ignores

`**/node_modules/**`, `**/dist/**`, `**/.*/**` (dotfiles 디렉토리)를 무시한다.

## Usage Examples

### 최소 예제: Flat Config에서 권장 설정 사용

```typescript
// eslint.config.js
import recommended from "@simplysm/lint/eslint-recommended";

export default [
  ...recommended,
];
```

대부분의 경우 이것만으로 충분하다. 권장 설정에 TS/JS/HTML 파일별 규칙이 모두 포함되어 있다.

### 전형 예제: 플러그인만 사용하여 개별 규칙 활성화

```typescript
// eslint.config.js
import plugin from "@simplysm/lint/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": plugin,
    },
    rules: {
      // 규칙명 앞에 반드시 "@simplysm/" 네임스페이스를 붙인다
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
    },
  },
];
```

### 전형 예제: `ng-template-sd-require-binding-attrs` 옵션 커스터마이징

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
          selectorPrefixes: ["sd-", "app-"],  // "app-" 접두사 컴포넌트도 검사 대상에 추가
          allowAttributes: ["id", "class", "style", "title", "tabindex", "role", "name"],
          allowAttributePrefixes: ["aria-", "data-", "sd-", "app-"],
        },
      ],
    },
  },
];
```

## 🚫 Anti-patterns

### effect()에서 async 콜백 사용

```typescript
// ❌ await 이후 signal read가 의존성으로 추적되지 않는다
effect(async () => {
  const val = this.someSignal();
  await this.doAsync();
});

// ✅ 동기 콜백에서 signal을 읽고, 비동기 작업은 untracked 내부에서 수행
effect(() => {
  this.someSignal();
  void untracked(async () => {
    await this.doAsync();
  });
});
```

**근거**: `effect()` 콜백이 async면 `await` 이후의 signal read는 reactive context를 벗어나 추적되지 않으며, 반환값이 `Promise<void>`가 되어 `EffectCleanupFn` 등록도 불가능하다.

### recommended 설정과 중복 규칙 선언

```typescript
// ❌ recommended에 이미 포함된 규칙을 다시 선언
export default [
  ...recommended,
  {
    rules: {
      "@simplysm/no-hard-private": "error",  // 이미 recommended에 포함
    },
  },
];

// ✅ recommended만 spread하면 충분. 오버라이드가 필요한 경우에만 재선언
export default [
  ...recommended,
];
```

**근거**: `eslint-recommended`에 모든 커스텀 규칙이 파일 패턴별로 이미 설정되어 있다. 중복 선언은 유지보수 부담만 증가시킨다.

## 이 패키지를 쓰지 말아야 할 때

- Simplysm 모노레포 코딩 규칙(`#private` 금지, `Buffer` 금지, `process.env` 직접 접근 금지 등)을 따르지 않는 프로젝트 -- 범용 ESLint 설정이 아니므로 해당 규칙이 불필요한 프로젝트에는 적합하지 않다.
- Angular를 사용하지 않는 프로젝트에서 `eslint-recommended`를 그대로 사용하는 경우 -- Angular 관련 플러그인/규칙이 포함되어 있으므로 불필요한 의존성이 추가된다. 플러그인만 import하여 필요한 규칙만 개별 활성화한다.
