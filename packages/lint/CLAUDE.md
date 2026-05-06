# CLAUDE.md — `@simplysm/lint`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

자체 ESLint 플러그인 + recommended 프리셋. `pnpm check` 의 lint 단계가 사용한다. 빌드 타겟 `node`.

## 구조

| 경로                          | 내용                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `eslint-plugin.ts`            | 플러그인 entry — 모든 룰 등록.                                                             |
| `eslint-recommended.ts`       | 추천 설정(룰 + 옵션). 소비 앱은 이거 하나만 import 하면 됨.                                |
| `rules/`                      | 자체 룰들. (TS 룰: `ts-no-throw-not-implemented-error`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly` / Angular 룰: `ng-no-async-effect`, `ng-template-no-strict-null-check`, `ng-template-no-todo-comments`, `ng-template-sd-require-binding-attrs` / 기타: `no-hard-private`, `no-subpath-imports-from-simplysm`) |
| `utils/create-rule.ts`        | `RuleCreator` 래퍼 — 모든 룰이 이걸로 생성된다.                                            |

외부 의존: `eslint`, `typescript-eslint`, `@typescript-eslint/utils`, `@angular-eslint/utils`, `angular-eslint`, `@angular/compiler`, `eslint-plugin-import`, `eslint-import-resolver-typescript`, `eslint-plugin-unused-imports`, `globals`, `typescript`.

## 작업 시 주의

- 새 룰 추가: `rules/<kind>-<name>.ts` 에 `createRule({...})` 한 개 export → `eslint-plugin.ts` 의 `rules` 객체에 등록 → 필요시 `eslint-recommended.ts` 에 활성화.
- 룰 이름 prefix 규칙:
  - `ts-` : 일반 TypeScript 코드
  - `ng-` : Angular 컴포넌트(`.ts`)
  - `ng-template-` : Angular 템플릿(`.html` 또는 인라인 template)
- `no-subpath-imports-from-simplysm` — `@simplysm/foo/bar` 형태의 서브패스 import 금지(공개 API만 허용). 신규 export 가 필요하면 해당 패키지의 `index.ts` 에 추가.
- 룰의 `messages` 는 한국어 허용. 사용자가 lint 결과를 직접 본다.
