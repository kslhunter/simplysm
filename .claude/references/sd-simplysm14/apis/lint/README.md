# @simplysm/lint

심플리즘 전용 ESLint 자산 패키지. 커스텀 규칙 9종을 담은 플러그인과, 그 규칙들에 typescript-eslint·angular-eslint·import·unused-imports 를 결합한 flat config 프리셋을 제공. `src/index.ts` 는 없음 — `package.json` 의 `exports` 두 subpath(`./eslint-plugin`, `./eslint-recommended`)만 진입점이며 패키지 루트 import 는 없음.

## 사용 트리거 인덱스

- **eslint-recommended** (`@simplysm/lint/eslint-recommended`) — 프로젝트 `eslint.config.ts` 에서 그대로 spread 해 쓰는 완성형 flat config 배열. JS/TS/HTML/tests 파일 패턴별 활성 규칙·심각도·ignore·플러그인·Angular 통합과 금지 globals/imports/syntax 를 확인할 때. 자세히: [recommended.md](./recommended.md)
- **eslint-plugin** (`@simplysm/lint/eslint-plugin`) — 커스텀 규칙만 담은 ESLint Plugin 객체(`{ rules }`). recommended 를 쓰지 않고 규칙을 직접 골라 등록할 때, 또는 개별 규칙의 위반 메시지·autofix·옵션 의미를 검토할 때. 자세히: [rules.md](./rules.md)

> 두 진입점 모두 default export 만 가짐. `import recommended from "@simplysm/lint/eslint-recommended"`, `import plugin from "@simplysm/lint/eslint-plugin"` 형태로 사용. 규칙 생성 팩토리 `createRule`(`src/utils/create-rule.ts`, `ESLintUtils.RuleCreator` 래퍼로 문서 URL 자동 부여)는 내부 전용이며 두 진입점 어디로도 재노출되지 않음.

## eslint-plugin

`@simplysm/lint/eslint-plugin` 의 default export. ESLint Plugin 형태 객체 `{ rules }`.

```typescript
import plugin from "@simplysm/lint/eslint-plugin";
// plugin === { rules: { "ng-no-async-effect": ..., "no-hard-private": ..., ... } }
```

- `rules` — 규칙 id → 규칙 객체 맵. 등록된 9개 id: `ng-no-async-effect`, `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly`.

flat config 에서 직접 등록할 때는 `plugins: { "@simplysm": plugin }` 로 매핑 후 `"@simplysm/<id>"` 로 켬. 각 규칙의 검사 대상·옵션·autofix·메시지는 [rules.md](./rules.md) 참조.
