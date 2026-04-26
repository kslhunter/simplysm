# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/lint/README.md`를 참조한다.

## Package Overview

`@simplysm/lint`는 Simplysm 규칙을 담은 ESLint 플러그인과 공유 Flat Config를 제공한다. 소스 파일은 12개이며, 진입점 2개, 규칙 9개, 유틸 1개로 구성된다.

공개 진입점:

- `./eslint-plugin`: `@simplysm` 네임스페이스로 등록하는 커스텀 규칙 9개를 `{ rules: {...} }` 형태로 export한다.
- `./eslint-recommended`: 커스텀 플러그인과 `typescript-eslint`, `angular-eslint`, `eslint-plugin-import`, `eslint-plugin-unused-imports`를 조합한 Flat Config 배열을 default export한다.

## Architecture

```text
src/
├── eslint-plugin.ts
├── eslint-recommended.ts
├── rules/
│   ├── ng-no-async-effect.ts
│   ├── ng-template-no-strict-null-check.ts
│   ├── ng-template-no-todo-comments.ts
│   ├── ng-template-sd-require-binding-attrs.ts
│   ├── no-hard-private.ts
│   ├── no-subpath-imports-from-simplysm.ts
│   ├── ts-no-throw-not-implemented-error.ts
│   ├── ts-no-unused-injects.ts
│   └── ts-no-unused-protected-readonly.ts
└── utils/
    └── create-rule.ts
```

- `eslint-plugin.ts`는 각 규칙 모듈의 default export를 `rules` 객체에 매핑한다.
- `eslint-recommended.ts`는 JS, TS, HTML, 테스트, Vitest 설정 파일별 Flat Config 블록을 구성한다.
- `rules/`는 `createRule()`로 생성한 ESLint 규칙 구현을 둔다.
- `utils/create-rule.ts`는 `ESLintUtils.RuleCreator` 래퍼이며 규칙 문서 URL을 생성한다.

## Key Patterns

### Rule Creator 사용

모든 규칙은 `../utils/create-rule`의 `createRule()`로 생성한다. 옵션이 없는 규칙은 `schema: []`와 `defaultOptions: []`를 함께 둔다.

```typescript
import { createRule } from "../utils/create-rule";

export default createRule({
  name: "rule-name",
  meta: {
    type: "problem",
    docs: { description: "..." },
    schema: [],
    messages: {
      messageId: "message",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // AST visitor
    };
  },
});
```

### 규칙 파일 분류

- `no-*`: JS/TS 양쪽에서 사용하는 일반 규칙이다.
- `ts-*`: TypeScript 파일에 적용하며 `@typescript-eslint/utils`의 ESTree 타입을 사용한다.
- `ng-*`: Angular TS 코드나 Angular 템플릿에 적용한다.
- `ng-template-*`: Angular 템플릿 파서 서비스를 사용하거나 HTML 원문을 검사한다.

### Angular import 추적

`ng-no-async-effect`와 `ts-no-throw-not-implemented-error`는 `ASTUtils.findVariable()`과 import definition을 사용해 named import, alias import, namespace import를 구분한다. 로컬에 선언된 같은 이름의 식별자는 외부 import로 취급하지 않는다.

### Template AST 처리

Angular 템플릿 규칙은 두 방식으로 나뉜다.

- `ng-template-no-strict-null-check`, `ng-template-sd-require-binding-attrs`: `getTemplateParserServices()` 기반으로 템플릿 AST 위치를 ESLint location으로 변환한다.
- `ng-template-no-todo-comments`: HTML 주석 원문에서 `TODO:`를 찾고, AST visitor 없이 `{}`를 반환한다.

`ts-no-unused-protected-readonly`는 `@angular/compiler`의 `parseTemplate()`으로 인라인 템플릿을 분석하며, `@let`, `@if`, `@for`, `@switch`, `@defer`의 로컬 변수 스코프를 별도로 추적한다.

### Recommended Config 구성

`eslint-recommended.ts`는 `tseslint.config()` 호출 하나로 Flat Config 배열을 만든다.

| 파일 패턴 | 역할 |
|-----------|------|
| `**/*.js`, `**/*.mjs`, `**/*.cjs` | JS 기본 규칙, import 규칙, unused imports, Simplysm 일반 규칙을 적용 |
| `**/*.ts` | Angular inline template processor, TypeScript 엄격 규칙, 모든 TS/Angular Simplysm 규칙을 적용 |
| `**/*.html` | Angular template recommended/accessibility와 Simplysm 템플릿 규칙을 적용 |
| `**/tests/**/*.ts` | 테스트에서 `no-console`, `import/no-extraneous-dependencies`, `ts-no-throw-not-implemented-error`를 끈다 |
| `**/vitest.config.ts` | Vitest 설정에서 env 접근 제한을 끈다 |

## Testing

테스트는 `packages/lint/tests`에 규칙별 `*.spec.ts`와 `recommended.spec.ts`로 분리되어 있다.

규칙 테스트는 `@typescript-eslint/rule-tester`를 사용한다. Vitest와 연결하기 위해 규칙 테스트 파일 첫 줄에 `import "./vitest.setup";`을 둔다.

```typescript
import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/my-rule";

const ruleTester = new RuleTester();

describe("my-rule", () => {
  ruleTester.run("my-rule", rule, {
    valid: [{ code: "..." }],
    invalid: [
      {
        code: "...",
        output: "...",
        errors: [{ messageId: "messageId" }],
      },
    ],
  });
});
```

`recommended.spec.ts`는 Flat Config 배열의 구조, 플러그인 등록, 파일 패턴별 규칙 포함 여부를 검증한다.

## 컴파일러 설정

패키지 `tsconfig.json`은 루트 설정을 상속하고 패키지 고유 설정만 추가한다.

- `lib: ["ESNext"]`
- `outDir: "./dist"`
- `typeRoots: ["./node_modules/@types"]`
