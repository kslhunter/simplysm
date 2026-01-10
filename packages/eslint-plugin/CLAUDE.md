# eslint-plugin CLAUDE.md

## 패키지 개요

SIMPLYSM 프로젝트를 위한 커스텀 ESLint 플러그인입니다.
TypeScript, Angular 템플릿에 대한 프로젝트 특화 규칙을 제공합니다.

**프로젝트 루트의 [CLAUDE.md](../../CLAUDE.md) 함께 확인하세요.**

---

## 디렉토리 구조

```
packages/eslint-plugin/
├── src/
│   ├── configs/
│   │   └── recommended.ts     # 권장 설정 (JS/TS/HTML)
│   ├── rules/                 # 9개 규칙 구현
│   │   ├── ng-template-no-todo-comments.ts
│   │   ├── ng-template-sd-require-binding-attrs.ts
│   │   ├── no-hard-private.ts
│   │   ├── no-subpath-imports-from-simplysm.ts
│   │   ├── ts-no-buffer-in-typedarray-context.ts
│   │   ├── ts-no-exported-types.ts
│   │   ├── ts-no-throw-not-implement-error.ts
│   │   ├── ts-no-unused-injects.ts
│   │   └── ts-no-unused-protected-readonly.ts
│   ├── utils/
│   │   ├── angular-template.ts # Angular 컴포넌트 템플릿 헬퍼
│   │   ├── createRule.ts       # 규칙 생성 헬퍼
│   │   ├── escapeRegExp.ts     # 정규표현식 이스케이프
│   │   ├── traverse.ts         # AST 순회 헬퍼
│   │   └── typeChecker.ts      # 타입 캐시 헬퍼
│   ├── index.ts               # 메인 진입점
│   └── plugin.ts              # 플러그인 정의
└── tests/                     # 규칙별 테스트
```

---

## 규칙 요약

| 규칙 | 대상 | Fixable | 설명 |
|------|------|---------|------|
| `no-hard-private` | JS/TS | O | ECMAScript `#` → TypeScript `private _` |
| `no-subpath-imports-from-simplysm` | JS/TS | X | `@simplysm/*/src/*` import 금지 |
| `ng-template-no-todo-comments` | HTML | X | 템플릿 내 TODO 주석 경고 |
| `ng-template-sd-require-binding-attrs` | HTML | O | sd-* 컴포넌트에 바인딩 속성 강제 |
| `ts-no-buffer-in-typedarray-context` | TS | X | TypedArray 컨텍스트에서 Buffer 직접 사용 금지 |
| `ts-no-exported-types` | TS | X | 지정된 타입의 public 노출 금지 |
| `ts-no-throw-not-implement-error` | TS | X | NotImplementError throw 경고 |
| `ts-no-unused-injects` | TS | O | 미사용 Angular inject() 필드 감지 |
| `ts-no-unused-protected-readonly` | TS | O | 미사용 protected readonly 필드 감지 |

---

## 규칙 상세

### no-hard-private

ECMAScript `#` private 필드/메서드를 TypeScript `private _` 스타일로 변환합니다.

```typescript
// 위반
class MyClass {
  #field = 1;
  #method() {}
}

// 수정 후
class MyClass {
  private _field = 1;
  private _method() {}
}
```

### no-subpath-imports-from-simplysm

`@simplysm` 패키지의 `src` 서브경로 import를 금지합니다.

```typescript
// 위반
import { X } from "@simplysm/sd-core-common/src/utils";

// 허용
import { X } from "@simplysm/sd-core-common";
```

### ng-template-no-todo-comments

Angular HTML 템플릿 내 `<!-- TODO: ... -->` 주석을 경고합니다.

### ng-template-sd-require-binding-attrs

`sd-*` 컴포넌트에서 plain 속성 대신 Angular 바인딩을 강제합니다.

```html
<!-- 위반 -->
<sd-textfield placeholder="Enter name"></sd-textfield>

<!-- 수정 후 -->
<sd-textfield [placeholder]="'Enter name'"></sd-textfield>
```

**허용되는 plain 속성**:
- `id`, `class`, `style`, `title`, `tabindex`, `role`
- `aria-*`, `data-*`, `sd-*` 접두사

### ts-no-buffer-in-typedarray-context

TypedArray 타입이 기대되는 컨텍스트에서 Buffer를 직접 사용하는 것을 금지합니다.

```typescript
// 위반
const arr: Uint8Array = buffer;

// 허용
const arr: Uint8Array = new Uint8Array(buffer);
```

### ts-no-exported-types

지정된 타입이 public API로 노출되는 것을 금지합니다.
설정에서 금지할 타입과 대체 타입을 지정할 수 있습니다.

### ts-no-throw-not-implement-error

`NotImplementError`를 throw하는 코드에 경고를 표시합니다.
구현되지 않은 코드가 남아있음을 알려주는 용도입니다.

### ts-no-unused-injects

Angular `inject()` 함수로 주입받은 후 사용하지 않는 필드를 감지합니다.
클래스 내 참조뿐만 아니라 `@Component`의 inline `template`에서의 참조도 검사합니다.

```typescript
// 위반 - service가 클래스/템플릿 어디에서도 사용되지 않음
@Component({ template: '<div></div>' })
class MyComponent {
  private service = inject(MyService);
}

// 허용 - 템플릿에서 사용됨
@Component({ template: '<div>{{ userService.name }}</div>' })
class MyComponent {
  userService = inject(UserService);
}
```

**제한사항**: `templateUrl`로 참조된 외부 템플릿 파일은 검사하지 않습니다.

### ts-no-unused-protected-readonly

Angular `@Component` 클래스에서 템플릿이나 클래스 내에서 사용되지 않는 `protected readonly` 필드를 감지합니다.

**제한사항**: `templateUrl`로 참조된 외부 템플릿 파일은 검사하지 않습니다.

---

## 유틸리티 함수

### createRule

`@typescript-eslint/utils`의 `RuleCreator`를 래핑한 규칙 생성 헬퍼입니다.
모든 규칙은 이 함수를 사용하여 일관된 형식으로 생성됩니다.

```typescript
import { createRule } from "../utils/createRule";

export default createRule({
  name: "rule-name",
  meta: { /* ... */ },
  defaultOptions: [],
  create(context) { /* ... */ },
});
```

### traverseNode

AST 노드를 재귀적으로 순회하는 헬퍼입니다.
`parent`, `range`, `loc` 속성은 순회에서 제외됩니다.

```typescript
import { traverseNode } from "../utils/traverse";

traverseNode(classBody, (node) => {
  if (node.type === "Identifier") {
    // 식별자 처리
  }
});
```

### escapeRegExp

정규표현식 특수문자를 이스케이프하는 헬퍼입니다.

```typescript
import { escapeRegExp } from "../utils/escapeRegExp";

const pattern = new RegExp(escapeRegExp(userInput));
```

### createTypeCacheHelper

TypeScript 타입 캐시를 생성하고 캐시된 타입을 반환하는 헬퍼입니다.
`ts-no-buffer-in-typedarray-context`, `ts-no-exported-types` 규칙에서 사용됩니다.

```typescript
import { createTypeCacheHelper } from "../utils/typeChecker";

const parserServices = ESLintUtils.getParserServices(context);
const checker = parserServices.program.getTypeChecker();
const { getCachedType } = createTypeCacheHelper(checker);

const type = getCachedType(tsNode); // 캐시된 타입 반환
```

---

## 테스트 작성 가이드

### 기본 구조

```typescript
import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/rule-name";

// vitest 훅 바인딩 (필수)
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

describe("rule-name 규칙", () => {
  ruleTester.run("rule-name", rule, {
    valid: [{ code: `...` }],
    invalid: [{ code: `...`, errors: [...] }],
  });
});
```

### Angular 템플릿 테스트

```typescript
import { RuleTester } from "eslint";
import { templateParser } from "angular-eslint";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: templateParser,
  },
});
```

### Fixable 규칙 테스트

```typescript
invalid: [
  {
    code: `...`,
    output: `...`,  // 단일 수정
    errors: [...],
  },
  {
    code: `...`,
    output: [`...`, `...`],  // 다중 수정 (여러 패스)
    errors: [...],
  },
]
```

---

## 검증 명령어

```bash
# 타입체크
npx tsc --noEmit -p packages/eslint-plugin/tsconfig.json

# ESLint
yarn run _sd-cli_ lint "packages/eslint-plugin/**/*.ts"

# 테스트
npx vitest run packages/eslint-plugin
```

---

## 권장 설정 사용법

```typescript
// eslint.config.ts
import sdPlugin from "@simplysm/eslint-plugin";

export default [
  ...sdPlugin.configs.root,
];
```
