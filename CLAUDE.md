# CLAUDE.md

이 프로젝트는 `simplysm` 은 `@simplysm/*` 라이브러리와 에이전트 확장을 함께 관리하는 pnpm package manager 모노레포입니다.

## 명령

명령 목록은 루트 `package.json` 의 `scripts` 를 읽으세요. `pnpm sd-cli <command>` 는 sd-cli 직접 실행의 단축입니다.

- 검사는 `pnpm check --fix` 를 우선 사용하세요. `typecheck`, `lint` 개별 실행은 오류 분석, 자동수정이 필요할 때만 쓰세요.
- `build`, `watch`, `dev`, `pub` 의 `--target/-t` 값은 `sd.config.ts` 의 `packages` 키입니다. `@simplysm/` 접두사를 붙이지 마세요. 예: `pnpm build -t core-common -t storage`.
- `check`, `typecheck`, `lint` 의 `--target/-t` 값은 `packages/*` 또는 `tests/*` 아래 워크스페이스 디렉터리명입니다. 예: `pnpm check --fix -t core-common -t orm`.
- `build`, `watch`, `dev`, `device`, `pub`, `replace-deps` 는 `--opt/-o` 값을 `sd.config.ts` 에 전달합니다.
- ruff 는 `python -m ruff` 로 호출하세요. 실행 파일이 PATH 에 없을 수 있습니다.
- 테스트는 `pnpm test` 로 실행하세요(루트 `vitest.config.ts` 의 vitest project 분할).
  - 단일 파일: `pnpm test <spec 경로>`, project 단위: `pnpm test --project <이름>`.
  - `orm`, `service-server-acme` project 는 Docker 가 필요합니다.

## 환경, 제약

- `@simplysm/*` v14 개발 매뉴얼과 API 인덱스는 `plugins/sd/references/simplysm14/README.md` 에서 시작합니다. 패키지 심볼, API 를 사용하거나 해석할 때 해당 README 의 트리거 표에 따라 관련 문서를 읽으세요.
- TS 설정은 엄격합니다: `verbatimModuleSyntax`, `noPropertyAccessFromIndexSignature`, `useUnknownInCatchVariables`, `noImplicitOverride`, `noImplicitReturns` 등. import 는 `type` 한정자를 구분하고, 인덱스 시그니처는 `obj["key"]` 로 접근하며, catch 변수는 `unknown` 전제로 처리하세요.
- 의존성 조사는 `node_modules` 가 아니라 lock 파일과 package manifest 를 우선 사용하세요.
- `@simplysm/*` 는 `dist` 가 아니라 소스를 직접 참조합니다(`tsconfig.json` `paths`). 패키지 간 변경에 빌드가 필요 없습니다.
- `packages/core-common/src/index.ts` 의 import 순서를 바꾸지 마세요. `Array`/`Set`/`Map` prototype 확장 로드가 선행돼야 합니다.
- 린트 규칙 변경은 `packages/lint` 에서 하세요.
- 새 배포 패키지는 `sd.config.ts` 의 `packages` 에 등록하세요. 모든 배포 패키지 버전은 루트 버전에 맞춥니다.
- `tests/*` 는 typecheck, check 대상이지만 배포 대상은 아닙니다.
- `plugins/*` 는 npm 패키지가 아니라 Claude Code 플러그인이며 pnpm 워크스페이스 밖입니다.

## 라이브러리 타입 설계 원칙

`@simplysm/*` 는 외부 앱이 import 하는 공개 라이브러리입니다. 타입 우선순위는 `소비자타입 >> IDE속도 > 내부타입` 이며 충돌하면 항상 소비자 타입이 우선입니다.

- 소비자 결과 타입(`$infer*`, 체이닝 결과, 관계 추론 등)의 중간을 `any`, 고정 타입으로 끊지 마세요.
- 소비자타입 판정은 export 여부가 아니라 소비자가 실제로 접하는지로 하세요. 애매하면 소비자타입으로 분류하세요.
- IDE 속도를 이유로 소비자타입을 약화하려면 `tsc --extendedDiagnostics` 등 실측 근거가 필요합니다.
- 내부타입은 추론을 끊어 고정해도 됩니다. 끊은 정확성은 테스트로 보증하세요.

## 플러그인 런타임

`plugins/sd`, `plugins/sd-wiki` 는 Claude Code 플러그인이며, 훅, statusline, 스킬 스크립트, wiki CLI 가 실행 코드입니다.

- SKILL.md 에서 스크립트를 부를 때는 `${CLAUDE_SKILL_DIR}` 을 쓰세요. cwd 상대경로와 `${CLAUDE_PLUGIN_ROOT}`(훅 전용 변수)는 스킬 본문에서 동작하지 않습니다.
- 모듈은 여러 훅이 실제로 공유할 때만 분리하세요. 소비자가 하나뿐인 로직은 그 훅 파일에 직접 두세요.
- 훅 종료코드 규약: 0=통과, 2=차단(stderr 가 모델에 전달), 그 외=비차단 오류. **1 은 차단하지 않습니다.**
- SessionStart, UserPromptSubmit 는 stdout 이 곧 컨텍스트 주입입니다. 진단, 경고는 반드시 stderr 로 보내세요.
- 플러그인 Python 코드는 `pnpm lint:py` 로 검사합니다(ESLint, vitest 대상 아님). 자동화 테스트는 두지 마세요.
