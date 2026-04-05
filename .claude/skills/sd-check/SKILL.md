---
name: sd-check
description: typecheck, lint, test를 실행하고 에러 발생시 사용자 선택에 따라 해결하는 스킬. "타입체크 돌려줘", "린트 고쳐줘", "체크 돌리고 수정해줘" 등을 요청할 때 사용한다.
---

# sd-check: Check 실행 & 에러 수정

## 공통 규칙

### 에러 수정

실패하면 `sd-debug`스킬의 지침에 따르되 아래 지침을 우선으로 따른다:

- 문서기록 및 완료 출력은 하지 않고, 바로 직접 수정한다.

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

### 1-3. 탐지 결과 표시

```
탐지된 check 스크립트:
1. typecheck → pnpm run typecheck
2. lint → pnpm run lint
3. test → pnpm run test
```

탐지된 스크립트가 없으면 사용자에게 실행할 명령어를 질문한다.

## Step 2: typecheck

typecheck 명령어를 실행한다. 실패하면 수정 후 재실행한다.

## Step 3: lint

린트 명령어를 실행한다. 실패하면 수정 후 재실행한다.

- 가능하면 자동픽스(--fix) 명령을 실행한다.

## Step 4: test

테스트 명령어를 실행한다. 실패하면 수정 후 재실행한다.

## Step 5: 반복 혹은 완료

typecheck, lint, test를 수행하는 동안 코드 수정이 있었으면 `typecheck`부터 다시 시작한다. 수정이 없었으면 완료.
