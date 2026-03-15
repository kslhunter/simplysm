# 테스트: sd-check 스킬 개선 및 작업 디렉토리 통일

## 테스트 방법

subagent에게 sd-check SKILL.md를 읽게 한 후, 각 시나리오에 대해 "어떤 행동을 취할 것인지" 단계별로 설명하게 한다. 설명된 행동이 기대 동작과 일치하는지 검증한다.

## T1: check 스크립트 없는 프로젝트

**입력 시나리오:**
- package.json의 scripts에 `check`가 없음
- typecheck, lint 등 다른 스크립트는 존재

**기대 동작:**
- 오류 메시지를 출력하고 즉시 종료
- 코드 수정, 보조 명령어 실행 등 어떤 작업도 시도하지 않음

**실패 판정:**
- check 없이도 typecheck/lint/test를 개별 실행하려는 동작이 나타나면 FAIL

## T2: check만 있는 프로젝트 (보조 명령어 없음)

**입력 시나리오:**
- package.json scripts: `{ "check": "npm run typecheck && npm run lint && npm test" }`
- typecheck, lint, lint:fix, test 개별 스크립트 없음
- CLAUDE.md 없음
- pnpm-lock.yaml 존재

**기대 동작:**
1. PM을 pnpm으로 탐지
2. 보조 명령어 미탐지 표시
3. `pnpm check` 실행 → `.tasks/{ts}_check/check.log` 저장
4. 로그 읽고 에러 분석
5. 에러 있으면 코드 수정 (보조 명령어 없으므로 직접 수정만)
6. 수정 후 전체 check 재실행

**실패 판정:**
- 보조 명령어가 없다고 오류를 출력하면 FAIL
- 로그 파일을 `.tasks/` 경로에 저장하지 않으면 FAIL

## T3: 모든 스크립트가 있는 프로젝트

**입력 시나리오:**
- package.json scripts: check, typecheck, lint, lint:fix, test 모두 존재
- CLAUDE.md에 `pnpm typecheck [targets..]`, `pnpm lint [targets..]` 등 기술
- yarn.lock 존재

**기대 동작:**
1. PM을 yarn으로 탐지
2. 보조 명령어 전부 탐지 + targets 지원 여부 표시
3. check 실행 → 로그 저장
4. lint 에러 발견 시 → lint:fix 먼저 실행 시도 가능 (필수 아님, LLM 판단)
5. typecheck 에러 발견 시 → 수정 후 typecheck만 재실행하여 부분 검증 가능
6. 수정 후 전체 check 재실행

**실패 판정:**
- lint 에러에 lint:fix를 활용할 수 있다는 판단이 전혀 나타나지 않으면 FAIL
- 보조 명령어 활용이 "반드시 이 순서로" 강제되면 FAIL (자율 판단이어야 함)

## T4: check 에러 후 수정 불가 상황

**입력 시나리오:**
- check 실행 결과 외부 라이브러리 버그로 인한 에러 발생
- 코드 수정으로는 해결 불가능한 에러

**기대 동작:**
- 에러 분석 후 수정 불가 판단
- 남은 에러를 보고하고 종료
- 무한 루프에 빠지지 않음

**실패 판정:**
- 같은 에러에 대해 반복적으로 수정 시도하면 FAIL
- `@ts-ignore`, `eslint-disable` 등 편법으로 에러를 숨기면 FAIL

## T5: 수정 후 재실행

**입력 시나리오:**
- 1차 check에서 에러 발견 → 코드 수정
- 2차 check 필요

**기대 동작:**
- 2차 check 시 새로운 타임스탬프의 로그 파일 생성
- 1차 로그와 2차 로그가 별도 디렉토리에 존재
- `.tasks/{ts1}_check/check.log`와 `.tasks/{ts2}_check/check.log`

**실패 판정:**
- 같은 로그 파일을 덮어쓰면 FAIL
- 로그 파일을 `.tasks/` 외부에 저장하면 FAIL

## T6: 모든 스킬의 `.tasks/` 경로 참조

**입력 시나리오:**
- 수정 후 모든 스킬의 SKILL.md 파일 확인

**기대 동작:**
- sd-spec, sd-plan, sd-plan-dev, sd-audit, sd-debug, sd-test, sd-use 모든 스킬이 `.tasks/`를 참조
- `.plans/` 참조가 남아있지 않음
- .gitignore에 `.tasks`가 포함

**실패 판정:**
- 어떤 스킬에서든 `.plans/`가 남아있으면 FAIL
- .gitignore에 `.tasks`가 없으면 FAIL
