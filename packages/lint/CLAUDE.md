# CLAUDE.md

> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/lint` -- Simplysm 모노레포 전용 ESLint 플러그인 및 공유 설정. 소스 파일 12개 (`src/rules/` 9개, `src/utils/` 1개, 진입점 2개).

두 가지 진입점을 exports한다:
- `./eslint-plugin` -- `@simplysm` 네임스페이스로 등록하는 커스텀 규칙 9개를 `{ rules: {...} }` 형태로 내보냄
- `./eslint-recommended` -- 위 플러그인과 외부 플러그인(`typescript-eslint`, `angular-eslint`, `eslint-plugin-import`, `eslint-plugin-unused-imports`)을 조합한 Flat Config 배열

## Architecture

```
src/
├── eslint-plugin.ts        ← 커스텀 규칙을 { rules: {...} } 형태로 묶어 내보냄
├── eslint-recommended.ts   ← tseslint.config()로 Flat Config 배열 생성
├── rules/
│   ├── no-hard-private.ts                    ← TS/JS: ECMAScript # private 금지, autofix
│   ├── no-subpath-imports-from-simplysm.ts   ← TS/JS: @simplysm/pkg/src/... import 금지, autofix
│   ├── ts-no-throw-not-implemented-error.ts  ← TS:    NotImplementedError 사용 경고 (suggestion)
│   ├── ts-no-unused-injects.ts               ← TS:    미사용 inject() 필드 제거, autofix
│   ├── ts-no-unused-protected-readonly.ts    ← TS:    미사용 protected readonly 필드 제거, autofix
│   ├── ng-no-async-effect.ts                 ← TS:    @angular/core의 effect()에 async 함수 전달 금지
│   ├── ng-template-no-strict-null-check.ts   ← HTML:  템플릿에서 `===`/`!==` null/undefined 비교 금지
│   ├── ng-template-no-todo-comments.ts       ← HTML:  템플릿 내 TODO 주석 경고
│   └── ng-template-sd-require-binding-attrs.ts ← HTML: sd-* 컴포넌트 plain attr 금지, autofix
└── utils/
    └── create-rule.ts      ← ESLintUtils.RuleCreator 래퍼 (문서 URL 자동 생성)
```

## Key Patterns

### 규칙 정의 패턴

모든 규칙은 `createRule()`로 생성한다. `createRule`은 `@typescript-eslint/utils`의 `ESLintUtils.RuleCreator` 래퍼이다.

```typescript
import { createRule } from "../utils/create-rule";

export default createRule({
  name: "rule-name",
  meta: {
    type: "problem" | "suggestion",
    docs: { description: "..." },
    fixable: "code",      // autofix가 있을 때만 포함
    schema: [],           // 옵션 없으면 빈 배열
    messages: {
      messageId: "메시지 템플릿 {{placeholder}}",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // AST 노드 방문자
    };
  },
});
```

### 규칙 분류

- `no-*` 접두사 -- JS/TS 파일 모두에 적용 (`**/*.js`, `**/*.ts`)
- `ts-*` 접두사 -- TypeScript 파일에만 적용 (`**/*.ts`), `@typescript-eslint/utils`의 AST 타입 사용
- `ng-*` 접두사 (`ng-template-*` 제외) -- TypeScript 파일에만 적용 (`**/*.ts`), Angular 런타임 API(예: `effect()`) 사용 패턴을 스코프 체인으로 추적하여 검사
- `ng-template-*` 접두사 -- Angular HTML 템플릿에만 적용 (`**/*.html`), `@angular-eslint/utils`의 `getTemplateParserServices` 사용

### Recommended Config 구조

`eslint-recommended.ts`는 `tseslint.config()`로 Flat Config 배열을 반환하며, 파일 유형별로 별도 config 블록을 구성한다:

| 파일 패턴 | 적용 플러그인 | 핵심 규칙 |
|---|---|---|
| `**/*.js`, `**/*.mjs`, `**/*.cjs` | `@simplysm`, `import`, `unused-imports` | `no-hard-private`, `no-subpath-imports-from-simplysm`, `require-await` |
| `**/*.ts` | `@typescript-eslint`, `@simplysm`, `import`, `unused-imports`, `angular-eslint` | 전체 커스텀 규칙 + TS 엄격 규칙 (`require-await`, `strict-boolean-expressions`, `prefer-readonly`, `only-throw-error`, `no-array-delete` 등) |
| `**/*.html` | `@simplysm`, `@angular-eslint/template` (recommended + accessibility) | `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs` |
| `**/tests/**/*.ts` | -- | `no-console`, `import/no-extraneous-dependencies`, `ts-no-throw-not-implemented-error` 비활성화 |
| `**/vitest.config.ts` | -- | `no-restricted-properties` 비활성화 (`process.env` 접근 허용) |

공유 규칙 변수: `commonRules` (eqeqeq, no-warning-comments 등), `noNodeBuiltinsRules` (Buffer/events/eventemitter3 금지), `noDirectEnvAccessRules` (process.env/import.meta.env 직접 접근 금지, NODE_ENV 사용 금지), `unusedImportsRules` (미사용 import 자동 제거).

### AST 순회 헬퍼

`ts-no-unused-injects.ts`와 `ts-no-unused-protected-readonly.ts`는 유사한 `traverseNode()` 헬퍼 함수를 각 파일 내에 직접 정의한다. 두 구현 모두 `parent` 키를 건너뛰며 재귀 순회하고, `ts-no-unused-protected-readonly.ts`는 추가로 `range`, `loc` 키도 건너뛴다.

### ng-template-sd-require-binding-attrs 옵션

유일하게 사용자 옵션(schema)을 가진 규칙이다. `RuleOptions` 인터페이스로 정의되며, 기본값은:
- `selectorPrefixes`: `["sd-"]`
- `allowAttributes`: `["id", "class", "style", "title", "tabindex", "role"]`
- `allowAttributePrefixes`: `["aria-", "data-", "sd-"]`

## Testing

**프레임워크**: Vitest + `@typescript-eslint/rule-tester`

`@typescript-eslint/rule-tester`는 Vitest를 직접 지원하지 않으므로, `tests/vitest.setup.ts`에서 수동으로 바인딩한다. 모든 규칙 테스트 파일의 첫 줄에 `import "./vitest.setup"` 필수.

규칙 테스트는 `RuleTester.run()`을 `describe` 블록 내에서 호출하는 패턴을 사용한다:

```typescript
import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/my-rule";

const ruleTester = new RuleTester();

describe("my-rule", () => {
  describe("valid cases", () => {
    ruleTester.run("my-rule", rule, {
      valid: [{ code: `...` }],
      invalid: [],
    });
  });

  describe("autofix test", () => {
    ruleTester.run("my-rule", rule, {
      valid: [],
      invalid: [
        {
          code: `before`,
          output: `after`,
          errors: [{ messageId: "messageId" }],
        },
      ],
    });
  });
});
```

테스트 파일 10개: 각 규칙 9개에 대한 개별 spec 파일 + `recommended.spec.ts` (Flat Config 배열 구조 검증, `RuleTester` 미사용).

## 컴파일러 설정

`tsconfig.json`은 루트 설정을 상속하며 `lib: ["ESNext"]`와 `outDir: "./dist"` 만 재정의한다. Node.js 타입은 `typeRoots: ["./node_modules/@types"]`로 패키지 로컬 `@types/node`를 사용한다.
