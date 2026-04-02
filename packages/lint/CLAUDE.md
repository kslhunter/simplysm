# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/lint` — Simplysm 모노레포 전용 ESLint 플러그인 및 공유 설정. 소스 파일 10개 (`src/rules/` 7개, `src/utils/` 1개, 진입점 2개).

두 가지 진입점을 exports한다:
- `./eslint-plugin` — `@simplysm` 네임스페이스로 등록하는 커스텀 규칙 모음
- `./eslint-recommended` — 위 플러그인과 외부 플러그인(`typescript-eslint`, `angular-eslint`, `eslint-plugin-import`, `eslint-plugin-unused-imports`)을 조합한 Flat Config 배열

## Architecture

```
src/
├── eslint-plugin.ts        ← 커스텀 규칙을 { rules: {...} } 형태로 묶어 내보냄
├── eslint-recommended.ts   ← tseslint.config()로 Flat Config 배열 생성
├── rules/
│   ├── no-hard-private.ts                    ← TS/JS: ECMAScript # private 금지
│   ├── no-subpath-imports-from-simplysm.ts   ← TS/JS: @simplysm/pkg/src/... import 금지
│   ├── ts-no-throw-not-implemented-error.ts  ← TS:    NotImplementedError 사용 경고
│   ├── ts-no-unused-injects.ts               ← TS:    미사용 inject() 필드 제거
│   ├── ts-no-unused-protected-readonly.ts    ← TS:    미사용 protected readonly 필드 제거
│   ├── ng-template-no-todo-comments.ts       ← HTML:  템플릿 내 TODO 주석 경고
│   └── ng-template-sd-require-binding-attrs.ts ← HTML: sd-* 컴포넌트 plain attr 금지
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

- `no-*` 접두사 — JS/TS 파일 모두에 적용 (`**/*.js`, `**/*.ts`)
- `ts-*` 접두사 — TypeScript 파일에만 적용 (`**/*.ts`), `@typescript-eslint/utils` 사용
- `ng-template-*` 접두사 — Angular HTML 템플릿에만 적용 (`**/*.html`), `@angular-eslint/utils` 사용

### Recommended Config 구조

`eslint-recommended.ts`는 `tseslint.config()`로 Flat Config 배열을 반환하며, 파일 유형별로 별도 config 블록을 구성한다:

| 파일 패턴 | 적용 플러그인 | 핵심 규칙 |
|---|---|---|
| `**/*.js`, `**/*.mjs`, `**/*.cjs` | `@simplysm`, `import`, `unused-imports` | `no-hard-private`, `no-subpath-imports-from-simplysm` |
| `**/*.ts` | `@typescript-eslint`, `@simplysm`, `import`, `unused-imports` | 전체 커스텀 규칙 + TS 엄격 규칙 |
| `**/*.html` | `@simplysm`, `@angular-eslint/template` | `ng-template-*` 2개 규칙 |
| `**/tests/**/*.ts` | — | `no-console`, `import/no-extraneous-dependencies` 비활성화 |

### AST 순회 헬퍼

`ts-no-unused-injects.ts`와 `ts-no-unused-protected-readonly.ts`는 동일한 `traverseNode()` 헬퍼 함수를 각 파일 내에 직접 정의한다 (`parent`, `range`, `loc` 키를 건너뛰며 재귀 순회).

## Testing

**프레임워크**: Vitest + `@typescript-eslint/rule-tester`

`@typescript-eslint/rule-tester`는 Vitest를 직접 지원하지 않으므로, `tests/vitest.setup.ts`에서 수동으로 바인딩한다.

```typescript
// tests/vitest.setup.ts — 모든 규칙 테스트 파일에서 첫 줄에 import
import "./vitest.setup";
```

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

`recommended.spec.ts`는 `RuleTester`를 사용하지 않고 Flat Config 배열의 구조를 직접 검증하는 단위 테스트이다.

## 컴파일러 설정

`tsconfig.json`은 루트 설정을 상속하며 `lib: ["ESNext"]`와 `outDir: "./dist"` 만 재정의한다. Node.js 타입은 `typeRoots: ["./node_modules/@types"]`로 패키지 로컬 `@types/node`를 사용한다.
