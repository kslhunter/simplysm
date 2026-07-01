# @simplysm/lint

심플리즘 커스텀 ESLint 패키지. `src/index.ts` 는 없고, `package.json#exports` 가 노출하는 공개 진입점은 subpath 2개의 default export 뿐이다.

- `@simplysm/lint/eslint-plugin` — 커스텀 규칙 9종을 담은 ESLint plugin 객체.
- `@simplysm/lint/eslint-recommended` — JS·TS·HTML·tests 파일군에 적용되는 완성형 flat config 프리셋 배열.

다른 `@simplysm/*` 패키지에 의존하지 않는 독립 ESLint 패키지다.

## 사용 트리거 인덱스

- **eslint-plugin** — `@simplysm` plugin 을 직접 등록하거나, 커스텀 규칙 9종의 검사 대상·옵션·autofix 를 확인할 때. 자세히: [rules.md](./rules.md) / 사용법: [client-rules.md](../../manuals/client-rules.md)
- **eslint-recommended** — 프로젝트 lint 설정에 표준 규칙 세트를 붙이거나, 어떤 규칙이 어떤 파일군에 어떤 옵션으로 켜지는지 확인할 때. 자세히: [recommended.md](./recommended.md) / 사용법: [client-rules.md](../../manuals/client-rules.md), [logging.md](../../manuals/logging.md)

## 공개 진입점

### `@simplysm/lint/eslint-plugin`

```ts
export default {
  rules: Record<string, RuleModule>;
}
```

- `rules: Record<string, RuleModule>` — 규칙 id 를 규칙 객체로 매핑한다. `eslint-plugin.ts` 가 각 rule 파일의 default export 를 그대로 이 필드 아래 둔다. id 9종: `ng-no-async-effect`, `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly`. 각 규칙의 동작·옵션은 [rules.md](./rules.md) 참조.
- 플러그인 등록 시 규칙은 `@simplysm/<id>` 이름으로 켠다. (id 에 `@simplysm/` 접두사를 붙이지 않고 plugin 키로 namespace 가 정해진다.)

### `@simplysm/lint/eslint-recommended`

```ts
export default tseslint.config(...configs); // FlatConfig[]
```

- `FlatConfig[]` — `typescript-eslint` 의 `config(...)` 결과 배열. 배열 순서: ignores → 공통 languageOptions → JS 파일 블록 → `...angular.configs.tsRecommended` → TS 파일 블록 → HTML 파일 블록 → tests 오버라이드 → vitest.config 오버라이드. 각 블록의 files·plugins·규칙·옵션은 [recommended.md](./recommended.md) 참조.
