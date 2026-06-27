# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

`@simplysm/*` 라이브러리 17개를 담은 pnpm 모노레포. 자체 빌드·개발·배포 도구인 `sd-cli` 패키지가 워크스페이스 전체의 빌드/감시/개발서버/배포/검사를 담당. 모든 도구 실행은 `tsx` 로 TypeScript 를 컴파일 없이 직접 구동(빌드 산출물 불필요).

- 워크스페이스: `packages/*`(라이브러리) + `tests/*`(통합 테스트). `pnpm-workspace.yaml` 참조.
- 모든 패키지 버전은 동일하게 묶여 함께 배포됨.

## 명령

루트 `package.json` 스크립트로 실행. `pnpm sd-cli <command>` 는 `tsx packages/sd-cli/src/sd-cli.ts` 의 단축.

| 명령               | 동작                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `pnpm build`       | 프로덕션 빌드 (`sd-cli build`)                                                             |
| `pnpm watch`       | 감시 모드 빌드 (`sd-cli watch`)                                                            |
| `pnpm check --fix` | typecheck + lint 병렬 (`sd-cli check --fix`) - (우선 사용, `--fix` 옵션 기본으로 사용할것) |
| `pnpm typecheck`   | 타입 검사만 (`sd-cli check --type typecheck`) - (오류발견 시 디버깅용)                     |
| `pnpm lint`        | 린트만 (`sd-cli check --type lint`, `--fix` 로 자동수정) - (오류발견 시 디버깅용)          |
| `pnpm test`        | vitest 전체 실행                                                                           |
| `pnpm pub`         | 배포 (`sd-cli publish`)                                                                    |

- 특정 패키지만 대상: `--target <pkg>`(별칭 `-t`) 반복 지정. `<pkg>` 는 `sd.config.ts` 의 `packages` 키 — `@simplysm/` 접두사를 뺀 짧은 이름(예: `core-common`, `storage`, `sd-cli`). 예: `pnpm check --fix -t core-common -t storage`.
- `test` 는 sd-cli 가 아니라 vitest 직접 호출(`tsx node_modules/vitest/vitest.mjs run`). 인자가 그대로 vitest 로 전달됨.
- sd-cli 기타 명령: `device`(네이티브 앱 실행), `replace-deps`, `reinstall`(lock·node_modules·dist·.cache 제거 후 빌드 승인 갱신하며 클린 재설치), `init`/`init client`(워크스페이스·클라이언트 부트스트랩).

### 단일 테스트 실행

테스트는 vitest **projects** 로 분할됨(`vitest.config.ts`). 단일 실행 시 프로젝트 지정 필요.

- 프로젝트별: `pnpm test --project node` (이름: `node`, `browser`, `angular`, `orm`, `service`, `ssg`, `service-server-acme`, `sd-cli-server`, `sd-cli-client`).
- 파일 지정: `pnpm test packages/core-common/tests/utils/obj.spec.ts`.
- 이름 패턴: `pnpm test -t "테스트명 일부"`.
- `orm`·`service`·`service-server-acme` 프로젝트는 Docker(DB / pebble+challtestsrv) 필요.

## 아키텍처

### 패키지 의존 그래프

`core-common` 이 모든 패키지의 토대. 화살표는 의존 방향.

```
core-common ─┬─ core-node ── (sd-cli, service-server, storage, orm-node …)
             ├─ core-browser ── angular
             ├─ orm-common ──┬─ orm-node
             │               └─ service-common ──┬─ service-client ── angular
             │                                    └─ service-server
             ├─ excel
             └─ storage
```

- `sd-cli` 는 `core-common`·`core-node`·`storage` 에 의존.
- `service-*` 3종은 클라이언트(`service-client`)·서버(`service-server`)·공유(`service-common`)로 분리된 RPC/서비스 계층.
- `orm-common`/`orm-node` 는 ORM 의 공유 정의 / Node 실행부 분리.
- `capacitor-plugin-*` 는 Capacitor 네이티브 플러그인.

### 패키지 target (`sd.config.ts`)

각 패키지는 `browser` / `node` / `neutral` 중 하나로 선언. sd-cli 빌드가 이 target 으로 esbuild platform·번들 방식을 결정. 새 패키지 추가 시 `sd.config.ts` 의 `packages` 에 등록 필요.

### 워크스페이스 소스 직접 참조

`tsconfig.json` 의 `paths` 가 `@simplysm/*` → `packages/*/src/index.ts` 로 매핑. 빌드된 `dist` 가 아니라 **소스를 직접** 참조하므로, 패키지 간 변경이 빌드 없이 즉시 반영됨(타입체크·테스트·개발 모두 동일).

### sd-cli 내부 구조 (`packages/sd-cli/src`)

워크스페이스 빌드 파이프라인의 핵심.

- `commands/` — CLI 명령 진입점(`sd-cli-entry.ts` 가 yargs 로 등록).
- `orchestrators/` — `Build`/`Watch`/`Dev`/`Typecheck` 오케스트레이터가 패키지 의존 순서대로 빌드·검사 조율.
- `esbuild/` — esbuild 기반 번들링(클라이언트/서버/워커), postcss·scss 플러그인.
- `angular/` — Angular 컴파일 통합(ngtsc, 스타일시트 변환). `@angular/build`·`@angular/compiler-cli` 사용.
- `ts-compiler/`·`typecheck/` — TS 컴파일·타입체크. `dev-server/` — HMR 개발 서버. `ssg/` — 빌드타임 프리렌더. `electron/`·`capacitor/` — 네이티브 패키징.
- sd-cli 의 `.js` 프로덕션 실행은 2단계(replaceDeps 인라인 → 새 프로세스에서 entry 실행). `.ts` 개발 실행은 직접 import. `sd-cli.ts` 주석 참조.

### core-common 사이드이펙트 (prototype 확장)

`packages/core-common/src/index.ts` 가 import 시 `Array`/`Set`/`Map` prototype 을 확장(`getOrCreate` 등). 이 import 가 다른 코드보다 먼저 평가돼야 확장 메서드가 동작 — index.ts 의 import 순서를 임의로 바꾸지 말 것.

### ESLint (`packages/lint`)

커스텀 ESLint 플러그인 + recommended config 를 제공하는 자체 패키지. 루트 `eslint.config.ts` 가 `@simplysm/lint` 의 `eslint-recommended` 를 사용. 린트 규칙 변경은 이 패키지에서.

## 라이브러리 타입 설계 원칙

`@simplysm/*` 는 외부 앱이 import 하는 공개 라이브러리이므로, 타입을 "누가 보는가" 로 나눠 우선순위를 둠 — `소비자타입 >> IDE속도 > 내부타입`. 충돌하면 항상 소비자 타입이 이김.

**가장 실수하기 쉬운 지점은 타입이 타고타고 전파되는 연쇄·재귀 추론**(관계 추론·체이닝 결과·제네릭 전파 등). 같은 연쇄 추론을 청중에 따라 정반대로 처리.

- **소비자타입** (최우선 사수·강화): 라이브러리를 import 하는 앱 코드가 직접·간접으로 닿는 타입.
  - 입력 강제: 잘못 쓰면 컴파일 에러가 나게 하는 타입(공개 메서드 인자·제네릭 제약·오버로드 등). 소비자 실수 차단이 목적이므로 줄이지 말고 더 조임.
  - 출력 결과 정확도: 소비자가 받는 결과·추론 타입(`$infer*`·체이닝 결과·관계 추론 등). **연쇄 추론이 끝까지 전파돼야 함** — 중간을 `any`·고정 타입으로 끊으면 그 지점부터 소비자 결과가 부정확해지므로 끊기 금지.
- **내부타입** (포기 가능): 라이브러리 구현끼리만 맞물려 소비자에 도달하지 않는 타입(변환 헬퍼·IR·phantom 등). **연쇄 추론을 끊고 고정 타입(명시 반환 annotation·`as`)으로 박는 편이 오히려 나음** — 추론을 덜 굴릴수록 tsserver 가 빨라지므로, 고정 가능하면 추론에 맡기지 말고 고정. 끊어진 정확성은 테스트가 보증함.
- **불변식**: 소비자 관점 타입 정확도는 어떤 경우에도 후퇴 금지. "고정으로 추론 비용 절감" 은 소비자가 받는 타입이 동일하게 정확할 때만 허용 — 결과가 같으면 고정 가능, 결과가 달라지면(끊김) 금지.

판정·적용:

- export 됐다고 다 소비자타입은 아님 — 소비자가 그 타입을 실제 인자·결과·제네릭으로 다루는지로 판정. 의심되면 소비자타입으로 보수적 분류.
- 내부타입으로 보여 끊거나 고정하기 전, 그 타입이 소비자 강제·결과에 간접 기여하는 참조 경로(인덱스 접근·다른 공개 타입 경유·연쇄 추론 경유 포함)가 없는지 먼저 전수 확인. 하나라도 있으면 사수.
- IDE 속도를 명분으로 소비자타입을 건드리는 변경은, 실측(`tsc --extendedDiagnostics` 의 인스턴스화 수·체크 시간)으로 이득을 확인하기 전엔 금지. 추정만으로 큰 타입 재설계 금지.
- 나쁜 예 1(연쇄 단절): include 중첩 결과의 중간 관계 타입을 `any` 로 끊음 → 소비자가 `item.user.name` 의 타입을 못 받음.
- 나쁜 예 2(소비자 타입 오인): 참조 0건처럼 보이는 phantom 필드를 제거 → 사실 다른 공개 타입이 인덱스 접근(`T["$params"]`)으로 읽어 소비자 입력 강제가 붕괴.
- 좋은 예: 내부 변환 헬퍼는 제네릭 추론을 타게 두지 말고 반환을 고정 타입으로 박고 호출부에서 캐스트 → 같은 소비자 결과를 유지하며 추론 비용만 제거.

## 환경·제약

- 개발 매뉴얼·API 문서는 `plugins/sd/references/` 에 있음(`@simplysm/*` 심볼 사용·해석 시 `README.md` 트리거 표로 진입).
- TS 설정이 엄격(`verbatimModuleSyntax`, `noPropertyAccessFromIndexSignature`, `useUnknownInCatchVariables`, `noImplicitOverride` 등) — import 는 `type` 한정자 구분, 인덱스 시그니처는 `obj["key"]` 접근, catch 변수는 `unknown` 전제.
