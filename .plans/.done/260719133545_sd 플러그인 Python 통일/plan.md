# Plan: sd 플러그인 Python 통일

## 0. 메타데이터

| 항목      | 내용                                                                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID   | PLAN-260719133545                                                                                                                                                                                         |
| Plan 상태 | Ready                                                                                                                                                                                                     |
| 생성 시각 | 2026-07-19 13:35:45                                                                                                                                                                                       |
| 제목      | sd 플러그인 Python 통일                                                                                                                                                                                   |
| 대상 범위 | `plugins/sd`, `plugins/sd-wiki`                                                                                                                                                                           |
| 근거 자료 | 사용자 발언(대화), `plugins/sd/**`, `plugins/sd-wiki/**`, 루트 `sd.config.ts`, `vitest.config.ts`, `CLAUDE.md`, Claude Code 공식문서(hooks, statusline, plugins-reference, skills), Python 공식문서, 로컬 실측 |
| 작성 원칙 | 근거 없는 항목은 `[OPEN]`, 구현은 별도 지시 전까지 보류                                                                                                                                                   |
| 실행 규약 | TASK 는 §8 의 순서, 의존대로 실행함. 선행 의존 TASK 가 Done 되기 전 후속 착수 금지, §8 `병렬 가능` 인 무의존 TASK 는 동시 진행 가능. 각 TASK 완료 즉시 상태를 `Done (yyyy-MM-dd)` 로 갱신함                |

## 1. 목표, 문제, 완료 정의

- 목표: `plugins/sd`, `plugins/sd-wiki` 의 실행 런타임을 Python 하나로 통일하고, 저장소에서 Bun 의존을 제거함.
- 해결할 문제: 현재 훅, CLI 는 Bun(TS), 스킬 스크립트는 Python 으로 런타임이 이원화돼 있음. 과거 Bun 으로 통일을 시도했으나 sd-unpack 의 Office COM, PDF, msg 처리를 Bun 으로 옮길 수 없어 실패함(근거: 사용자 발언 — "bun 통일해보려고 옮겼는데 통일이 쉽지 않다는걸 알았음"). 반대 방향인 Python 통일은 전 구간 실현 가능함.
- 완료 정의:
  - `plugins/sd`, `plugins/sd-wiki` 에 `.ts`/`.js` 실행 코드가 남지 않음.
  - 두 플러그인의 모든 훅, statusline, wiki CLI 가 Python 3.14+ 로 동작함.
  - Pi 확장(`extensions/`)이 제거되고 관련 매니페스트 필드, 의존이 정리됨.
- 성공 시 관찰 가능한 변화:
  - Bun 미설치 환경에서 세션 시작, 프롬프트 제출, Write/Edit 자동포맷, statusline, wiki 조회가 모두 정상 동작함.
  - 저장소 내 `plugins/**` 에서 `bun` 실행 명령이 사라짐.

## 2. 범위 / 비범위 / 제약

### 2.1 범위

| ID        | 포함 항목                                                                                                   | 근거                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| SCOPE-001 | `plugins/sd/extensions/`(4,755줄), `plugins/sd-wiki/extensions/`(104줄) 삭제 및 Pi 전용 매니페스트 필드 정리 | 사용자 결정(Pi 제거 + Python 통일을 한 계획으로), FIND-001    |
| SCOPE-002 | `plugins/sd/shared/*.ts` → Python 이식 (`reference-output-style.ts` 제외)                                   | FIND-002                                                      |
| SCOPE-003 | `plugins/sd/hooks/*.ts` 9종 → Python 이식 및 `hooks.json` 실행기 교체                                       | 사용자 결정, FIND-003                                         |
| SCOPE-004 | `plugins/sd/hooks/assets/statusline.ts` → Python 이식 및 statusLine 마이그레이션 판정 역전                  | FIND-004                                                      |
| SCOPE-005 | `plugins/sd-wiki/shared/*.ts`, `cli/wiki.ts`, `hooks/*.ts` → Python 이식                                      | 사용자 결정, FIND-005                                         |
| SCOPE-006 | 자동 포맷 실행기를 `bun x` → 프로젝트 `node_modules/.bin` 직접 실행로 교체                                  | DEC-002 (사용자 선택 1번)                                     |
| SCOPE-007 | Python 개발 도구(pytest, ruff) 도입 및 `sd-wiki` 테스트 pytest 이관                                          | DEC-005 (사용자 선택 1번)                                     |
| SCOPE-008 | Bun/TS 잔재 정리 — `tsconfig.json`, `@types/bun`, 루트 `vitest.config.ts` 의 `plugins` 프로젝트, 잔여 pyc   | FIND-006, FIND-007                                            |
| SCOPE-009 | `CLAUDE.md` 의 "에이전트 확장 런타임" 절 등 Pi, Bun 전제 서술 갱신                                           | CLAUDE.md 가 Pi/Bun 을 전제로 서술 중 — Pi 제거와 함께 무효화 |

### 2.2 비범위

| ID           | 제외 항목                                                                                                             | 제외 이유                                                                              | 후속 처리          |
| ------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| NONSCOPE-001 | 이미 Python 인 스크립트 — `skills/**`(`unpack.py`, `collect.py`, `check-page-fill.py`)와 `shared/python/html_to_pdf.py` | 이미 Python 이라 이식 대상 아님. 단 이들을 **호출하는 문구**는 SCOPE 에 포함될 수 있음 | 없음               |
| NONSCOPE-002 | sd-unpack 의 Office COM, PDF, msg 처리 방식 변경                                                                        | 현행 유지가 목표. Windows 전용인 채로 둠(사용자 발언 — "몇몇 스킬은 사용하지 않지만")  | 없음               |
| NONSCOPE-003 | `packages/*`, `tests/*` 워크스페이스 라이브러리                                                                        | 이번 목표는 플러그인 런타임 통일임. 라이브러리는 Node/TS 그대로 유지                   | 없음               |
| NONSCOPE-004 | wiki 서버 API 계약 변경                                                                                               | 서버는 별도 시스템. 클라이언트 이식만 수행                                             | 없음               |
| NONSCOPE-005 | `shared/reference-output-style.ts` 이식                                                                               | extensions 전용(유일 사용처 `extensions/append-system.ts`)이라 Pi 제거와 함께 폐기     | 없음               |
| NONSCOPE-006 | `shared/reference-rules.ts` 의 `buildRulesReferenceContext`                                                           | extensions 전용(유일 사용처 `extensions/hooks/references.ts`). CC 는 파일 단건만 사용  | 없음               |
| NONSCOPE-008 | `shortHash`(`write-hash.ts:48-50`)                                                                                    | 현재 훅에서 미사용                                                                     | 이식 대상에서 제외 |

### 2.3 제약

| ID             | 제약                                                                                                            | 영향                                                                                              | 근거                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| CONSTRAINT-001 | 훅 exit code 규약: 0=통과, 2=차단(stderr 가 모델에 전달), 그 외=비차단 오류. **exit 1 은 차단하지 않음**        | `check-write`, `check-shell` 의 차단은 반드시 exit 2 유지                                          | Claude Code hooks 문서, `check-write.ts:37`                                                |
| CONSTRAINT-002 | SessionStart, UserPromptSubmit 는 **stdout 이 곧 컨텍스트 주입**. 진단 로그가 stdout 에 섞이면 컨텍스트 오염     | 모든 진입점에서 경고, 로그를 stderr 로 강제. `BaseHTTPRequestHandler.log_message` 무력화 필수      | `user-prompt-submit.ts:9-10`, Python `http.server` 기본 액세스 로그 동작                   |
| CONSTRAINT-003 | Windows 기본 콘솔 인코딩이 cp949 라 한국어 주입 텍스트가 깨질 수 있음                                           | 각 진입점에서 `sys.stdout.reconfigure(encoding="utf-8")` 또는 `PYTHONIOENCODING` 명시             | `wiki-service.ts:9` 주석("인코딩 설정은 진입점 책임"), Python 기본 인코딩 동작             |
| CONSTRAINT-004 | Claude Code 는 **런타임 의존(Python)을 선언하는 공식 수단이 없음**. plugin.json `dependencies` 는 플러그인 전용 | Python 미설치 환경에서 훅 전멸. 문서상 유일한 대안은 부트스트랩 훅인데 그 훅도 Python 이라 무의미 | https://code.claude.com/docs/en/plugins-reference — RISK-001 로 관리                       |
| CONSTRAINT-005 | `os.rename` 은 Windows 에서 대상 존재 시 `FileExistsError`. 원자적 교체는 `os.replace` 사용                     | 기존 temp→rename 패턴 전부 `os.replace` 로 이식. temp 는 대상과 동일 디렉터리에 생성              | https://docs.python.org/3/library/os.html — `wiki-service.ts:108`, `statusline.ts:245-256` |
| CONSTRAINT-006 | pyc 는 Python 마이너 버전별로 분리(`cpython-314`). 대상 버전 3.14+ 고정                                         | 3.14 미만 환경 미지원. 잔여 `cpython-312` pyc 는 정리 대상                                        | 사용자 결정("3.14+ 이후로 자율 업데이트"), Python import 문서                              |
| CONSTRAINT-007 | 크로스플랫폼(Windows, macOS, Linux) 유지 필수                                                                     | detached spawn, 파일 락, 브라우저 실행 3곳에 OS 분기 필요                                           | 사용자 발언 — "직원 전체가 쓰며, 우리 회사 내부서버에서도 사용가능(linux)"                 |
| CONSTRAINT-008 | ruff 는 공식 npm 배포가 없음                                                                                    | pnpm devDependency 로 얹을 수 없어 uvx, pip, standalone 중 별도 설치 경로 필요                      | https://docs.astral.sh/ruff/installation/                                                  |
| CONSTRAINT-009 | 훅 런타임 코드는 표준 라이브러리만 사용                                                                         | HTTP 는 `urllib.request`, 콜백 서버는 `http.server`. requests/httpx 도입 금지                     | 훅은 매 실행 새 프로세스 + 직원 배포 대상이라 설치 부담 회피. FIND-008                     |
| CONSTRAINT-010 | `__pycache__` 가 gitignore 되어 GitHub 배포물에 pyc 가 없음                                                     | 소비자 환경 첫 실행마다 재컴파일 발생. `compileall` 사전 생성분을 커밋하지 않는 한 무의미         | `.gitignore:5`, git 추적 0건 — FIND-021, RISK-009                                          |
| CONSTRAINT-012 | 개발 세션이 `plugins/sd`, `plugins/sd-wiki` 를 `--plugin-dir` 로 직접 읽어 수정 즉시 반영됨                      | **원본을 직접 고치며 작업할 수 없음.** 사본에서 작업 후 미러링이 필수(DEC-010)                    | FIND-023 (사용자 발언)                                                                     |
| CONSTRAINT-013 | 브랜치 전환은 모노레포 전체를 바꿔 병행 작업에 영향                                                             | 브랜치 격리 전략 사용 불가. 경로 분리(사본)로 격리해야 함                                         | 사용자 발언 — "브랜치는 좆같은 소리고.. 다른 작업 다 좆되는 소리고"                        |

## 3. 조사 요약

| ID       | 조사 관점 | 확인 내용                                                                                                                                                                                                                                                          | 근거                                                                                                       | plan 반영                         |
| -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------- |
| FIND-001 | 코드 패턴 | `extensions/` 는 `package.json` 의 `pi.extensions` 로 등록된 Pi 전용. peerDeps 도 `@earendil-works/pi-*` 뿐. Claude Code 는 `hooks/`, `skills/` 만 사용                                                                                                             | `plugins/sd/package.json:15-41`, `plugins/sd-wiki/package.json`                                            | SCOPE-001, TASK-001               |
| FIND-002 | 코드 패턴 | `shared/` 7개 중 `reference-output-style.ts` 만 extensions 전용. 나머지 6개는 훅에서 사용                                                                                                                                                                          | extensions/ grep 대조                                                                                      | SCOPE-002, NONSCOPE-005           |
| FIND-003 | 코드 패턴 | 훅 9종 전부 `bun "${CLAUDE_PLUGIN_ROOT}/hooks/*.ts"` 형태. 타임아웃 formatter-collect 30s, formatter-flush 120s. matcher 는 정규식                                                                                                                                  | `plugins/sd/hooks/hooks.json:9,18,29,38,39,49,50,61,65,75,85`                                              | SCOPE-003, TASK-004               |
| FIND-004 | 코드 패턴 | `session-start-statusline.ts` 는 statusLine 이 **레거시 `python` 명령일 때만** bun 명령으로 덮어씀. 레거시 타깃 경로가 `~/.claude/sd/statusline.py` — 이 코드는 원래 Python 이었음                                                                                 | `session-start-statusline.ts:23-25,65-75`                                                                  | SCOPE-004, TASK-006, RISK-002     |
| FIND-005 | 코드 패턴 | sd-wiki 는 `Bun.*` API 미사용. 전부 `node:` 모듈 + 전역 `fetch`. 인증은 `~/.claude/sd/wiki-token.json` + 로컬 콜백 서버(127.0.0.1:0) + 300초 타임아웃                                                                                                              | `wiki-service.ts:16-19,33-44,104-109,193-261`                                                              | SCOPE-005, TASK-007               |
| FIND-006 | 코드 패턴 | `sd-wiki/tests/rules-injection.spec.ts` 는 루트 `vitest.config.ts` 의 `plugins` 프로젝트에 `plugins/*/tests/**/*.spec.ts` 글롭으로 잡힘. 이 spec 이 유일 → 이관 시 프로젝트가 빈 셋                                                                                | `vitest.config.ts:103-111`, `plugins/*/tests` 전수 확인                                                    | SCOPE-008, TASK-008               |
| FIND-007 | 코드 패턴 | `plugins/sd-wiki/hooks/__pycache__/` 에 `cpython-314.pyc` 잔재 존재(원본 .py 삭제됨). `plugins/sd/hooks/__pycache__/` 에는 312, 314 혼재                                                                                                                            | 파일시스템 확인                                                                                            | SCOPE-008, CONSTRAINT-006         |
| FIND-008 | 외부 근거 | 표준 라이브러리만으로 POST JSON, 헤더, 타임아웃, HTTPS(`urllib.request`)와 로컬 콜백 서버(`http.server`) 구현 가능. 4xx/5xx 는 `HTTPError` 예외로 던져져 상태코드 분기에 try/except 필요                                                                              | https://docs.python.org/3/library/urllib.request.html, https://docs.python.org/3/library/http.server.html | CONSTRAINT-009, TASK-007          |
| FIND-009 | 외부 근거 | Claude Code 훅, statusLine, 스킬 모두 언어 중립. 공식 문서가 Python 예제를 병기함                                                                                                                                                                                    | https://code.claude.com/docs/en/hooks, https://code.claude.com/docs/en/statusline                         | 실현 가능성 확인                  |
| FIND-010 | 리스크    | 실측: bun 빈시작 14.7ms / python 빈시작 24.8ms / 실제 bun 훅(import 1개) 49.2ms / python 모듈 30개 import + pyc 44.4ms. **속도 이득은 미미**하며 이 작업의 실익은 런타임 일원화임                                                                                  | 로컬 실측(10회 평균)                                                                                       | DEC-001 근거 정정                 |
| FIND-011 | 코드 패턴 | `formatter.ts` 가 `bun x oxfmt`/`bun x prettier` 를 실행. 이를 안 바꾸면 Bun 의존이 잔존. 커맨드라인 길이 배치 분할 한도 7000자, 실행파일명 길이 기준이 `"bun"` 에 맞춰져 있음                                                                                      | `formatter.ts:40-45,161-163,183-206,230-235`                                                               | SCOPE-006, TASK-005               |
| FIND-012 | 리스크    | `write-hash.ts` 의 `pathHash` 는 Node `path.normalize` 기반. Python `os.path.normpath` 와 미세 차이가 있어 collect/flush 가 서로 다른 런타임이면 마커 디렉터리 불일치                                                                                              | `write-hash.ts:14-16`, `formatter.ts:51-53`                                                                | RISK-003, TASK-005                |
| FIND-013 | 외부 근거 | 실측: Python `subprocess` 로 `node_modules/.bin/oxfmt.CMD` 를 `shell=False` 로 직접 실행 성공(exit 0, `Version: 0.59.0`)                                                                                                                                           | 로컬 실측                                                                                                  | DEC-002 실현성 확인               |
| FIND-014 | 코드 패턴 | 이 저장소 `node_modules/.bin` 에 `oxfmt`(shebang), `oxfmt.CMD`, `oxfmt.ps1` 3종 존재. `prettier` 는 미설치                                                                                                                                                           | 파일시스템 확인                                                                                            | TASK-005 (OS별 분기)              |
| FIND-015 | 코드 패턴 | Windows 인터프리터 실측: `python`=mise 3.14.6 정상, `py`=없음, `python3`=MS Store 앨리어스 스텁(`WindowsApps\python3.exe`)                                                                                                                                         | 로컬 실측                                                                                                  | DEC-003                           |
| FIND-016 | 코드 패턴 | `statusline.ts` 는 detached self-spawn + 배타 락 + 환경변수(`SD_STATUSLINE_LOCK_OWNER`)로 락 소유권 인계 + `fetch`. 이식 난이도 최상                                                                                                                               | `statusline.ts:94,108-118,139-149,158,171,211-222`                                                         | TASK-006, RISK-004                |
| FIND-017 | 코드 패턴 | `WikiApiError.isWriteConflict` 가 서버 메시지 문자열 "저장 충돌" 포함 여부로 판별. 취약하나 서버 호환 위해 보존 필요                                                                                                                                               | `wiki-service.ts:60-62`                                                                                    | TASK-007 구현 주의                |
| FIND-018 | 코드 패턴 | `hook-io.ts` 의 read-hash 캐시는 `tmpdir()/tmp/read_hash/<sessionId>`(원문), formatter 마커는 `tmpdir()/simplysm-sd-formatter/<sha256(sessionId)>`(해시) — 규칙이 서로 다름                                                                                        | `hook-io.ts:36-38`, `formatter.ts:51-53`                                                                   | TASK-003 구현 주의                |
| FIND-021 | 리스크    | `__pycache__` 가 `.gitignore:5` 에 등재돼 있고 git 추적 0건 → **GitHub 배포물에 pyc 가 없음.** 소비자 환경 첫 실행 시 재컴파일 발생. 실측상 pyc 유무 차이는 30모듈 기준 약 15ms                                                                                    | `.gitignore:5`, `git ls-files "plugins/**/__pycache__/*"` 결과 0건, 로컬 실측                              | CONSTRAINT-010, RISK-009          |
| FIND-023 | 리스크    | **개발 세션이 `--plugin-dir plugins/sd`, `plugins/sd-wiki` 로 저장소를 직접 참조함.** 훅, shared 를 수정, 삭제하면 다음 훅 호출부터 즉시 반영되어 **작업 중인 세션이 스스로 깨짐**. `check-write` 가 깨지면 Write 가 막혀 복구 편집조차 불가                          | 사용자 발언 — "--plugin-dir 로 plugins/sd 와 plugins/sd-wiki 를 로딩하고있음"                              | DEC-010, CONSTRAINT-012, RISK-007 |
| FIND-024 | 코드 패턴 | statusLine 마이그레이션의 레거시 인식 대상은 `python "<home>/.claude/sd/statusline.py"` 하나뿐임. 실제 환경 값은 `python "<home>/.claude/plugins/data/sd-claude-inline/statusline.py"` 로 **경로가 달라 매칭되지 않아** 이 훅이 해당 설정을 갱신하지 못하는 상태임 | `session-start-statusline.ts:25,66,72`, 실제 `~/.claude/settings.json` 조회                                | RISK-002 전제 정정, TASK-006      |

## 4. 대안, 결정 로그

| ID      | 결정 상태 | 맥락                                     | 선택지                                                                          | 결정                                        | 근거                                                                                                                                                                                         | 결과, 트레이드오프                                                                     | 재검토 조건                                      |
| ------- | --------- | ---------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| DEC-001 | Accepted  | 런타임 이원화 해소 방향                  | ①Bun 통일 ②Python 통일 ③현행 공존                                               | ②Python 통일 (Pi 제거를 같은 계획에 포함)   | Bun 통일은 과거 시도 후 실패(사용자 발언). Office COM 은 Bun 인프로세스 불가(V8 C++ API 애드온 미지원). 사용자가 PowerShell 경유 거부                                                        | 런타임 1개로 정리. 단 **속도 이득은 미미**(FIND-010) — 실익은 일원화지 성능이 아님    | Bun 이 COM, PDF, msg 를 인프로세스로 지원하게 되면 |
| DEC-002 | Accepted  | 자동 포맷 실행기                         | ①`node_modules/.bin` 직접 ②`npx` ③`bun x` 유지                                  | ①`node_modules/.bin` 직접 실행              | 사용자 선택. 새 런타임 의존을 만들지 않는 유일한 안이며 실행 가능성 실측 확인(FIND-013)                                                                                                      | Bun, Node 추가 설치 불필요. OS별 파일명 분기(`oxfmt` / `oxfmt.CMD`) 필요               | 포매터 배포 형태가 shim 이 아니게 바뀌면         |
| DEC-003 | Accepted  | 훅 인터프리터 지정                       | ①`python` ②`py` ③`python3` ④절대경로                                            | ①`python`, 호출 형태는 현행 shell form 유지 | `py` 부재, `python3` 은 Store 스텁(FIND-015). 기존 스킬이 이미 `python` 사용(`unpack.py` 등) — 코드베이스 일관 패턴                                                                           | 결정근거가 한 방향이라 사용자 논의 없이 확정. PATH 의 `python` 에 의존                | Store 스텁 충돌이 실제 발생하면 exec form 재검토 |
| DEC-004 | Accepted  | 지원 플랫폼 범위                         | ①크로스플랫폼 유지 ②Windows 전용 축소                                           | ①크로스플랫폼 유지                          | 사용자 발언 — 직원 전체 사용 + Linux 내부서버 사용                                                                                                                                           | detached spawn, 파일 락, 브라우저 실행에 OS 분기 필요. macOS/Linux 실검증 수단은 미확보 | 지원 플랫폼이 축소되면                           |
| DEC-005 | Accepted  | Python 개발 도구                         | ①pytest+ruff ②unittest+ruff ③stdlib only                                        | ①pytest + ruff                              | 사용자 선택. 개발은 사용자 1인만 수행하므로 설치 부담이 1대에 국한(사용자 발언 — "개발은 나혼자")                                                                                            | 린트, 테스트 품질 확보. ruff 는 pnpm 밖 설치 경로 필요(CONSTRAINT-008)                 | 개발자가 늘어 셋업 비용이 커지면                 |
| DEC-006 | Accepted  | 대상 Python 버전                         | ①3.10+ ②3.14 고정                                                               | 3.14+ (이후 자율 업데이트)                  | 사용자 결정                                                                                                                                                                                  | 최신 stdlib API 자유 사용(`hashlib.file_digest` 등). 3.14 미만 환경 미지원            | 직원, 서버 환경에 3.14 미만이 발견되면            |
| DEC-007 | Accepted  | 훅 런타임의 외부 의존                    | ①stdlib only ②requests/httpx 허용                                               | ①stdlib only                                | 훅은 직원 배포 대상이고 매 실행 새 프로세스임. `urllib.request`, `http.server` 로 충분함이 확인됨(FIND-008)                                                                                   | 설치 부담 0. 대신 4xx/5xx 를 `HTTPError` 예외로 받는 등 코드가 다소 장황해짐          | 훅에서 stdlib 로 불가능한 통신 요구가 생기면     |
| DEC-008 | Rejected  | Office COM 을 Bun 에서 구동              | winax(node-activex) 사용                                                        | 기각                                        | winax 는 V8 C++ API 애드온이고 Bun 은 JSC 기반이라 `ObjectTemplate`, `FunctionTemplate` 미지원                                                                                                | Bun 통일 경로가 원천 차단됨                                                           | Bun 이 V8 C++ API 셰임을 완성하면                |
| DEC-009 | Rejected  | Office COM 을 PowerShell spawn 으로 우회 | `Bun.spawn` + `New-Object -ComObject`                                           | 기각                                        | 사용자 발언 — "PowerShell 프로세스 경유면 안된다고 봐야함"                                                                                                                                   | Bun 통일 경로 최종 차단                                                               | 없음                                             |
| DEC-010 | Accepted  | 이식 중 개발 세션 자기 파괴 방지 방식    | ①`sd2`, `sd-wiki2` 사본에서 작업 후 미러링 ②git worktree ③브랜치 ④원본 직접 수정 | ①사본 작업 후 `robocopy /MIR` 미러링        | 사용자 제안, 결정. ②는 fresh checkout 이라 `node_modules` 부재로 TASK-005 검증에 `pnpm install` 필요. ③은 모노레포 전체가 바뀌어 병행 작업 저해(CONSTRAINT-013). ④는 세션 자기 파괴(FIND-023) | 현재 세션은 원본을 계속 읽어 안전. 루트 `node_modules` 공유                           | 세션이 원본을 직접 참조하지 않게 되면            |

## 5. 영향도 분석

| ID         | 대상                                                                                           | 영향 유형 | 영향 내용                                                                    | 위험도 | 관련 TASK        |
| ---------- | ---------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- | ------ | ---------------- |
| IMPACT-001 | `plugins/sd/extensions/**`(4,755줄)                                                            | 삭제      | Pi 확장 전체 제거                                                            | Low    | TASK-001         |
| IMPACT-002 | `plugins/sd-wiki/extensions/**`(104줄)                                                         | 삭제      | Pi 확장 전체 제거                                                            | Low    | TASK-001         |
| IMPACT-003 | 두 `package.json` 의 `pi.*`, `keywords`, `peerDependencies`                                      | 수정      | Pi 전용 필드 제거                                                            | Low    | TASK-001         |
| IMPACT-004 | `plugins/sd/shared/reference-output-style.ts`                                                  | 삭제      | extensions 전용이라 함께 폐기                                                | Low    | TASK-001         |
| IMPACT-005 | `pyproject.toml`(신규), ruff, pytest 설정                                                       | 생성      | Python 개발 도구 설정 신설                                                   | Low    | TASK-002         |
| IMPACT-006 | `plugins/sd/shared/*.py`(신규 5종)                                                             | 생성      | hook-io, write-hash, sd-reminder, reference-simplysm, shell-guard                | Medium | TASK-003         |
| IMPACT-007 | `plugins/sd/hooks/*.py` 단순 훅 6종                                                            | 생성/삭제 | TS 제거 + Python 생성                                                        | Medium | TASK-004         |
| IMPACT-008 | `plugins/sd/hooks/hooks.json`                                                                  | 설정      | 실행기 `bun`→`python`, 확장자 `.ts`→`.py`                                    | High   | TASK-004,005,006 |
| IMPACT-009 | formatter collect/flush + `shared/formatter.py`                                                | 생성/삭제 | 실행기 교체 + pathHash 호환                                                  | High   | TASK-005         |
| IMPACT-010 | `hooks/assets/statusline.py` + `session-start-statusline.py`                                   | 생성/삭제 | 락, detached spawn, 마이그레이션 판정 역전                                     | High   | TASK-006         |
| IMPACT-011 | 사용자 `~/.claude/settings.json` 의 `statusLine`                                               | 설정      | 기존 bun 명령을 python 명령으로 교체 — **사용자 머신 상태 변경**             | High   | TASK-006         |
| IMPACT-012 | `plugins/sd-wiki/shared/*.py`(신규 6종)                                                        | 생성      | wiki-service, wiki-login, wiki-util, wiki-rootmap, reference-rules, wiki-reminder | High   | TASK-007         |
| IMPACT-013 | `plugins/sd-wiki/cli/wiki.py` + hooks 4종                                                      | 생성/삭제 | CLI 진입점 + 훅                                                              | Medium | TASK-008         |
| IMPACT-014 | `plugins/sd-wiki/tests/` vitest → pytest                                                       | 테스트    | 러너 이관                                                                    | Medium | TASK-008         |
| IMPACT-015 | 루트 `vitest.config.ts` 의 `plugins` 프로젝트                                                  | 설정      | 대상 spec 소멸로 빈 프로젝트가 됨 → 제거                                     | Low    | TASK-009         |
| IMPACT-016 | 두 `tsconfig.json`, `@types/bun`                                                               | 삭제      | TS 설정 잔재 제거                                                            | Low    | TASK-009         |
| IMPACT-017 | `CLAUDE.md` "에이전트 확장 런타임" 절                                                          | 수정      | Pi, Bun 전제 서술 무효화                                                      | Low    | TASK-009         |
| IMPACT-018 | 잔여 `__pycache__`(cpython-312/314)                                                            | 삭제      | 구버전 pyc 정리                                                              | Low    | TASK-009         |
| IMPACT-019 | wiki CLI 실행 형식 안내 — `sd-wiki/rules/00-remote.md`, `sd-wiki/skills/sd-wiki-lint/SKILL.md` | 수정      | `bun "...wiki.ts"` → `python "...wiki.py"` 로 실행 형식 변경                 | Medium | TASK-008         |
| IMPACT-021 | 두 `package.json` 의 `files` 배열                                                              | 수정      | `"extensions"` 항목 제거                                                     | Low    | TASK-001         |

## 6. 가정 / OPEN / 리스크

### 6.1 가정

| ID      | 가정                                                                     | 근거 수준         | 틀렸을 때 영향                                    | 확인 방법                                  | 구현 차단 여부              |
| ------- | ------------------------------------------------------------------------ | ----------------- | ------------------------------------------------- | ------------------------------------------ | --------------------------- |
| ASM-001 | 직원, Linux 서버 환경에 Python 3.14+ 가 설치돼 있거나 설치 가능함         | 미확인            | 훅 전멸(CONSTRAINT-004 로 폴백 수단 없음)         | 배포 전 대상 환경 Python 버전 전수 확인    | Non-blocking (배포 전 확인) |
| ASM-002 | wiki 서버는 클라이언트 언어와 무관하게 동일 HTTP 계약을 유지함           | 확인됨            | 인증, 조회 실패                                    | `wiki-service.ts` 의 요청 형식 그대로 재현 | Non-blocking                |
| ASM-003 | 포매터가 있는 프로젝트는 `node_modules/.bin` 에 shim 이 존재함           | 확인됨(이 저장소) | 자동 포맷 미동작                                  | TASK-005 에서 부재 시 skip 경로 검증       | Non-blocking                |
| ASM-004 | macOS, Linux 동작은 코드 분기 작성으로 담보하되 실기 검증은 수행하지 못함 | 미확인            | 해당 OS 에서 detached spawn, 락, 브라우저 실행 실패 | 실사용자 피드백 또는 별도 검증 환경 확보   | Non-blocking (RISK-005)     |

### 6.2 OPEN

| ID       | 질문, 미정 사항                                      | 선택지                       | 추천안                                                                                      | 차단 여부 | 해결 후 반영 위치 |
| -------- | --------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- | --------- | ----------------- |
| OPEN-001 | (해소됨) Python 테스트, 린트 실행 경로               | ①`pnpm test` 통합 ②별도 명령 | **해소: ②`pnpm test:py`, `pnpm lint:py` (사용자 결정)**                                      | -         | TASK-002          |
| OPEN-002 | (해소됨) ruff 규칙 세트 범위                        | ①좁게 ②확장 세트             | **해소: ②`E4,E7,E9,F,I,UP,B,SIM` (사용자 결정). 실측 지적 40건 전량 해소**                  | -         | TASK-002          |
| OPEN-003 | (해소됨) Pi 제거 후 두 플러그인의 `package.json`    | ①남김 ②삭제                  | **해소: ②삭제 (사용자 결정). Claude Code 는 `.claude-plugin/plugin.json` 을 쓰므로 무영향** | -         | TASK-001          |
| OPEN-004 | (해소됨 → DEC-010) 이식 중 환경 자기 파괴 방지 방식 | -                            | **해소: `sd2`, `sd-wiki2` 사본에서 작업 후 미러링 (DEC-010)**                                | -         | DEC-010, TASK-000 |

### 6.3 리스크

| ID       | 리스크                                                                                                                                                           | 가능성 | 영향   | 예방, 완화                                                                                                                  | 조기 경고 신호                             | 대응                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------- |
| RISK-001 | Python 미설치 환경에서 훅 전멸. 런타임 의존 선언 수단이 없어 사전 차단 불가                                                                                      | Medium | High   | 배포 전 대상 환경 Python 버전 확인(ASM-001). README 에 전제 명시                                                           | 세션 시작 시 컨텍스트 주입이 전혀 없음     | 해당 환경에 Python 3.14+ 설치           |
| RISK-002 | statusLine 판정 역전 누락 시 갱신 안 됨. 단 현 환경은 레거시 경로 불일치(FIND-024)로 어차피 자동 갱신 대상 아니며, statusLine 즉시 변경은 무해하다는 사용자 판단 | High   | Low    | TASK-006 에서 판정 로직을 bun→python 방향으로 반전. 레거시 인식 대상에 `bun "...statusline.ts"` 추가                       | 이식 후에도 statusline 이 bun 을 계속 호출 | 필요 시 settings.json 수동 지정         |
| RISK-003 | formatter collect(TS)/flush(Python) 혼재 시 `pathHash` 불일치로 마커를 못 찾아 포맷 누락                                                                         | Medium | High   | collect, flush 를 **같은 TASK 에서 동시 전환**(TASK-005). 전환 시 기존 마커 디렉터리 정리                                   | Write 후 포맷이 조용히 안 됨               | 마커 디렉터리 삭제 후 재시작            |
| RISK-004 | statusline 의 detached self-spawn, 락 소유권 인계 프로토콜 이식 실패로 좀비 프로세스, 락 잔존                                                                      | Medium | Medium | 60초 stale 락 해제 로직 보존. OS별 분기(`DETACHED_PROCESS` / `start_new_session`) 명시                                     | statusline 이 갱신 안 되거나 프로세스 누적 | 락 파일 수동 삭제 + 분기 수정           |
| RISK-005 | macOS, Linux 미검증 상태로 배포되어 해당 OS 에서 훅 실패                                                                                                          | Medium | High   | OS 분기를 코드로 명시하고 fail-open 유지. 가능하면 Linux 내부서버에서 사전 스모크 테스트                                   | 해당 OS 사용자의 컨텍스트 주입 실패 보고   | 해당 OS 분기 수정                       |
| RISK-006 | 훅 진입점의 stdout 오염(경고, 트레이스백)으로 컨텍스트가 깨짐                                                                                                     | Medium | High   | 전 진입점 try/except fail-open + 로그 stderr 강제 + `http.server` 액세스 로그 무력화(CONSTRAINT-002)                       | 주입 컨텍스트에 경고 문자열이 섞여 보임    | 해당 진입점 예외 격리 보강              |
| RISK-007 | 사본이 아닌 원본을 실수로 수정해 개발 세션의 훅이 깨지고 작업이 막힘(`check-write` 손상 시 Write 불가)                                                           | Medium | High   | 전 TASK 를 `sd2`, `sd-wiki2` 사본에서만 수행(DEC-010). 원본 `plugins/sd`, `plugins/sd-wiki` 는 미러링 시점까지 **변경 금지** | 세션 시작 실패, Write 차단 오작동          | 원본을 이식 전 상태로 즉시 되돌림       |
| RISK-008 | wiki 쓰기 충돌 판정이 서버 메시지 문자열 의존이라 이식 중 오탐, 미탐                                                                                              | Low    | Medium | 문자열 판정("저장 충돌")을 그대로 보존(FIND-017)                                                                           | 충돌인데 일반 오류로 뜨거나 그 반대        | 판정 문자열 재확인                      |
| RISK-009 | 배포물에 pyc 가 없어(CONSTRAINT-010) 소비자 환경 첫 실행이 재컴파일 — 기대 성능 미달                                                                             | High   | Low    | 애초에 성능이 목표가 아님(DEC-001, FIND-010). 최초 실행 후 쓰기 가능 경로면 pyc 가 생성되어 이후 회복                       | 소비자 환경에서 첫 훅 실행이 유독 느림     | 필요 시 `PYTHONPYCACHEPREFIX` 도입 검토 |
| RISK-012 | 반영 시 사본에 없는 파일이 원본에 남아 잔재가 됨                                                                                                                 | Medium | Medium | TASK-010 에서 원본, 사본 파일 목록을 대조해 이식으로 폐기된 `.ts` 를 명시 삭제                                              | 이식 후에도 `.ts` 파일이 원본에 잔존       | 대조 재실행                             |
| RISK-013 | 사본 작업 중 원본의 문서(`.md`)가 별도 수정돼, 일괄 미러링 시 그 수정이 소실됨                                                                                   | High   | High   | TASK-010 을 파일별 대조 방식으로 수행. 양쪽 변경 파일은 사용자 확인 후 선택(사용자 전언)                                   | 반영 후 원본 문서가 옛 내용으로 되돌아감   | 해당 문서를 수정본으로 복구             |
| RISK-010 | 플러그인 설치 경로가 읽기 전용이면 pyc 를 아예 못 만들어 매 실행 재컴파일이 영구화                                                                               | Low    | Medium | 배포 후 실제 설치 경로 쓰기 권한 확인. 불가 시 `PYTHONPYCACHEPREFIX` 로 쓰기 가능 경로 지정                                | 훅 지연이 지속적으로 큼                    | `PYTHONPYCACHEPREFIX` 설정              |

## 7. 작업 분해

### TASK-000: 작업 사본 생성

- TASK 상태: Done (2026-07-19)
- 목적: 개발 세션이 읽는 원본을 건드리지 않고 작업할 공간을 만듦.
- 연결 근거: FIND-023, DEC-010, CONSTRAINT-012, RISK-007
- 산출물: `plugins/sd2`, `plugins/sd-wiki2` 사본과 검증용 세션 실행 방법
- 변경 대상:
  - 반드시 변경: `plugins/sd2`, `plugins/sd-wiki2` 생성(원본 복사)
  - 변경 가능: 없음
  - **변경 금지: `plugins/sd`, `plugins/sd-wiki` 원본 (TASK-010 미러링 전까지 일절 수정 금지)**
- 현재 상태: 개발 세션이 `--plugin-dir plugins/sd`, `plugins/sd-wiki` 로 원본을 직접 읽는 중
- 작업 내용: 원본을 사본으로 복사(`__pycache__` 제외) → 사본을 `--plugin-dir` 로 지정한 검증 세션이 정상 뜨는지 확인
- 선행 작업: 없음
- 수용 기준: AC-025, AC-026
- 테스트, 검증: TEST-017
- 원천 자료 반영: `[N/A]`
- 롤백 영향: 사본 삭제만으로 원복
- 구현 시 주의:
  - 이후 모든 TASK 의 편집 경로는 `sd2`, `sd-wiki2` 임. 원본 경로를 편집하면 현재 세션이 즉시 깨짐
  - 검증 세션은 `--plugin-dir plugins/sd2 --plugin-dir plugins/sd-wiki2` 로 별도 터미널에서 띄울 것
- 정지 조건: 사본 기준 검증 세션이 뜨지 않으면 중단 — 이후 전 TASK 의 검증 수단이 없어짐

### TASK-001: Pi 확장 제거 및 매니페스트 정리

- TASK 상태: Done (2026-07-19)
- 목적: 이식 표면을 확정하고 shared 이중 유지를 원천 차단함.
- 연결 근거: FIND-001, FIND-002, SCOPE-001, DEC-001
- 산출물: extensions 와 Pi 매니페스트가 제거된 두 플러그인
- 변경 대상:
  - 반드시 변경: `plugins/sd/extensions/**` 삭제, `plugins/sd-wiki/extensions/**` 삭제, 두 `package.json` **파일 삭제**(사용자 결정 — OPEN-003 ②), `pnpm-workspace.yaml` 의 `plugins/*` 제거 + lock 갱신, `plugins/sd/shared/reference-output-style.ts` 삭제, `plugins/sd-wiki/shared/reference-rules.ts` 의 `buildRulesReferenceContext` 제거, `CLAUDE.md` 의 "에이전트 확장 런타임" 절 및 Pi 전제 서술 갱신
  - 변경 가능: `plugins/sd-wiki/shared/wiki-login.ts` 의 Pi/CC 양쪽 지원용 파라미터화 단순화
  - 변경 금지: `skills/**`, `references/**`, `output-styles/**`, `rules/**`, `hooks/**`(TASK-004 이후 대상), `sd.config.ts`
- 현재 상태: `extensions/` 가 `pi.extensions` 로 등록돼 있고 `shared/` 를 훅과 공유 중. `CLAUDE.md` 가 "Pi 확장의 모든 스크립트는 Bun 런타임에서 실행된다" 등을 전제로 서술 중
- 작업 내용: extensions 삭제 → 매니페스트 필드 정리 → extensions 전용 shared 코드 폐기 → 남은 참조 끊김 확인 → `CLAUDE.md` 의 Pi 서술 갱신
- 선행 작업: 없음 (OPEN-004 확정 권장)
- 수용 기준: AC-001, AC-022
- 테스트, 검증: TEST-001, GATE-001
- 원천 자료 반영: `CLAUDE.md` 의 "에이전트 확장 런타임" 절은 Pi 제거 **즉시** 무효화되므로 이 TASK 안에서 갱신함(후처리로 미루지 않음)
- 롤백 영향: 사본에서 파일을 삭제하므로, 되돌리려면 원본에서 다시 복사해야 함
- 구현 시 주의: 삭제 후 `hooks/` 가 참조하는 shared 심볼이 남아 있는지 전수 확인할 것
- 정지 조건: 훅이 참조하는 shared 심볼이 extensions 전용으로 오판돼 함께 삭제될 위험이 보이면 중단

### TASK-002: Python 개발 환경 구성

- TASK 상태: Done (2026-07-19)
- 목적: 이후 모든 이식 TASK 가 린트, 테스트로 검증되도록 기반을 먼저 마련함.
- 연결 근거: DEC-005, DEC-006, CONSTRAINT-008, SCOPE-007
- 산출물: `pyproject.toml`(ruff, pytest 설정), Python 테스트 실행 명령
- 변경 대상:
  - 반드시 변경: `pyproject.toml`(신규), 루트 `package.json` 스크립트(Python 테스트 명령 추가), `CLAUDE.md` 명령 표에 Python 테스트, 린트 항목 추가
  - 변경 가능: `.gitignore`(`__pycache__`, `.pytest_cache`, `.ruff_cache`)
  - 변경 금지: `eslint.config.ts`(Python 은 ruff 담당), `vitest.config.ts`(TASK-009 대상)
- 현재 상태: Python 코드에 대한 린트, 테스트 체계 없음. eslint 는 `plugins/**` 전역 ignore
- 작업 내용: 시스템 Python 에 ruff, pytest 설치(기존 `ensure_pip` 와 동일 인터프리터 — 사용자 결정) → `pyproject.toml` 작성(target-version py314, select `E4,E7,E9,F,I,UP,B,SIM`) → pytest 설정 → `pnpm test:py`, `pnpm lint:py` 추가 → 기존 skills Python 코드 지적 40건 해소 → `CLAUDE.md` 명령 표 갱신
- 선행 작업: 없음
- 수용 기준: AC-002, AC-023
- 테스트, 검증: TEST-002, GATE-002
- 원천 자료 반영: `CLAUDE.md` 명령 표는 도구 도입 **즉시** 갱신 대상이므로 이 TASK 안에서 반영함(후처리로 미루지 않음)
- 롤백 영향: 설정 파일 추가뿐이라 삭제로 원복
- 구현 시 주의: ruff 를 기존 `skills/**` Python 코드에 적용하면 대량 지적이 나올 수 있음. 규칙 세트를 과하게 잡지 말 것
- 정지 조건: 없음

### TASK-003: sd 공통 모듈 Python 이식

- TASK 상태: Done (2026-07-19)
- 목적: 훅들이 공유하는 기반 유틸을 먼저 옮겨 이후 훅 이식이 병렬 가능하게 함.
- 연결 근거: FIND-002, FIND-012, FIND-018, SCOPE-002
- 산출물: `plugins/sd/sd_shared/` 의 Python 모듈 5종 (hook_io, write_hash, sd_reminder, reference_simplysm, shell_guard)
- 공유 폴더명: 두 플러그인의 공유 폴더를 함께 테스트할 때 이름이 겹쳐 충돌하므로 `sd_shared`, `wiki_shared` 로 분리함(사용자 결정, TASK-007 시점 발견)
- 변경 대상:
  - 반드시 변경: `hook-io.ts`, `write-hash.ts`, `sd-reminder.ts`, `reference-simplysm.ts`, `shell-guard.ts` → `.py` 이식
  - 변경 가능: 모듈명을 Python 규칙(언더스코어)으로 변경
  - 변경 금지: `formatter.ts`(TASK-005 에서 실행기 교체와 함께 이식), 훅 진입점
- 현재 상태: TS 모듈이 훅과 (삭제 예정) extensions 양쪽에서 사용됨
- 작업 내용: stdin JSON 파싱, sha256 해시, 경로 정규화, references 조회, shell 규칙 정규식을 이식. `pathHash` 는 Node `path.normalize` 동작과 일치하도록 구현하고 테스트로 고정
- 선행 작업: TASK-001, TASK-002
- 수용 기준: AC-003, AC-004
- 테스트, 검증: TEST-003, TEST-004, GATE-002
- 원천 자료 반영: `[N/A]` — 원천 문서 없는 코드 이식
- 롤백 영향: TS 원본을 남긴 채 작업하면 무영향
- 구현 시 주의:
  - `pathHash` 의 Node/Python 정규화 차이(FIND-012)를 테스트로 반드시 고정할 것
  - **Node `os.tmpdir()` 와 Python `tempfile.gettempdir()` 의 반환값 동등성도 함께 검증할 것** — 마커, 캐시의 기준 디렉터리라 다르면 해시가 같아도 서로 못 찾음
  - 캐시 경로 규칙이 read-hash(원문 sessionId)와 formatter(해시)로 다름(FIND-018) — 뭉개지 말 것
  - shell-guard 의 git 차단은 "전체 git 출현 - 읽기전용 매치" 차집합 방식이며 `sd-git-allow` 우회 토큰이 있음
- 정지 조건: `pathHash` 가 Node 구현과 일치하지 않으면 RISK-003 이 확정되므로 중단하고 방식 재검토

### TASK-004: sd 단순 훅 6종 Python 이식

- TASK 상태: Done (2026-07-19)
- 목적: 상태 공유, 외부 프로세스가 없는 훅을 먼저 전환해 이식 방식을 검증함.
- 연결 근거: FIND-003, CONSTRAINT-001, CONSTRAINT-002, CONSTRAINT-003, SCOPE-003
- 산출물: `user-prompt-submit.py`, `session-start-reference-simplysm.py`, `subagent-start-inject-style.py`, `cache-read-hash.py`, `check-write.py`, `check-shell.py` + 갱신된 `hooks.json`
- 변경 대상:
  - 반드시 변경: 위 6개 훅, `plugins/sd/hooks/hooks.json` 해당 항목
  - 변경 가능: 없음
  - 변경 금지: formatter 훅 2종, statusline 훅(각 TASK-005/006), `sd.config.ts`
- 현재 상태: 6개 훅이 `bun "...ts"` 로 등록됨
- 작업 내용: 각 훅을 Python 으로 이식하고 hooks.json 의 command 를 `python "${CLAUDE_PLUGIN_ROOT}/hooks/*.py"` 로 교체. 전 진입점에 UTF-8 stdout 설정과 fail-open try/except 적용
- 선행 작업: TASK-002, TASK-003
- 수용 기준: AC-005, AC-006, AC-007
- 테스트, 검증: TEST-005, TEST-006, GATE-003
- 원천 자료 반영: `[N/A]`
- 롤백 영향: hooks.json 을 되돌리면 즉시 TS 훅으로 복귀 가능(TS 파일 삭제 전이라면)
- 구현 시 주의:
  - `check-write`, `check-shell` 의 차단은 **exit 2**. exit 1 은 차단되지 않음(CONSTRAINT-001)
  - `subagent-start-inject-style` 의 frontmatter 제거 정규식과 `<!-- main-only -->` 짝 검증, fallback 경로를 그대로 이식
  - SessionStart, UserPromptSubmit 는 stdout 이 컨텍스트이므로 어떤 진단도 stdout 금지
- 정지 조건: 차단 훅(exit 2)이 의도대로 동작하지 않으면 중단 — 오작동 시 정상 작업까지 막힘

### TASK-005: formatter 훅 이식 및 실행기 교체

- TASK 상태: Done (2026-07-19)
- 목적: 자동 포맷을 Bun 없이 동작시키고, 마커 호환이 깨지지 않도록 collect, flush 를 동시에 전환함.
- 연결 근거: FIND-011, FIND-012, DEC-002, RISK-003, SCOPE-006
- 산출물: `shared/formatter.py`, `hooks/formatter-collect.py`, `hooks/formatter-flush.py` + 갱신된 hooks.json
- 변경 대상:
  - 반드시 변경: `shared/formatter.ts`, `hooks/formatter-collect.ts`, `hooks/formatter-flush.ts`, hooks.json 해당 2항목
  - 변경 가능: 배치 분할 상수(실행파일명 길이 기준이 `"bun"` 에서 바뀌므로 재계산)
  - 변경 가능: 마커 파일명 규칙 — 기존 167자 이름이 Windows 경로 한도(260자)를 넘겨 생성 실패함이 드러나, 해시를 앞 12자로 줄임(사용자 결정). collect, flush 동시 전환이라 호환 요구 없음
  - 변경 금지: 마커 디렉터리 규칙
- 현재 상태: `bun x oxfmt`/`bun x prettier` 실행. 마커는 락 없이 UUID 파일명 + 배타 생성으로 보호
- 작업 내용: 포매터 탐지(workspaceRoot package.json) 유지 → 실행 경로를 `node_modules/.bin` 직접 호출로 교체(OS별 `oxfmt` / `oxfmt.CMD` 분기) → 배치 분할 상수 재계산 → collect, flush 를 한 번에 전환
- 선행 작업: TASK-002, TASK-003
- 수용 기준: AC-008, AC-009, AC-010
- 테스트, 검증: TEST-007, TEST-008, GATE-004
- 원천 자료 반영: `[N/A]`
- 롤백 영향: 전환 전 마커가 남아 있으면 롤백 후 처리 불가 → 전환, 롤백 시 마커 디렉터리 정리 필요
- 구현 시 주의:
  - collect 와 flush 를 **절대 분리 전환하지 말 것**(RISK-003)
  - flush 의 출력 규약 보존: `stop_hook_active` true 면 `{"systemMessage":...}`, 아니면 `{"decision":"block","reason":...}` — 무한 루프 방지 로직
  - 포매터 미설치 프로젝트에서는 기존과 동일하게 skip
  - 커맨드라인 길이 한도(7000자) 배치 분할 유지 — Windows 한도 때문에 필요
- 정지 조건: 마커 해시가 기존과 불일치하면 중단하고 TASK-003 의 `pathHash` 부터 재검토

### TASK-006: statusline 이식 및 마이그레이션 판정 역전

- TASK 상태: Todo
- 목적: 가장 복잡한 락, detached spawn, 네트워크 로직을 옮기고, 기존 사용자의 statusLine 설정이 실제로 갱신되게 함.
- 연결 근거: FIND-004, FIND-016, RISK-002, RISK-004, SCOPE-004
- 산출물: `hooks/assets/statusline.py`, `hooks/session-start-statusline.py` + 갱신된 hooks.json
- 변경 대상:
  - 반드시 변경: `hooks/assets/statusline.ts`, `hooks/session-start-statusline.ts`, hooks.json 해당 항목
  - 변경 가능: 락 소유권 인계 환경변수명
  - 변경 금지: 캐시, 락, 자격증명 파일 경로(`~/.claude/statusline-cache.json`, `.lock`, `.credentials.json`), 사용자 커스텀 statusLine 을 건드리지 않는 정책
- 현재 상태: statusLine 이 `bun "~/.claude/sd/statusline.ts"` 로 주입됨. 덮어쓰기 판정은 레거시 `python` 명령일 때만 발동
- 작업 내용: statusline 본체 이식(배타 락, 60초 stale 해제, detached self-spawn 의 OS 분기, `urllib` 15초 타임아웃, 원자적 캐시 쓰기) → 마이그레이션 판정을 **bun→python 방향으로 반전** → 타깃 경로를 `~/.claude/sd/statusline.py` 로 되돌림
- 선행 작업: TASK-002, TASK-003, TASK-004 (§8 의 "이식 방식 검증 후 착수" 근거를 의존으로 명시)
- 수용 기준: AC-011, AC-012, AC-013
- 테스트, 검증: TEST-009, TEST-010, GATE-005
- 원천 자료 반영: `[N/A]`
- 롤백 영향: **사용자 `~/.claude/settings.json` 을 변경하므로 롤백 시 statusLine 수동 복구 필요**(IMPACT-011)
- 구현 시 주의:
  - 판정 반전을 빠뜨리면 기존 bun 설정이 영영 유지됨(RISK-002)
  - 락 소유권 인계 프로토콜(부모가 락 획득 → fd 닫고 환경변수로 자식에 위임) 그대로 보존
  - `process.execPath`+`import.meta.url` → `sys.executable`+`__file__`
  - `formatPercentage` 의 `toFixed(2)` 후 trailing zero 제거 동작 재현
  - 전역 예외 격리로 절대 크래시 금지
- 정지 조건: 락, spawn 동작이 불안정해 좀비 프로세스가 생기면 중단

### TASK-007: sd-wiki 공통 모듈 Python 이식

- TASK 상태: Done (2026-07-19)
- 목적: wiki 통신, 인증 코어를 stdlib 만으로 옮김.
- 연결 근거: FIND-005, FIND-008, FIND-017, CONSTRAINT-005, CONSTRAINT-009, SCOPE-005
- 산출물: `plugins/sd-wiki/shared/` 의 Python 모듈 6종 (wiki_service, wiki_login, wiki_util, wiki_rootmap, reference_rules, wiki_reminder)
- 변경 대상:
  - 반드시 변경: `wiki-service.ts`, `wiki-login.ts`, `wiki-util.ts`, `wiki-rootmap.ts`, `reference-rules.ts`, `wiki-reminder.ts` → `.py`
  - 변경 가능: Pi 양쪽 지원용 파라미터화 제거(TASK-001 에서 선행 정리됨)
  - 변경 금지: API 엔드포인트, 요청 본문 형식, 토큰 저장 경로(`~/.claude/sd/wiki-token.json`), 헤더(`x-sd-client-name: sd-wiki`)
- 현재 상태: 전역 `fetch` + `node:http` 콜백 서버 + `node:crypto` state 발급
- 작업 내용: `urllib.request` 로 POST JSON(20초 타임아웃) → `http.server` 로 127.0.0.1 임의 포트 콜백(300초 타임아웃) → 토큰 원자적 저장(`os.replace`, 0600) → 배타 락(`open(...,"x")`) + detached 워커 spawn(OS 분기)
- 선행 작업: TASK-001, TASK-002
- 수용 기준: AC-014, AC-015, AC-016
- 테스트, 검증: TEST-011, TEST-012, GATE-006
- 원천 자료 반영: `[N/A]`
- 롤백 영향: 토큰 파일 형식은 동일 유지하므로 재로그인 불필요
- 구현 시 주의:
  - 4xx/5xx 가 `HTTPError` 예외로 던져짐 — 401 판정을 try/except 로 처리(FIND-008)
  - 충돌 판정은 서버 메시지 "저장 충돌" 문자열 그대로 보존(FIND-017)
  - `BaseHTTPRequestHandler.log_message` 무력화 필수(CONSTRAINT-002)
  - state 검증(CSRF) 로직 보존 — token 있고 state 일치할 때만 수락
  - `send_header` 에 외부 입력 넣지 말 것(헤더 인젝션)
- 정지 조건: 인증 흐름이 서버와 맞지 않으면 중단하고 요청 형식 재대조

### TASK-008: sd-wiki CLI, 훅 이식 및 테스트 pytest 이관

- TASK 상태: Done (2026-07-19)
- 목적: wiki 진입점을 Python 으로 전환하고 회귀 테스트를 유지함.
- 연결 근거: FIND-005, FIND-006, IMPACT-019, SCOPE-005, SCOPE-007
- 산출물: `cli/wiki.py`, hooks 4종 `.py`, 갱신된 `hooks.json`, pytest 로 이관된 rules 검증 테스트
- 변경 대상:
  - 반드시 변경: `cli/wiki.ts`, `hooks/*.ts` 4종, `hooks/hooks.json`, `tests/rules-injection.spec.ts` → pytest, **`sd-wiki/rules/00-remote.md`**(CLI 실행 형식 안내 원본), **`sd-wiki/skills/sd-wiki-lint/SKILL.md`**(`bun ".../cli/wiki.ts"` 하드코딩)
  - 변경 가능: argv 파싱을 `argparse` 로 전환
  - 변경 금지: CLI 명령 이름, 옵션, JSON 출력 형식, 종료코드(0/1/2/3, 3=충돌)
- 현재 상태: `bun "...wiki.ts" <명령>` 형식. 실행 형식 안내가 `rules/00-remote.md` 와 `skills/sd-wiki-lint/SKILL.md` 두 곳에 각각 하드코딩됨. 테스트는 vitest 로 hooks.json 을 정규식 파싱
- 작업 내용: CLI 이식 → 훅 4종 이식 → **두 문서의 실행 형식 전수 교체** → 테스트를 pytest 로 이관하고 정규식의 `.ts`→`.py` 반영
- 선행 작업: TASK-002, TASK-007
- 수용 기준: AC-017, AC-018, AC-019
- 테스트, 검증: TEST-013, TEST-014, GATE-006
- 원천 자료 반영: `rules/00-remote.md`, `skills/sd-wiki-lint/SKILL.md` 의 CLI 실행 형식 갱신 — 문구가 곧 에이전트 동작 근거이므로 이 TASK 안에서 함께 반영
- 롤백 영향: 안내 문구가 바뀌므로 롤백 시 문구도 함께 되돌려야 함
- 구현 시 주의:
  - 종료코드 3(충돌) 규약 보존 — 자동 재시도 금지 정책도 유지
  - 안내 문구를 안 바꾸면 에이전트가 존재하지 않는 `bun ... wiki.ts` 를 계속 호출함. **두 파일이 서로 독립적으로 하드코딩하므로 한 곳만 고치면 누락됨**
  - 테스트의 8000자 상한 검증 유지
- 정지 조건: CLI 출력 JSON 형식이 기존과 달라지면 중단

### TASK-009: Bun/TS 잔재 정리 및 문서 갱신

- TASK 상태: Done (2026-07-19) — GATE-008(전체 테스트)은 TASK-010 직후 수행해 통과함
- 목적: 남은 TS 설정, 빈 테스트 프로젝트, 구버전 pyc 를 제거하고 잔여 Bun 서술을 정리해 통일을 완결함.
- 연결 근거: FIND-006, FIND-007, SCOPE-008, SCOPE-009
- 산출물: TS 잔재가 제거되고 문서가 현행과 일치하는 저장소
- 변경 대상:
  - 반드시 변경: 두 플러그인의 `tsconfig.json`, `@types/bun` 제거, 루트 `vitest.config.ts` 의 `plugins` 프로젝트 제거, 잔여 `__pycache__`(cpython-312/314) 정리, `CLAUDE.md` 의 **잔여** Bun 서술 정리(Pi 절은 TASK-001, 명령 표는 TASK-002 에서 선반영됨)
  - 변경 가능: `.gitignore` 보강
  - 변경 금지: `packages/*` 의 **소스**
- 현재 상태: `vitest.config.ts:103-111` 에 `plugins` 프로젝트가 있고, 이 프로젝트의 유일한 spec 이 TASK-008 에서 pytest 로 이관되어 빈 셋이 됨
- 작업 내용: TS 설정 제거 → 빈 vitest 프로젝트 제거 → pyc 정리 → `CLAUDE.md` 잔여 서술 전수 검색, 정리
- 선행 작업: TASK-004, TASK-005, TASK-006, TASK-008
- 수용 기준: AC-020, AC-021
- 테스트, 검증: TEST-015, GATE-007
- 원천 자료 반영: `CLAUDE.md` 잔여 서술 정리. 무효화 즉시 갱신이 필요한 두 건(Pi 절, 명령 표)은 각각 TASK-001, TASK-002 에서 선반영되므로 여기서는 나머지만 처리
- 롤백 영향: 사본 내 문서, 설정 변경이라 원본에서 다시 복사하면 원복
- 구현 시 주의: `CLAUDE.md` 외에도 `plugins/**` 문서에 Bun 전제 서술이 남을 수 있으므로 전수 검색할 것
- 정지 조건: 없음

### TASK-010: 사본 미러링 및 정리

- TASK 상태: Done (2026-07-19)
- 목적: 완성된 사본을 원본으로 전환하고 사본을 제거함.
- 연결 근거: DEC-010, RISK-012
- 산출물: Python 으로 전환된 `plugins/sd`, `plugins/sd-wiki` 와 제거된 사본
- 변경 대상:
  - 반드시 변경: `plugins/sd`, `plugins/sd-wiki`(미러링 대상), `plugins/sd2`, `plugins/sd-wiki2` 삭제
  - 변경 가능: 없음
  - 변경 금지: 사본 내용(이 시점엔 확정 상태여야 함)
- 현재 상태: 사본에 완성본이 있고 원본은 이식 전 TS 상태
- 작업 내용: **파일 단위 대조 후 반영**. 사본 생성 이후 원본의 문서(`.md`)가 별도로 수정됐으므로 일괄 미러링(`robocopy /MIR`)은 금지 — 그 변경이 사본 내용으로 덮여 소실됨. 원본, 사본을 파일별로 비교해 ①사본에만 있는 변경(이식 결과)은 원본에 반영 ②원본에만 있는 변경(문서 수정)은 보존 ③양쪽 모두 변한 파일은 **사용자에게 어느 쪽을 살릴지 확인** → 사본 삭제
- 선행 작업: TASK-009
- 수용 기준: AC-027
- 테스트, 검증: GATE-007, GATE-008
- 원천 자료 반영: `[N/A]`
- 롤백 영향: 미러링 전이라면 사본 삭제로 원복. 미러링 후에는 원본이 이식본으로 바뀜
- 구현 시 주의:
  - **미러링 순간부터 현재 개발 세션의 훅이 새 코드로 바뀜.** 이 시점에 세션을 종료하는 것을 전제로 함
  - **일괄 미러링 금지** — 사본 작업 중 원본의 문서가 별도 수정됨(사용자 전언). 파일별 대조 없이 덮으면 그 수정이 소실됨
  - 양쪽 모두 변경된 파일은 임의 병합하지 말고 사용자에게 1건씩 확인할 것
- 정지 조건: 없음

## 8. 실행 순서 / 의존관계

| 순서 | 작업     | 선행 의존                              | 병렬 가능                 | 순서 근거                                                                            | 피해야 할 순서                                            |
| ---- | -------- | -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 0    | TASK-000 | 없음                                   | 불가                      | 사본 없이는 어떤 편집도 개발 세션을 깨뜨림(FIND-023)                                 | **사본 없이 원본 편집 — 세션 자기 파괴**                  |
| 1    | TASK-001 | TASK-000                               | TASK-002 와 병렬 가능     | 이식 표면을 먼저 확정해야 shared 이중 유지를 피함                                    | 이식을 먼저 시작하면 extensions 용 TS 를 계속 유지해야 함 |
| 2    | TASK-002 | TASK-000                               | TASK-001 과 병렬 가능     | 이후 모든 이식이 ruff, pytest 로 검증되므로 도구가 먼저 있어야 함                     | 이식 완료 후 도구 도입하면 전량 재검토 필요               |
| 3    | TASK-003 | TASK-001, TASK-002                     | 불가                      | 훅들이 공유하는 기반 유틸. TASK-004/005/006 의 공통 선행                             | 훅을 먼저 옮기면 shared 를 두 언어로 중복 유지            |
| 4    | TASK-004 | TASK-002, TASK-003                     | TASK-005, 007 과 병렬 가능 | 상태 공유 없는 훅으로 이식 방식을 먼저 검증                                          | 복잡한 statusline 을 먼저 하면 방식 오류가 늦게 드러남    |
| 5    | TASK-005 | TASK-002, TASK-003                     | TASK-004, 007 과 병렬 가능 | collect, flush 동시 전환이 필수라 단일 TASK 로 묶임                                   | **collect 와 flush 를 분리 전환하면 RISK-003 발생**       |
| 6    | TASK-006 | TASK-002, TASK-003, **TASK-004**       | TASK-005, 007 과 병렬 가능 | 난이도 최상이며 사용자 settings 를 변경하므로 TASK-004 로 이식 방식이 검증된 뒤 착수 | TASK-004 완료 전 착수 — 미검증 방식으로 고위험 작업 수행  |
| 7    | TASK-007 | TASK-001, TASK-002                     | TASK-004, 005, 006 과 병렬  | sd-wiki 코어. TASK-008 의 선행                                                       | CLI 를 먼저 옮기면 의존 모듈이 없음                       |
| 8    | TASK-008 | TASK-002, TASK-007                     | 불가                      | 코어(TASK-007)와 pytest(TASK-002) 완료 후 가능                                       | 코어 이식 전 CLI 착수                                     |
| 9    | TASK-009 | TASK-004, TASK-005, TASK-006, TASK-008 | 불가                      | 모든 이식 완료 후에야 잔재 정리가 의미를 가짐                                        | 이식 중 잔재 정리 — 아직 쓰이는 설정을 지우게 됨          |
| 10   | TASK-010 | TASK-009                               | 불가                      | 사본이 완성, 검증된 뒤에만 원본에 반영해야 함                                         | **검증 전 미러링 — 깨진 코드가 개발 세션에 즉시 적용됨**  |

**전 TASK 의 편집 경로는 `plugins/sd2`, `plugins/sd-wiki2` 임.** 원본 `plugins/sd`, `plugins/sd-wiki` 는 TASK-010 미러링 전까지 변경 금지(CONSTRAINT-012, RISK-007).

## 9. 수용 기준 / 테스트 전략 / 검증 게이트

### 9.1 수용 기준

| ID     | 연결 작업 | 조건                                                       | 관찰 가능한 결과                                                                                                                                               | 예외, 오류 케이스                                                          |
| ------ | --------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| AC-001 | TASK-001  | extensions 삭제 후                                         | 두 플러그인에 `extensions/` 가 없고 `package.json` 에 `pi.*`, pi peerDeps 없음                                                                                  | 훅이 참조하는 shared 심볼이 함께 삭제되면 실패                            |
| AC-002 | TASK-002  | `pyproject.toml` 구성 후                                   | ruff 가 `plugins/**/*.py` 를 검사하고, Python 테스트 명령이 실행됨                                                                                             | ruff 미설치 시 명확한 안내 메시지                                         |
| AC-003 | TASK-003  | 공통 모듈 이식 후                                          | 같은 파일을 가리키는 여러 표기가 모두 같은 경로 해시를 산출함(표시를 쓰는 쪽, 읽는 쪽 일치)                                                                     | 표기별로 해시가 갈리면 실패                                               |
| AC-004 | TASK-003  | shell-guard 이식 후                                        | 기존 차단 규칙 11종이 동일하게 판정되고 `sd-git-allow` 우회가 동작함                                                                                           | 정규식 이식 누락으로 오탐, 미탐                                            |
| AC-005 | TASK-004  | Write 대상이 Read 후 변경됐을 때                           | `check-write` 가 exit 2 로 차단하고 stderr 메시지가 모델에 전달됨                                                                                              | exit 1 로 나가면 차단되지 않아 실패                                       |
| AC-006 | TASK-004  | 차단 대상 셸 명령 입력 시                                  | `check-shell` 이 exit 2 로 차단                                                                                                                                | 허용 명령을 차단하면 실패                                                 |
| AC-007 | TASK-004  | 세션 시작, 프롬프트 제출 시                                 | 한국어 컨텍스트가 깨짐 없이 주입되고 stdout 에 진단 문자열이 섞이지 않음                                                                                       | cp949 인코딩으로 한글 깨짐                                                |
| AC-008 | TASK-005  | 포매터가 있는 프로젝트에서 Write/Edit 후 Stop 시           | 대상 파일이 포맷되고 마커가 삭제됨                                                                                                                             | 포매터 실패 시 Stop 차단 + 마커 보존                                      |
| AC-009 | TASK-005  | 포매터가 없는 프로젝트에서                                 | 포맷을 건너뛰고 정상 종료                                                                                                                                      | 오류로 중단되면 실패                                                      |
| AC-010 | TASK-005  | 파일 수가 많아 커맨드라인 한도를 넘을 때                   | 배치 분할되어 전량 포맷됨                                                                                                                                      | 한도 초과로 실행 실패                                                     |
| AC-011 | TASK-006  | 기존 statusLine 이 bun 명령인 사용자 환경에서 세션 시작 시 | statusLine 이 python 명령으로 교체됨                                                                                                                           | 판정 반전 누락 시 bun 명령 유지 → 실패                                    |
| AC-012 | TASK-006  | 사용자가 커스텀 statusLine 을 설정한 환경에서              | 설정을 덮어쓰지 않음                                                                                                                                           | 커스텀 설정 훼손 시 실패                                                  |
| AC-013 | TASK-006  | statusline 실행 시                                         | 캐시가 갱신되고 락이 정상 해제되며 좀비 프로세스가 남지 않음                                                                                                   | 60초 stale 락 미해제 시 영구 정지                                         |
| AC-014 | TASK-007  | 유효 토큰 보유 상태에서 wiki 조회 시                       | 기존과 동일한 JSON 응답                                                                                                                                        | 401 시 토큰 삭제 후 재인증 경로                                           |
| AC-015 | TASK-007  | 미인증 상태에서 로그인 트리거 시                           | 브라우저가 열리고 127.0.0.1 콜백으로 토큰 수신, 저장                                                                                                            | state 불일치 시 수락 거부, 300초 초과 시 타임아웃                         |
| AC-016 | TASK-007  | 쓰기 충돌 발생 시                                          | 종료코드 3 + 최신 본문 반환, 자동 재시도 없음                                                                                                                  | 충돌을 일반 오류로 처리하면 실패                                          |
| AC-017 | TASK-008  | wiki CLI 각 명령 실행 시                                   | 기존과 동일한 JSON 출력, 종료코드                                                                                                                               | 출력 형식 변경 시 실패                                                    |
| AC-018 | TASK-008  | 세션 시작 시 주입되는 wiki 안내 문구                       | 실행 형식이 `python "...wiki.py"` 로 표기됨                                                                                                                    | 구 형식 유지 시 에이전트가 존재하지 않는 명령 호출                        |
| AC-019 | TASK-008  | rules 파일 추가, 누락 시                                    | pytest 가 hooks.json 등록 누락과 8000자 초과를 검출                                                                                                            | 검출 실패 시 회귀 방지 상실                                               |
| AC-020 | TASK-009  | 정리 완료 후                                               | `plugins/**` 에 `.ts` **실행 코드**가 없고, **실행 지점**(hooks.json 의 `command`, shebang, settings.json 의 statusLine, 문서의 CLI 실행 형식)에 `bun` 이 없음 | 규칙 문자열, 문서 예시 등 정당한 `bun` 언급은 잔존 허용(AC 판정 대상 아님) |
| AC-021 | TASK-009  | `CLAUDE.md` 갱신 후                                        | Pi, Bun 전제 서술이 남아 있지 않고 현행 구조와 일치함                                                                                                           | 무효 서술 잔존 시 실패                                                    |
| AC-022 | TASK-001  | extensions 삭제 후                                         | `CLAUDE.md` 의 "에이전트 확장 런타임" 절이 Pi 부재 상태와 일치함                                                                                               | Pi 전제 서술 잔존 시 실패                                                 |
| AC-023 | TASK-002  | 도구 도입 후                                               | `CLAUDE.md` 명령 표에 Python 테스트, 린트 명령이 기재됨                                                                                                         | 누락 시 실패                                                              |
| AC-025 | TASK-000  | 사본 생성 후                                               | `plugins/sd2`, `plugins/sd-wiki2` 가 원본과 동일 내용으로 존재함                                                                                                | `__pycache__` 가 함께 복사돼도 무해                                       |
| AC-026 | TASK-000  | 사본을 `--plugin-dir` 로 지정한 세션 실행 시               | 현재와 동일하게 훅, 컨텍스트 주입이 동작함                                                                                                                      | 사본 세션이 안 뜨면 이후 검증 수단 상실                                   |
| AC-027 | TASK-010  | 미러링 후                                                  | 원본에 사본과 동일한 파일만 존재하고 `.ts` 잔재가 없음                                                                                                         | 여분 파일 잔존 시 실패                                                    |

### 9.2 테스트 전략

| ID       | 연결 작업 | 수준        | 케이스                                                                                                                                | 파일, 명령                             | 통과 기준                                 |
| -------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| TEST-001 | TASK-001  | manual      | 삭제 후 훅이 참조하는 shared 심볼 잔존 여부 전수 검색                                                                                 | grep                                  | 끊긴 참조 0건                             |
| TEST-002 | TASK-002  | lint        | 기존 skills Python 코드에 ruff 적용                                                                                                   | `ruff check plugins/`                 | 설정한 규칙 위반 0건                      |
| TEST-003 | TASK-003  | unit        | 같은 파일의 여러 경로 표기가 동일 해시 산출 + 다른 경로는 다른 해시                                                                   | pytest                                | 표기 무관 일치, 경로 다르면 불일치        |
| TEST-004 | TASK-003  | unit        | shell-guard 차단 규칙 11종 + `sd-git-allow` 우회                                                                                      | pytest                                | 기존 판정과 전부 일치                     |
| TEST-005 | TASK-004  | integration | 각 훅에 실제 stdin JSON 을 주입해 exit code, stdout 확인                                                                               | pytest + 실제 훅 실행                 | exit code, 출력이 규약대로                 |
| TEST-006 | TASK-004  | manual      | 실제 세션에서 컨텍스트 주입 한글 표시 확인                                                                                            | Claude Code 세션 시작                 | 한글 깨짐 없음, 진단 문자열 미혼입        |
| TEST-007 | TASK-005  | integration | 마커 생성 → flush → 포맷 실행 → 마커 삭제 전 과정                                                                                     | pytest                                | 파일이 포맷되고 마커가 정리됨             |
| TEST-008 | TASK-005  | unit        | 배치 분할 경계(7000자 전후)                                                                                                           | pytest                                | 분할 후 전량 포함                         |
| TEST-009 | TASK-006  | unit        | statusLine 마이그레이션 판정 (bun 명령 / python 명령 / 커스텀)                                                                        | pytest                                | bun 만 교체, 커스텀 보존                  |
| TEST-010 | TASK-006  | manual      | 실제 statusline 렌더 + 백그라운드 갱신 + 락 해제                                                                                      | Claude Code 세션                      | 표시 정상, 락, 프로세스 잔존 없음          |
| TEST-011 | TASK-007  | unit        | 충돌 판정("저장 충돌" 문자열), 401 처리, state 검증                                                                                     | pytest (HTTP 는 로컬 스텁 서버)       | 분기 전부 기대대로                        |
| TEST-012 | TASK-007  | manual      | 실제 wiki 서버로 read, write, 충돌 재현                                                                                                 | `python cli/wiki.py read <topic>` 등  | 기존과 동일 동작                          |
| TEST-013 | TASK-008  | integration | CLI 전 명령의 출력 JSON, 종료코드                                                                                                      | pytest                                | 기존 형식과 일치                          |
| TEST-014 | TASK-008  | unit        | rules 등록 누락, 8000자 초과 검출 (기존 vitest spec 이관)                                                                              | pytest                                | 두 케이스 모두 검출                       |
| TEST-015 | TASK-009  | manual      | 실행 지점 한정 잔재 검색 — `hooks.json` 의 `command`, shebang, statusLine 설정, 문서의 CLI 실행 형식, `plugins/**` 의 `.ts` 실행 파일 | grep                                  | 실행 지점 `bun` 0건 + `.ts` 실행 파일 0건 |
| TEST-017 | TASK-000  | manual      | 사본을 `--plugin-dir` 로 지정한 세션이 정상 동작                                                                                      | 별도 터미널에서 사본 경로로 세션 실행 | 훅, 컨텍스트 주입 정상                     |

### 9.3 검증 게이트

| ID       | 시점                 | 검사 항목                                   | 명령, 방법                            | 통과 조건                        | 실패 시 행동                  |
| -------- | -------------------- | ------------------------------------------- | ------------------------------------ | -------------------------------- | ----------------------------- |
| GATE-001 | TASK-001 완료 시     | 끊긴 참조 없음                              | grep + `pnpm check`                  | 오류 0건                         | 삭제 대상 재판정              |
| GATE-002 | 각 이식 TASK 완료 시 | ruff + pytest 통과                          | `ruff check` + pytest                | 위반, 실패 0건                    | 수정 후 재실행                |
| GATE-003 | TASK-004 완료 시     | 실제 세션에서 훅 6종 정상 동작              | **사본 경로로 띄운 검증 세션**       | 차단, 주입 모두 정상              | hooks.json 롤백 후 원인 규명  |
| GATE-004 | TASK-005 완료 시     | 자동 포맷 end-to-end                        | **검증 세션**에서 Write 후 Stop 관찰 | 포맷 적용 + 마커 정리            | 마커 디렉터리 정리 후 재검증  |
| GATE-005 | TASK-006 완료 시     | statusLine 교체 및 렌더                     | **검증 세션** 재시작 후 관찰         | python 명령으로 교체 + 정상 표시 | settings.json 수동 지정       |
| GATE-006 | TASK-008 완료 시     | wiki 전 명령 동작                           | 실서버 대상 CLI 실행(사본 경로)      | 기존과 동일 출력                 | TASK-007 코어 재검토          |
| GATE-007 | TASK-010 착수 전     | Bun 미설치 상태 시뮬레이션에서 전 기능 동작 | PATH 에서 bun 제거 후 검증 세션      | 훅, statusline, wiki 전부 정상     | 잔존 Bun 의존 지점 제거       |
| GATE-008 | TASK-010 완료 시     | 워크스페이스 전체 테스트 통과               | `pnpm test` + Python 테스트 명령     | 실패 0건                         | 실패 테스트 원인 규명 후 수정 |

**GATE-003~007 은 모두 사본(`plugins/sd2`, `plugins/sd-wiki2`)을 `--plugin-dir` 로 지정한 별도 세션에서 수행함.** 현재 개발 세션은 원본을 읽으므로 이식 결과가 반영되지 않음.

## 10. Rollout / Rollback

- Rollout 필요 여부: 필요 — 사용자 본인 환경뿐 아니라 직원, Linux 서버 환경에 배포됨
- Rollout 절차:
  1. 사본(`sd2`, `sd-wiki2`)에서 TASK-000~009 완주, GATE-007 통과
  2. 대상 환경 Python 3.14+ 설치 여부 확인 (ASM-001)
  3. 검증 세션에서 실사용 관찰
  4. TASK-010 미러링 → GATE-008 통과
  5. 직원, Linux 서버 반영 상태 관찰 (RISK-005)
- Rollback 가능 여부: 대체로 가능. 단 아래 지점은 자동 원복되지 않음
- Rollback 절차: 플러그인 디렉터리를 이식 전 상태로 되돌림 → `~/.claude/settings.json` 의 `statusLine` 을 bun 명령으로 수동 복구 → formatter 마커 디렉터리(`tmpdir()/simplysm-sd-formatter/*`) 정리
- Rollback 불가 지점:
  - 사용자, 직원의 `~/.claude/settings.json` statusLine 변경(IMPACT-011) — 각 환경에서 수동 복구 필요. **되돌린 플러그인이 python 명령을 bun 으로 자동 복원하지는 않음**
  - 이미 전달된 소비자 환경 — 되돌린 버전을 다시 받아야 회복
- 관측 지표: 세션 시작 시 컨텍스트 주입 정상 여부, Write 후 포맷 적용 여부, statusline 표시 여부, wiki 명령 성공률
- 중단 조건: RISK-001(Python 미설치로 훅 전멸) 또는 RISK-007(개발 환경 자체가 막힘) 발생 시 즉시 롤백

## 11. Traceability 규칙

- 모든 `SCOPE` 는 최소 1개 `TASK` 와 연결함.
- 모든 `TASK` 는 최소 1개 근거(`FIND`/`DEC`/`SCOPE`)와 연결함.
- 모든 `TASK` 는 최소 1개 `AC` 와 1개 검증 방법(`TEST` 또는 `GATE`)을 가짐.
- 연결되지 않은 작업은 삭제하거나 근거를 추가함.

## 12. 구현 전 차단 조건

| ID        | 차단 조건                           | 관련 OPEN/ASM/RISK | 필요한 결정 | 해결 담당 | 해결 후 갱신 위치 |
| --------- | ----------------------------------- | ------------------ | ----------- | --------- | ----------------- |
| BLOCK-001 | 없음 — Blocking 항목 없이 착수 가능 | -                  | -           | -         | -                 |

비차단이나 착수 전 확인 권장:

| 항목                                  | 관련              | 사유                         |
| ------------------------------------- | ----------------- | ---------------------------- |
| ~~전환 방식~~ (해소)                  | DEC-010           | 사본 작업 후 미러링으로 확정 |
| Python 테스트의 `pnpm test` 통합 여부 | OPEN-001          | TASK-002 착수 시점에 필요    |
| 대상 환경 Python 3.14+ 설치 현황      | ASM-001, RISK-001 | 배포 전까지 확인되면 됨      |
