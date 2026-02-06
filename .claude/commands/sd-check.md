---
description: 타입체크, 린트, 테스트를 통해 코드 검증
argument-hint: [path]
---

## 사용법

- `/sd-check` — 전체 프로젝트 검증
- `/sd-check packages/core-common` — 특정 경로만 검증

인자가 있으면 해당 경로를 대상으로, 없으면 전체 프로젝트를 대상으로 실행합니다.

## 코드 검증

아래 3가지 검증을 **순서대로** 실행합니다.
각 단계에서 오류가 발생하면 **직접 코드를 수정**하고 해당 단계를 다시 실행합니다.
오류가 없을 때까지 반복한 후 다음 단계로 넘어갑니다.

### Step 1: TypeScript 타입체크

```
pnpm typecheck $ARGUMENTS
```

오류 발생 시: 해당 파일을 Read하여 원인을 파악하고, Edit으로 수정한 뒤 다시 typecheck 실행.

### Step 2: ESLint 린트

```
pnpm lint --fix $ARGUMENTS
```

오류 발생 시: 해당 파일을 Read하여 직접 Edit으로 수정한 뒤 다시 lint 실행.

### Step 3: 테스트 (Vitest)

```
pnpm vitest package/{{패키지명}} --run $ARGUMENTS
```

`--run` 플래그로 watch 모드 없이 1회 실행합니다.
패키지에 따라 vitest.config.ts내의 통합테스트가 필요할 수 있습니다.

테스트 실패 시: 실패한 테스트와 관련 소스 파일을 Read하여 원인을 파악하고, Edit으로 수정한 뒤 다시 테스트 실행.

## 완료 조건

3단계 모두 오류 없이 통과하면 완료.
