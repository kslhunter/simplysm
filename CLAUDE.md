# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

`simplysm` 은 `@simplysm/*` 라이브러리와 에이전트 확장을 함께 관리하는 Bun package manager 모노레포이다.

- 워크스페이스: `packages/*`(npm 라이브러리 17개), `tests/*`(통합 테스트 패키지), `plugins/*`(LLM/Pi 확장 패키지). 루트 `package.json#workspaces` 참조.
- `packages/sd-cli` 가 워크스페이스 전체의 빌드·감시·개발서버·배포·검사를 담당한다.
- 루트 스크립트는 `tsx packages/sd-cli/src/sd-cli.ts` 를 직접 실행한다. 개발 중에는 빌드 산출물 없이 TypeScript 소스를 직접 사용한다.
- 모든 npm 배포 패키지 버전은 루트 버전과 함께 맞춰 배포한다.

## 명령

루트 `package.json` 스크립트로 실행한다. `bun run sd-cli <command>` 는 `tsx packages/sd-cli/src/sd-cli.ts <command>` 의 단축이다.

| 명령                   | 동작                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `bun run build`        | 프로덕션 빌드 (`sd-cli build`)                                                             |
| `bun run watch`        | 감시 모드 빌드 (`sd-cli watch`)                                                            |
| `bun run dev`          | 서버 패키지 개발 모드 실행 (`sd-cli dev`)                                                  |
| `bun run check --fix`  | typecheck + lint 일괄 실행 (`sd-cli check --fix`) — 우선 사용                              |
| `bun run typecheck`    | 타입 검사만 (`sd-cli check --type typecheck`) — 오류 분석용                                |
| `bun run lint --fix`   | 린트만 (`sd-cli check --type lint --fix`) — 오류 분석·자동수정용                           |
| `bun run test`         | vitest 전체 실행                                                                           |
| `bun run pub`          | 배포 (`sd-cli publish`)                                                                    |

- `build`·`watch`·`dev`·`publish` 의 `--target/-t` 값은 `sd.config.ts` 의 `packages` 키이다. `@simplysm/` 접두사를 붙이지 않는다. 예: `bun run build -t core-common -t storage`.
- `check`·`typecheck`·`lint` 의 `--target/-t` 값은 `packages/*` 또는 `tests/*` 아래 워크스페이스 디렉터리명이다. 예: `bun run check --fix -t core-common -t orm`.
- `build`·`watch`·`dev`·`device`·`publish`·`replace-deps` 는 `--opt/-o` 값을 `sd.config.ts` 에 전달한다.
- `test` 는 sd-cli 가 아니라 vitest 직접 호출이다: `bun run vitest run --configLoader native --reporter=dot --silent=passed-only`. 추가 인자는 vitest 로 전달된다.
- sd-cli 명령: `build`, `watch`, `dev`, `device`, `check`, `publish`, `replace-deps`, `init`, `init client`.

### 단일 테스트 실행

테스트는 vitest **projects** 로 분할된다(`vitest.config.ts`). 단일 실행 시 필요하면 프로젝트를 지정한다.

- 프로젝트별: `bun run test --project node`.
- 프로젝트 이름: `node`, `browser`, `angular`, `sd-cli-server`, `sd-cli-client`, `ssg`, `orm`, `service-server-acme`, `service`.
- 파일 지정: `bun run test packages/core-common/tests/utils/obj.spec.ts` 또는 `bun run test tests/ssg/src/ssg.spec.ts`.
- 이름 패턴: `bun run test -t "테스트명 일부"`.
- `orm`·`service`·`service-server-acme` 프로젝트는 Docker(DB / pebble+challtestsrv 등)가 필요하다.

## 아키텍처

### 패키지 구성

- `packages/*`: 배포 대상 `@simplysm/*` 라이브러리.
- `tests/*`: 통합 테스트용 워크스페이스 패키지. typecheck/check 대상에는 포함되지만 `sd.config.ts` 배포 패키지는 아니다.
- `plugins/sd`: Pi 에이전트 및 Claude Code 를 위한 `@simplysm/sd` 확장 패키지.
- `plugins/sd-wiki`: 팀 공용 지식 위키 CLI(`cli/wiki.ts`)를 제공하는 `@simplysm/sd-wiki` Pi 확장 패키지.

### 패키지 target (`sd.config.ts`)

sd-cli 는 각 패키지의 `target` 으로 esbuild platform·번들 방식을 결정한다.

| target    | 패키지 |
| --------- | ------ |
| `browser` | `angular`, `core-browser`, `capacitor-plugin-*` |
| `node`    | `core-node`, `lint`, `orm-node`, `sd-cli`, `service-server`, `storage` |
| `neutral` | `core-common`, `excel`, `orm-common`, `service-client`, `service-common` |

새 배포 패키지를 추가할 때는 `sd.config.ts` 의 `packages` 에 등록한다.

### 주요 의존 관계

`core-common` 이 대부분 패키지의 기반이다. 아래는 현재 `package.json` 기준 요약이다.

- `core-browser`·`core-node`·`excel`·`storage`·`orm-common` 은 `core-common` 에 의존한다.
- `orm-node` 는 `core-common`·`orm-common` 에 의존한다.
- `service-common` 은 `core-common`·`orm-common` 에 의존한다.
- `service-client` 는 `core-common`·`orm-common`·`service-common` 에 의존한다.
- `service-server` 는 `core-common`·`core-node`·`orm-common`·`orm-node`·`service-common` 에 의존한다.
- `angular` 는 `core-browser`·`core-common`·`service-client`·`service-common` 에 의존한다.
- `sd-cli` 는 `core-common`·`core-node`·`storage` 에 의존한다.
- `capacitor-plugin-auto-update` 는 `capacitor-plugin-file-system`·`core-browser`·`core-common`·`service-client`·`service-common` 에 의존한다.
- `capacitor-plugin-file-system`·`capacitor-plugin-usb-storage` 는 `core-browser`·`core-common` 에 의존한다.
- `capacitor-plugin-intent` 는 `core-common` 에 의존한다.
- `lint` 는 다른 `@simplysm/*` 패키지에 의존하지 않는 독립 ESLint 패키지이다.

### 워크스페이스 소스 직접 참조

`tsconfig.json` 의 `paths` 가 `@simplysm/*` → `packages/*/src/index.ts` 로 매핑된다. 빌드된 `dist` 가 아니라 **소스를 직접** 참조하므로, 패키지 간 변경은 빌드 없이 타입체크·테스트·개발에 즉시 반영된다.

### sd-cli 내부 구조 (`packages/sd-cli/src`)

워크스페이스 빌드 파이프라인의 핵심이다.

- `commands/` — CLI 명령 진입점: `build`, `watch`, `dev`, `device`, `check`, `publish`, `replace-deps`, `init`.
- `orchestrators/` — `Build`/`Watch`/`Dev`/`Typecheck` 오케스트레이터와 서버 런타임 관리.
- `engines/`·`workers/` — 패키지별 빌드·타입체크 실행 엔진과 워커.
- `runtime/` — 결과 수집, 재빌드 관리, 시그널 처리 등 실행 공통 런타임.
- `esbuild/` — esbuild 기반 번들링과 postcss·scss 플러그인.
- `angular/` — Angular 컴파일 통합(`@angular/build`, `@angular/compiler-cli`, 스타일시트 변환).
- `ts-compiler/`·`typecheck/` — TS 컴파일·타입체크 보조 로직.
- `lint/` — ESLint 실행, ignore 패턴 로드, 워커 실행.
- `dev-server/`·`ssg/` — HMR 개발 서버와 빌드타임 프리렌더.
- `electron/`·`capacitor/` — 네이티브 패키징·실행 지원.
- `deps/` — `replace-deps`, 서버 external 처리.

`sd-cli` 의 `.js` 프로덕션 실행은 2단계(replaceDeps 사전 처리 → 새 Node 프로세스에서 `sd-cli-entry.js` 실행)이고, `.ts` 개발 실행은 `sd-cli-entry` 를 직접 import 한다. 자세한 흐름은 `packages/sd-cli/src/sd-cli.ts` 주석을 따른다.

### core-common 사이드이펙트

`packages/core-common/src/index.ts` 는 import 시 `Array`/`Set`/`Map` prototype 확장(`getOrCreate` 등)을 먼저 로드한다. 이 import 순서를 임의로 바꾸면 확장 메서드 평가 순서가 깨질 수 있다.

### ESLint (`packages/lint`)

`packages/lint` 는 커스텀 ESLint 플러그인과 recommended flat config 를 제공한다. 루트 `eslint.config.ts` 는 `@simplysm/lint` 의 `eslint-recommended` 를 사용하며, 현재 `plugins/**`, init 템플릿, 일부 fixtures 는 전역 ignore 한다. 린트 규칙 변경은 `packages/lint` 에서 수행한다.

## 라이브러리 타입 설계 원칙

`@simplysm/*` 는 외부 앱이 import 하는 공개 라이브러리이므로 타입 우선순위는 `소비자타입 >> IDE속도 > 내부타입` 이다. 충돌하면 항상 소비자 타입이 우선이다.

- **소비자타입**: 외부 앱 코드가 직접·간접으로 닿는 공개 입력·출력·추론 타입.
  - 잘못된 입력은 컴파일 에러가 나도록 강하게 제한한다.
  - 결과 타입(`$infer*`, 체이닝 결과, 관계 추론 등)은 끝까지 정확히 전파한다.
  - 중간을 `any`·고정 타입으로 끊어 소비자 결과가 부정확해지는 변경은 금지한다.
- **내부타입**: 라이브러리 구현끼리만 맞물리고 소비자 결과에 도달하지 않는 타입.
  - 소비자 타입 정확도가 동일하게 유지되는 범위에서, 연쇄·재귀 추론 비용이 커 IDE/typecheck 성능 이득이 있을 때는 명시 반환 타입·`as` 등으로 추론을 끊고 고정하는 편을 권장한다.
  - 성능상 이득이 없거나 단순한 내부 타입은 굳이 끊지 않아도 된다.
  - 끊어진 내부 정확성은 테스트로 보증한다.
- **판정 원칙**: export 여부가 아니라 소비자가 실제 인자·결과·제네릭·인덱스 접근·연쇄 추론 경유로 접하는지로 판단한다. 의심되면 소비자타입으로 분류한다.
- IDE 속도 개선을 이유로 소비자타입을 재설계하려면 `tsc --extendedDiagnostics` 등 실측 근거가 필요하다. 추정만으로 소비자 타입을 약화하지 않는다.

## 환경·제약

- `@simplysm/*` v14 개발 매뉴얼과 API 인덱스는 `plugins/sd/references/simplysm14/README.md` 에서 시작한다. 패키지 심볼·API 를 사용하거나 해석할 때 해당 README 의 트리거 표에 따라 관련 문서를 읽는다.
- TS 설정은 엄격하다: `verbatimModuleSyntax`, `noPropertyAccessFromIndexSignature`, `useUnknownInCatchVariables`, `noImplicitOverride`, `noImplicitReturns` 등. import 는 `type` 한정자를 구분하고, 인덱스 시그니처는 `obj["key"]` 로 접근하며, catch 변수는 `unknown` 전제로 처리한다.
- 의존성 조사는 `node_modules` 가 아니라 lock 파일과 package manifest 를 우선 사용한다.

## 에이전트 확장 런타임

`plugins/sd` 는 Pi 에이전트 및 Claude Code 가 함께 사용하는 `@simplysm/sd` 확장 패키지이다.

- Pi 에이전트 확장 구현·검증은 Bun 기준으로 수행한다. Node/tsx 기준으로 판단하지 않는다.
- 실측상 현재 Pi 확장의 모든 스크립트는 Bun 런타임에서 실행된다.
- 공식 문서의 “Node 에서 jiti 로 수행” 설명은 이 저장소의 현재 실측과 맞지 않는다.
- `plugins/sd/package.json` 은 Pi 에이전트 배포용이다. `files` 에 Claude Code 에서만 사용하는 폴더를 넣을 필요는 없다.
