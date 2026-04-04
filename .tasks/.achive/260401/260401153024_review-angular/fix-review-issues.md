# Feature 1.0 Angular 패키지 리뷰 이슈 수정

## 참조 자료

- [review.md](./review.md) — 코드 리뷰 리포트 (6건: Medium 4, Low 2)

### 대상 파일

- `packages/angular/src/core/utils/setups/setupModelHook.ts` — DESIGN-001
- `packages/angular/src/core/utils/injectParent.ts` — DESIGN-002
- `packages/angular/src/features/shared-data/sd-shared-data-select.control.ts` — PERF-001
- `packages/angular/src/core/providers/sd-shared-data.provider.ts` — PERF-002
- `packages/angular/src/ui/navigation/pagination/sd-pagination.control.ts` — CONSIST-001
- `packages/angular/src/features/permission-table/sd-permission-table.control.ts` — PERF-003

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 수정 범위 | 동작 변경 없는 리팩토링만 | 기존 기능 보전 필수 |
| D2 | DESIGN-002 (injectParent) | 수정 불필요 | 이미 constructor/instanceof 방어 코드 존재 (line 26, 30) |

## 요구명세

Feature: 1.0 Angular 패키지 리뷰 이슈 수정

  Background:
    Given @simplysm/angular 패키지의 기존 기능이 정상 동작한다

  Rule: setupModelHook은 Signal API의 공개 계약을 위반하지 않아야 한다

    Scenario: model guard가 동기 거부 시 값이 변경되지 않는다
      Given setupModelHook으로 guard가 설정된 model signal이 있다
      When canFn이 false를 반환하는 값으로 set을 호출한다
      Then model의 값이 변경되지 않는다

    Scenario: model guard가 비동기 허용 시 값이 변경된다
      Given setupModelHook으로 guard가 설정된 model signal이 있다
      When canFn이 Promise<true>를 반환하는 값으로 set을 호출한다
      Then Promise 완료 후 model의 값이 변경된다

  Rule: injectParent는 Angular 내부 API 변경 시 조기 실패해야 한다

    Scenario: 내부 슬롯에서 컴포넌트 인스턴스를 찾지 못하면 명확한 에러를 발생시킨다
      Given Angular 내부 구조가 변경되어 _lView[8]에 컴포넌트가 없다
      When injectParent를 호출한다
      Then 명확한 에러 메시지가 발생한다

  Rule: 공유 데이터 부분 업데이트는 효율적으로 필터링해야 한다

    Scenario: changeKeys가 다수인 부분 업데이트에서 Set 기반 필터링을 사용한다
      Given 1000건의 공유 데이터가 있다
      When 50건의 changeKeys로 부분 업데이트가 발생한다
      Then Set.has()로 O(N) 필터링이 수행된다

  Rule: 트리 구조 검색은 검색어 단위로 캐싱해야 한다

    Scenario: 동일 검색어에 대해 각 항목의 가시성을 캐시에서 반환한다
      Given 트리 구조의 공유 데이터 선택 컴포넌트가 있다
      When 검색어를 입력한다
      Then 각 항목의 isIncludeSearchText 결과가 캐싱되어 재귀 탐색이 1회만 수행된다

  Rule: pagination의 그룹 이동 메서드는 일관된 방어 로직을 사용해야 한다

    Scenario: goToNextGroup과 goToPrevGroup이 동일한 Math.max 패턴을 사용한다
      Given visiblePageCount가 설정된 pagination이 있다
      When 그룹 이동을 수행한다
      Then 두 메서드 모두 동일한 방어 로직을 사용한다

  Rule: permission-table의 재귀 메서드는 캐싱을 사용해야 한다

    Scenario: 체크박스 변경 시 재귀 결과가 캐싱되어 중복 계산이 없다
      Given 권한 테이블에 다수의 항목이 있다
      When 체크박스를 변경한다
      Then getEditDisabled/getIsPermExists/getIsPermChecked 결과가 캐싱된다

## 구현계획

### 배경

코드 리뷰(review.md)에서 발견된 6건의 이슈 중 5건을 수정한다. DESIGN-002(injectParent)는 이미 충분한 방어 코드가 존재하여 수정 불필요로 결정(D2).

### 목표

- Signal monkey-patch의 안전성 개선 (this 바인딩 보존)
- 공유 데이터 부분 업데이트의 필터링 효율 개선 (O(N×M) → O(N))
- 트리 구조 검색의 메모이제이션 추가
- pagination 그룹 이동 메서드의 일관성 확보
- permission-table 재귀 메서드의 캐싱 추가

### 비목표

- injectParent 수정 (D2에 의해 제외)
- 기존 동작 변경 (모두 리팩토링)

### 설계

#### DESIGN-001: setupModelHook

`model.set`을 캡처할 때 `.bind(model)`로 this 바인딩을 보존한다.

#### PERF-002: sd-shared-data-provider

`changeKeys.map(String)` 배열 → `new Set(changeKeys.map(String))`으로 변경하고, `Array.includes` → `Set.has`로 교체한다.

#### CONSIST-001: sd-pagination

`goToNextGroup`에 `Math.max(this.visiblePageCount(), 1)`을 적용하여 `goToPrevGroup`과 동일한 방어 패턴을 사용한다.

#### PERF-001: sd-shared-data-select

`isIncludeSearchText`를 computed signal 기반 캐시 Map으로 변환한다. `searchText`와 `items`가 변경될 때만 전체 트리를 한 번 순회하여 `Map<TItem, boolean>`을 구축하고, `getItemVisible`에서는 캐시를 참조한다.

#### PERF-003: sd-permission-table

`getEditDisabled`, `getIsPermExists`, `getIsPermChecked`의 결과를 computed signal로 캐싱한다. `value()`와 `items()`가 변경될 때 한 번만 전체 트리를 순회하여 Map을 구축하고, 템플릿에서는 Map 조회만 수행한다.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| setupModelHook을 wrapper signal로 대체 | 미채택 | 호출부 전체 변경 필요, 기존 model() 시그니처 유지 불가 |
| isIncludeSearchText에 WeakMap 캐시 | 미채택 | Chrome 61 호환성 (WeakMap은 OK이나 WeakRef 불가), computed가 더 Angular 패턴에 부합 |

### Vertical Slices

- [x] Slice 1: 단순 수정 (PERF-002, CONSIST-001, DESIGN-001)
- [x] Slice 2: 트리 검색 메모이제이션 (PERF-001)
- [x] Slice 3: 권한 테이블 캐싱 (PERF-003)
