# Feature 3 성능 최적화

## 참조 자료

- [wbs.md](wbs.md)
- [review.md](../260329162645_review-sd-cli-tasks/review.md)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | side-effect SCSS 재컴파일 조건 | changedFiles에 .scss/.css가 있을 때만 재컴파일 | TS-only 변경 시 SCSS 재컴파일은 불필요. 최소 변경으로 최대 효과 |

## 요구명세

```gherkin
Feature: 3 성능 최적화

  Background:
    Given Angular 라이브러리 패키지가 watch 모드로 빌드 중이다
    And side-effect SCSS import가 레지스트리에 등록되어 있다

  Rule: SCSS 변경이 없으면 side-effect SCSS를 재컴파일하지 않는다

    Scenario: TS 파일만 변경된 경우 SCSS 재컴파일 스킵
      Given changedFiles에 .ts 파일만 포함되어 있다
      When watch rebuild가 실행된다
      Then compileSideEffectScss가 호출되지 않는다
      And 기존 CSS 출력 파일이 유지된다

    Scenario: SCSS 파일이 변경된 경우 side-effect SCSS 재컴파일
      Given changedFiles에 .scss 파일이 포함되어 있다
      When watch rebuild가 실행된다
      Then compileSideEffectScss가 호출되어 레지스트리 전체를 재컴파일한다

    Scenario: CSS 파일이 변경된 경우에도 재컴파일
      Given changedFiles에 .css 파일이 포함되어 있다
      When watch rebuild가 실행된다
      Then compileSideEffectScss가 호출된다
```

## 구현계획

### 배경

`ngtsc-build.worker.ts`의 watch 모드에서 `performWatchBuild`가 매번 `compileSideEffectScss`를 무조건 호출한다. side-effect SCSS가 많은 프로젝트에서 TS-only 변경에도 불필요한 SCSS 컴파일이 발생한다.

### 목표

- TS-only 변경 시 side-effect SCSS 재컴파일 스킵

### 비목표

- 개별 SCSS 엔트리의 선택적 재컴파일 (변경된 SCSS에 의존하는 엔트리만 재컴파일하는 세밀한 최적화)
- global SCSS 최적화 (global SCSS는 항상 단일 파일이므로 비용이 낮음)

### 설계

`performWatchBuild`에 `hasScssChanges` 파라미터를 추가하거나, 내부에서 판단한다. watch 콜백에서 `changedFiles` 중 `.scss` 또는 `.css` 확장자가 있는지 확인하여, 없으면 `compileSideEffectScss` 호출을 스킵한다.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| scssDependencies 역방향 조회로 영향받는 엔트리만 재컴파일 | 미채택 | 구현 복잡도 대비 추가 이득이 적음. SCSS 파일 변경 자체가 드물어 전체 재컴파일도 수용 가능 |
| compileSideEffectScss를 항상 호출하되 파일 해시 비교로 스킵 | 미채택 | 해시 계산 오버헤드가 추가되고 구현 복잡 |

### Vertical Slices

- [x] Slice 1: watch rebuild에서 SCSS 변경 여부 기반 조건부 재컴파일

#### Slice 1: watch rebuild에서 SCSS 변경 여부 기반 조건부 재컴파일

- **구현 내용:** `ngtsc-build.worker.ts`의 watch 콜백에서 `changedFiles` 중 `.scss`/`.css` 파일 존재 여부를 확인. `performWatchBuild`에 `hasScssChanges` boolean 전달. false이면 `compileSideEffectScss` 호출 스킵
- **파일:** `packages/sd-cli/src/workers/ngtsc-build.worker.ts`
- **Scenarios:**
  - Scenario: TS 파일만 변경된 경우 SCSS 재컴파일 스킵
  - Scenario: SCSS 파일이 변경된 경우 side-effect SCSS 재컴파일
  - Scenario: CSS 파일이 변경된 경우에도 재컴파일
