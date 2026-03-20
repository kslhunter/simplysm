---
name: sd-ref-tdd
description: TDD 워크플로우 가이드.
argument-hint: "<대상 파일 경로> [추가 컨텍스트]"
---

# sd-ref-tdd: TDD 워크플로우 가이드

TDD 워크플로우 가이드를 제공한다. RED → GREEN → Refactor → Commit 각 Phase의 절차와 주의사항을 제공한다.

## 워크플로우

### 1. RED Phase

테스트를 작성하고 실행하여 실패를 확인한다.

- 테스트가 모두 통과하면 테스트가 문제를 재현하지 못한 것이므로, 다른 관점에서 재작성한다 (최대 3회)
- 3회 시도 후에도 통과하면 사용자에게 보고하고 중단한다

### 2. GREEN Phase

테스트 실패 항목에 대해 대상을 수정하고 재테스트한다.

- 수정 → 재테스트를 반복한다 (최대 3회)
- 3회 시도 후에도 실패하면 사용자에게 보고하고 중단한다

### 3. Refactor Phase

GREEN Phase에서 대상을 수정한 경우에만 수행한다.

`/sd-simplify` 후 재테스트하여 통과를 확인한다.

### 4. Commit Phase

`/sd-commit`으로 커밋한다. 작업 하나 = commit 하나.
