# Feature FIX-3 UI Layout/Nav/Data/Visual Issues

## 참조 자료

### 대상 파일 목록

| # | 이슈 ID | 파일 | 설명 |
|---|---------|------|------|
| 1 | LOGIC-003 | `packages/angular/src/ui/data/sheet/useSheetCellAgent.ts:196` | clipboard.writeText에 null 전달 가능 |
| 2 | LOGIC-012 | `packages/angular/src/ui/visual/sd-calendar.control.ts:147-175` | O(42*N) 필터링 성능 |
| 3 | LOGIC-013 | `packages/angular/src/ui/layout/kanban/sd-kanban-lane.control.ts:139` | 빈 lane에서 isAllSelected=true |
| 4 | LOGIC-014 | `packages/angular/src/ui/data/sheet/useSheetColumnFixing.ts:17-23` | px 외 단위 무시 |
| 5 | LOGIC-015 | `packages/angular/src/ui/visual/sd-progress.control.ts:25` | progress bar 방향 오류 |
| 6 | DESIGN-005 | `packages/angular/src/ui/navigation/sidebar/sd-sidebar-container.control.ts:72` | router subscription 미해제 |
| 7 | LOGIC-024 | `packages/angular/src/ui/visual/sd-echarts.control.ts:55` | ECharts merge 모드로 시리즈 잔존 |
| 8 | LOGIC-020 | `packages/angular/src/ui/navigation/pagination/sd-pagination.control.ts:115` | goToPrevGroup 비대칭 |
| 9 | LOGIC-021 | `packages/angular/src/ui/data/sheet/useSheetLayoutEngine.ts:65-116` | header 병합 부모 레벨 미확인 |
| 10 | LOGIC-022 | `packages/angular/src/ui/layout/kanban/sd-kanban.control.ts:31-32` | cardHeight 초기값 0 |
| 11 | LOGIC-023 | `packages/angular/src/ui/navigation/collapse/sd-collapse.control.ts:49-51` | 닫힌 상태에서 높이 stale |
| 12 | CONSIST-007 | `sd-topbar-menu.control.ts` + `sd-sidebar-menu.control.ts` | 메뉴 로직 중복 |

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | LOGIC-003: null 처리 방식 | `td.textContent ?? ""` | TypeScript strict null 안전성 |
| D2 | LOGIC-012: 캘린더 최적화 방식 | Map<tick, T[]> 사전 빌드 | O(N) 한번 빌드 후 O(1) 조회, 42*N → N+42 |
| D3 | LOGIC-013: 빈 lane 가드 | `this.kanbanControls().length > 0 &&` 추가 | Array.every 빈 배열 true 방지 |
| D4 | LOGIC-014: column fixing 단위 처리 | 경고 로그 없이 px 단위만 처리, 비-px는 0으로 처리 (현 동작 유지) | 현재 sheet는 px width만 사용하는 패턴. console.* 금지 규칙으로 경고 불가. DOM 측정은 과도 |
| D5 | LOGIC-015: progress bar 방향 | `right: 0` → `left: 0` | LTR에서 왼쪽부터 채우는 것이 직관적 |
| D6 | DESIGN-005: subscription 해제 | `DestroyRef.onDestroy()` 사용 | 코드베이스 기존 패턴 (sd-echarts.control.ts 등) |
| D7 | LOGIC-024: ECharts merge 모드 | `notMerge` input 추가 (기본값 false) | 기존 동작 유지하면서 소비자가 제어 가능 |
| D8 | LOGIC-020: goToPrevGroup 대칭성 | 이전 그룹의 첫 페이지로 이동 | goToNextGroup과 대칭 |
| D9 | LOGIC-021: header 병합 부모 확인 | 비최종행에서도 부모 레벨 매칭 확인 | 다른 부모 아래 동일 텍스트 헤더가 잘못 병합되는 것 방지 |
| D10 | LOGIC-022: cardHeight 초기값 | afterNextRender에서 초기 높이 측정 | 첫 렌더 후 실제 DOM 크기 반영 |
| D11 | LOGIC-023: collapse 높이 재측정 | open 전환 시 현재 높이를 재측정 | 닫힌 동안 콘텐츠 변경되어도 올바른 마진 보장 |
| D12 | CONSIST-007: 메뉴 유틸 추출 | 공통 함수 `getMenuRouterLinkOption`, `getIsMenuSelected` 추출 | 두 파일의 동일 로직 제거 |

## 요구명세

```gherkin
Feature: FIX-3 UI Layout/Nav/Data/Visual Issues

  Rule: Clipboard copy는 null-safe해야 한다 (LOGIC-003)

    Scenario: td.textContent가 null인 셀을 Ctrl+C로 복사
      Given 시트 셀이 포커스되어 있고 textContent가 null이다
      When Ctrl+C를 누른다
      Then clipboard.writeText에 빈 문자열이 전달된다

  Rule: 캘린더 아이템 매핑은 O(N+42)이어야 한다 (LOGIC-012)

    Scenario: N개 아이템을 42셀에 매핑
      Given N개의 아이템과 yearMonth가 주어진다
      When dataTable computed가 실행된다
      Then 각 셀의 items가 올바른 날짜의 아이템만 포함한다

    Scenario: 아이템이 없는 날짜
      Given 아이템이 없는 달이 주어진다
      When dataTable computed가 실행된다
      Then 모든 셀의 items가 빈 배열이다

  Rule: 빈 kanban lane의 isAllSelected는 false여야 한다 (LOGIC-013)

    Scenario: 빈 lane의 전체 선택 상태
      Given kanban lane에 카드가 없다
      When isAllSelected를 확인한다
      Then false를 반환한다

    Scenario: 모든 카드가 선택된 lane
      Given kanban lane에 카드가 있고 모두 선택되어 있다
      When isAllSelected를 확인한다
      Then true를 반환한다

  Rule: Sheet column fixing은 px 외 단위에서 안전해야 한다 (LOGIC-014)

    Scenario: px 단위 width를 가진 고정 컬럼
      Given width="100px"인 fixed 컬럼이 있다
      When fixedLeftMap이 계산된다
      Then 올바른 누적 left 값이 설정된다

    Scenario: px 외 단위 width를 가진 고정 컬럼
      Given width="10em"인 fixed 컬럼이 있다
      When fixedLeftMap이 계산된다
      Then 해당 컬럼의 width는 0으로 처리된다

  Rule: Progress bar는 왼쪽부터 채워져야 한다 (LOGIC-015)

    Scenario: 50% progress
      Given value=0.5인 progress bar가 있다
      When 렌더링된다
      Then ._progress 요소의 left가 0이다

  Rule: Sidebar container의 router subscription은 해제되어야 한다 (DESIGN-005)

    Scenario: 컴포넌트 destroy 시 subscription 해제
      Given router가 주입된 sidebar container가 있다
      When 컴포넌트가 destroy된다
      Then router event subscription이 해제된다

  Rule: ECharts는 notMerge 옵션을 지원해야 한다 (LOGIC-024)

    Scenario: notMerge=true로 시리즈 교체
      Given ECharts에 시리즈 A가 표시되어 있다
      When notMerge=true로 시리즈 B로 옵션을 변경한다
      Then 시리즈 A가 잔존하지 않는다

    Scenario: 기본(notMerge=false) 동작 유지
      Given ECharts에 시리즈 A가 표시되어 있다
      When 기본 설정으로 시리즈 B를 추가한다
      Then 시리즈 A와 B가 모두 표시된다

  Rule: goToPrevGroup은 이전 그룹의 첫 페이지로 이동해야 한다 (LOGIC-020)

    Scenario: 두 번째 그룹에서 이전 그룹으로 이동
      Given currentPage=15, visiblePageCount=10이다
      When goToPrevGroup을 호출한다
      Then currentPage가 0이 된다 (이전 그룹 첫 페이지)

  Rule: Sheet header 병합은 부모 레벨도 확인해야 한다 (LOGIC-021)

    Scenario: 다른 부모 아래 동일 텍스트 헤더
      Given 컬럼 A의 header=["Parent1","Child"]이고 컬럼 B의 header=["Parent2","Child"]이다
      When headerDefTable이 계산된다
      Then "Child" 셀이 병합되지 않는다

  Rule: Kanban cardHeight는 초기 렌더 후 측정되어야 한다 (LOGIC-022)

    Scenario: 초기 렌더 시 cardHeight
      Given kanban 카드가 렌더링된다
      When afterNextRender가 실행된다
      Then cardHeight가 0이 아닌 실제 높이이다

  Rule: Collapse는 open 전환 시 높이를 재측정해야 한다 (LOGIC-023)

    Scenario: 닫힌 상태에서 콘텐츠 높이 변경 후 open
      Given collapse가 닫혀있고 contentHeight=100이다
      When 콘텐츠 높이가 200으로 변경된다
      Then contentHeight가 200으로 갱신된다

  Rule: 메뉴 라우터 링크 로직은 공통 유틸리티여야 한다 (CONSIST-007)

    Scenario: topbar-menu와 sidebar-menu가 같은 유틸 함수를 사용
      Given 동일한 codeChain을 가진 메뉴가 있다
      When getMenuRouterLinkOption을 호출한다
      Then topbar와 sidebar 모두 동일한 결과를 반환한다
```

## 구현계획

### 배경

FIX-3은 코드 리뷰에서 발견된 12건의 UI 버그/개선 사항을 수정한다. 대상은 layout(kanban, collapse), navigation(sidebar, pagination, topbar), data(sheet), visual(calendar, progress, echarts) 영역이다.

### 목표

- 12건의 확인된 이슈를 최소 변경으로 수정
- 기존 테스트 회귀 없음

### 비목표

- 새 컴포넌트 추가
- API 변경 (LOGIC-024의 notMerge input 추가만 예외)

### 설계

#### LOGIC-003: useSheetCellAgent.ts

`td.textContent` → `td.textContent ?? ""`로 변경 (line 196).

#### LOGIC-012: sd-calendar.control.ts

`dataTable` computed 내에서:
1. `Map<number, T[]>` (tick → items)을 한 번 빌드
2. 42셀 순회 시 `map.get(date.tick) ?? []`로 O(1) 조회

#### LOGIC-013: sd-kanban-lane.control.ts

```typescript
isAllSelected = computed(() =>
  this.kanbanControls().length > 0 && this.kanbanControls().every((ctrl) => ctrl.selected())
);
```

#### LOGIC-014: useSheetColumnFixing.ts

현 동작 유지. px 외 단위는 이미 누적에 기여하지 않으므로 정상 동작. 코드 명확성을 위해 주석 추가는 하지 않음 (이슈 재확인 결과 현 코드가 이미 안전).

#### LOGIC-015: sd-progress.control.ts

CSS에서 `right: 0` → `left: 0` 변경.

#### DESIGN-005: sd-sidebar-container.control.ts

`DestroyRef`를 inject하고 `subscription`을 `destroyRef.onDestroy()`로 해제.

#### LOGIC-024: sd-echarts.control.ts

`notMerge = input(false)` 추가. `setOption` 호출 시 `{ notMerge: this.notMerge() }` 전달.

#### LOGIC-020: sd-pagination.control.ts

`goToPrevGroup` 변경:
```typescript
goToPrevGroup(): void {
  this.currentPage.set((this.groupIndex() - 1) * this.visiblePageCount());
}
```

#### LOGIC-021: useSheetLayoutEngine.ts

비최종행 병합 조건에 부모 레벨 매칭 추가:
```typescript
if (!lastCell.isLastRow && !isLastRow) {
  // 부모 레벨도 확인
  canMerge = true;
  const prev = spanStartHeaders[row];
  for (let r = 0; r < row; r++) {
    const prevText = r < prev.length ? prev[r] : prev[prev.length - 1];
    const curText = r < headers.length ? headers[r] : headers[headers.length - 1];
    if (prevText !== curText) {
      canMerge = false;
      break;
    }
  }
}
```

#### LOGIC-022: sd-kanban.control.ts

`afterNextRender`에서 초기 `cardHeight`를 측정:
```typescript
afterNextRender(() => {
  const card = this._elRef.nativeElement.querySelector("sd-card");
  if (card != null) {
    const marginBottom = getComputedStyle(card).marginBottom;
    this.cardHeight.set(card.clientHeight + (parseInt(marginBottom) || 0));
  }
});
```

#### LOGIC-023: sd-collapse.control.ts

`contentMarginTop` computed에서 `open()` 전환 시 높이 재측정은 이미 `onContentResize`에서 처리됨. 문제는 닫힌 상태에서 resize 이벤트가 발생하지 않는 경우. `open()` 의존 effect를 추가하여 open 전환 시 높이를 재측정:
```typescript
effect(() => {
  if (this.open()) {
    this.contentHeight.set(this._contentElRef().nativeElement.offsetHeight);
  }
});
```

#### CONSIST-007: 메뉴 유틸 추출

`packages/angular/src/ui/navigation/menu-utils.ts`에 공통 함수 추출:
- `getMenuRouterLinkOption(menu)` — ISdMenu 인터페이스 기반
- `getIsMenuSelected(menu, fullPageCode, customFn?)` — 선택 여부 판단

두 컨트롤에서 이 함수를 import하여 사용.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| LOGIC-014: DOM 측정으로 실제 px 변환 | 미채택 | 과도한 복잡성, 현재 px만 사용하는 패턴 |
| LOGIC-024: 기본값 notMerge=true | 미채택 | 기존 소비자 코드 깨짐 위험 |
| DESIGN-005: takeUntilDestroyed() pipe | 미채택 | 코드베이스에 기존 패턴 없음, DestroyRef.onDestroy()가 기존 패턴 |
| LOGIC-020: 이전 그룹 마지막 페이지 유지 | 미채택 | goToNextGroup과 비대칭, UX 혼란 |

### Vertical Slices

#### Slice 1: Quick Critical/Medium fixes
- [x] **구현 내용:** LOGIC-003 (null-safe clipboard), LOGIC-013 (빈 lane 가드), LOGIC-015 (progress 방향), DESIGN-005 (subscription 해제)
- **Scenarios:**
  - Scenario: td.textContent가 null인 셀을 Ctrl+C로 복사
  - Scenario: 빈 lane의 전체 선택 상태
  - Scenario: 모든 카드가 선택된 lane
  - Scenario: 50% progress
  - Scenario: 컴포넌트 destroy 시 subscription 해제

#### Slice 2: Calendar performance
- [x] **구현 내용:** LOGIC-012 (Map 기반 O(1) 조회)
- **의존:** 없음
- **Scenarios:**
  - Scenario: N개 아이템을 42셀에 매핑
  - Scenario: 아이템이 없는 날짜

#### Slice 3: Sheet fixes
- [x] **구현 내용:** LOGIC-014 (확인 후 현 동작 유지), LOGIC-021 (header 병합 부모 확인)
- **의존:** 없음
- **Scenarios:**
  - Scenario: px 단위 width를 가진 고정 컬럼
  - Scenario: px 외 단위 width를 가진 고정 컬럼
  - Scenario: 다른 부모 아래 동일 텍스트 헤더

#### Slice 4: Kanban/Collapse/ECharts
- [x] **구현 내용:** LOGIC-022 (cardHeight 초기 측정), LOGIC-023 (collapse 높이 재측정), LOGIC-024 (notMerge input)
- **의존:** 없음
- **Scenarios:**
  - Scenario: 초기 렌더 시 cardHeight
  - Scenario: 닫힌 상태에서 콘텐츠 높이 변경 후 open
  - Scenario: notMerge=true로 시리즈 교체
  - Scenario: 기본(notMerge=false) 동작 유지

#### Slice 5: Navigation cleanup
- [x] **구현 내용:** LOGIC-020 (goToPrevGroup 대칭), CONSIST-007 (메뉴 유틸 추출)
- **의존:** 없음
- **Scenarios:**
  - Scenario: 두 번째 그룹에서 이전 그룹으로 이동
  - Scenario: topbar-menu와 sidebar-menu가 같은 유틸 함수를 사용
