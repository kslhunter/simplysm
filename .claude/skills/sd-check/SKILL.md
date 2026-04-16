---
name: sd-check
description: typecheck, lint, test를 실행하고 에러 발생시 사용자 선택에 따라 해결하는 스킬. "타입체크 돌려줘", "린트 고쳐줘", "체크 돌리고 수정해줘" 등을 요청할 때 사용한다.
---

# sd-check: Check 실행 & 에러 수정

## 공통규칙

### 에러 분석 및 수정

에러 분석: `/sd-inner-debug` 스킬을 호출한다.

#### 에러 처리 범위

이 **대화(conversation)** 에서, sd-check 호출 전에 Claude가 코드를 수정한 것.
- git status의 미커밋 변경이나 과거 커밋 변경을 말하는것이 아님.
- sd-check 내부(typecheck/lint/test 단계)에서의 수정을 말하는것이 아님.
- **CRITICAL**: sd-check 단독 실행시, 발견된 모든 에러를 수정해야함 (예: test 에러 발견시, typecheck/lint의 수정과는 별개로 모두 수정)
- sd-check호출전 대화내 수정이 있었던 경우, 해당 수정과 관련된 에러만 수정 대상으로 봄

#### 에스컬레이션 규칙

**CRITICAL: 동일 에러가 2회 반복되면 즉시 수정을 중단하고 사용자에게 보고한다.**

- 1회차: `/sd-inner-debug` 스킬을 호출하여 근본 원인을 분석하고 수정을 시도한다.
- 2회차(동일/유사 에러 재발): 수정을 중단하고, 지금까지의 분석 결과와 시도한 수정 내용을 사용자에게 보고한 뒤 판단을 요청한다.
- 원인을 특정할 수 없는 경우에도 즉시 사용자에게 보고한다. 추측으로 수정 시도 금지.

### 출력 캡처 규칙

Bash 출력이 길면 잘리므로 **반드시 파일로 리다이렉트**한 뒤 **Read 도구**로 읽는다.

1. `mkdir -p .tmp/check` (Bash, 최초 1회)
2. 각 검사 명령어를 아래 형식으로 실행한다:
   ```bash
   TS=$(date +%y%m%d%H%M%S); <명령어> > .tmp/check/${TS}_<카테고리>.txt 2>&1; echo "EXIT_CODE:$?" >> .tmp/check/${TS}_<카테고리>.txt
   ```
3. **Read 도구**로 결과 파일을 읽고, 마지막 줄의 `EXIT_CODE`로 성공/실패를 판단한다.

## Step 1: 명령어 탐지

### 1-1. 패키지 매니저 감지

프로젝트 루트에서 lock 파일로 패키지 매니저를 결정한다:

| lock 파일                   | 실행 명령어 |
| --------------------------- | ----------- |
| `pnpm-lock.yaml`            | `pnpm run`  |
| `yarn.lock`                 | `yarn run`  |
| `bun.lock` 또는 `bun.lockb` | `bun run`   |
| 그 외                       | `npm run`   |

### 1-2. 스크립트 탐지

1. **Read 도구**로 루트 디렉토리의 `package.json`을 읽는다
2. `scripts` 객체의 키 목록을 추출한다
3. 아래 패턴 테이블과 대조하여 각 카테고리에 매칭되는 스크립트 이름을 찾는다

| Step | 스크립트 이름 패턴         | 카테고리  |
| ---- | -------------------------- | --------- |
| 2    | typecheck, type-check, tsc | 타입 체크 |
| 3    | lint, eslint               | 린트      |
| 4    | test, jest, vitest, mocha  | 테스트    |

**typecheck와 lint는 동시수행할 수 있는 `script`가 있다면 하나로 묶어 동시수행**
- Step 2 + Step 3가 하나의 Step으로 병합됨 (예: `pnpm check`)

### 1-3. 탐지 결과 표시

```
탐지된 check 스크립트:
1. typecheck → pnpm run typecheck
2. lint → pnpm run lint
3. test → pnpm vitest run
```

탐지된 스크립트가 없으면 오류 메시지를 출력하고 종료한다.

## Step 2: typecheck

typecheck 명령어를 실행한다. (`출력 캡처 규칙`에 따라 파일로 리다이렉트)

- 에러 발생 시: `에러 분석 및 수정`에 따라, 에러를 분석하고 수정한다.

## Step 3: lint

린트 명령어를 실행한다. (`출력 캡처 규칙`에 따라 파일로 리다이렉트)

- 가능하면 자동픽스(--fix) 명령을 실행한다.
- 자동픽스 후에도 에러가 남으면: `에러 분석 및 수정`에 따라, 에러를 분석하고 수정한다.

## Step 4: test

테스트 명령어를 실행한다. (`출력 캡처 규칙`에 따라 파일로 리다이렉트)

- 에러 발생 시: `에러 분석 및 수정`에 따라, 테스트 실패의 원인을 분석하고 코드를 수정한다.
- 코드 수정후, 테스트 변경이 누락되었을 수 있음. 의도파악을 위해서 history확인이 필요할 수 있다.

## Step 5: 반복 혹은 완료

typecheck, lint, test를 수행하는 동안 코드 수정이 있었으면 `typecheck`부터 다시 시작한다. 수정이 없었으면 완료.
