# @simplysm/lint

심플리즘 전용 ESLint 자산. 커스텀 규칙 9종을 담은 플러그인과, 그 규칙들에 typescript-eslint·angular-eslint·import·unused-imports 를 결합한 flat config 프리셋을 제공. `src/index.ts` 는 없고, `package.json` 의 `exports` 두 subpath(`./eslint-plugin`, `./eslint-recommended`)만 진입점이다. 두 진입점 모두 `default` export 만 가진다.

## 사용 트리거 인덱스

- **eslint-recommended** (`@simplysm/lint/eslint-recommended`) — 프로젝트 `eslint.config.ts` 에서 그대로 spread 하는 완성형 flat config 배열. 파일 패턴(JS / TS / HTML / tests)별 활성 규칙·심각도·플러그인·ignore·금지 global/import/syntax 를 확인할 때. 자세히: [recommended.md](./recommended.md)
- **eslint-plugin** (`@simplysm/lint/eslint-plugin`) — 커스텀 규칙만 담은 ESLint Plugin 객체. recommended 를 안 쓰고 규칙을 직접 골라 등록하거나, 개별 규칙의 검사 대상·위반 메시지·autofix·옵션을 검토할 때. 자세히: [rules.md](./rules.md)

## eslint-plugin

`@simplysm/lint/eslint-plugin` 의 default export 는 ESLint Plugin 형태 객체 `{ rules: Record<id, Rule> }`. `src/eslint-plugin.ts` 가 9개 규칙을 id 로 묶어 노출한다.

```typescript
import plugin from "@simplysm/lint/eslint-plugin";
// flat config 에서: plugins: { "@simplysm": plugin } 매핑 후 "@simplysm/<id>" 로 켬
```

- `rules` — 규칙 id → 규칙 객체 맵. 등록된 9개 id: `ng-no-async-effect`, `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly`. 각 규칙의 검사 대상·옵션·autofix·메시지는 [rules.md](./rules.md) 참조.

> 규칙 생성 팩토리 `createRule`(`src/utils/create-rule.ts`, `ESLintUtils.RuleCreator` 래퍼로 규칙 문서 URL 자동 부여)는 내부 전용이며 두 진입점 어디로도 재노출되지 않는다.
