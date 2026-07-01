# @simplysm/lint

심플리즘 ESLint 패키지. 루트 `src/index.ts` 는 없고, 공개 진입점은 `eslint-plugin` 과 `eslint-recommended` subpath 의 default export 2개다.

## 사용 트리거 인덱스

- **eslint-plugin** — `@simplysm` ESLint plugin 객체를 직접 등록하거나, 커스텀 규칙 9종의 검사 대상·옵션·autofix 를 확인할 때. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- **eslint-recommended** — JS·TS·HTML·tests 파일군에 적용되는 완성형 ESLint flat config 프리셋을 프로젝트 설정에 붙이거나 활성 규칙을 확인할 때. 자세히: [recommended.md](./recommended.md) / 사용법: [client-rules.md](../../manuals/client-rules.md), [logging.md](../../manuals/logging.md)

## 공개 진입점

### `@simplysm/lint/eslint-plugin`

```ts
export default {
  rules: Record<string, RuleModule>;
}
```

- `rules: Record<string, RuleModule>` — 규칙 id 를 규칙 객체로 매핑한다. id 는 `ng-no-async-effect`, `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly`.

### `@simplysm/lint/eslint-recommended`

```ts
export default FlatConfig[];
```

- `FlatConfig[]` — `typescript-eslint` 의 `config(...)` 결과 배열. ignore, 공통 languageOptions, JS 블록, angular TS 권장 블록, TS 블록, HTML 블록, tests 오버라이드, vitest config 오버라이드가 배열 순서대로 들어간다.
