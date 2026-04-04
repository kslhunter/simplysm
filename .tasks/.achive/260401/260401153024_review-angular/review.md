# 코드 리뷰: @simplysm/angular

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/angular/src/` |
| 분석 일시 | 2026-04-01 15:30 |
| 분석 파일 수 | 134 |
| 발견 이슈 | 6건 (Critical: 0, Medium: 4, Low: 2) |

## Medium

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/angular/src/core/utils/setups/setupModelHook.ts:8-33
title: Signal의 set/update 메서드를 직접 교체하는 monkey-patch 패턴
description: |
  model.set과 model.update를 외부에서 직접 덮어쓴다.
  Angular Signal의 내부 구현이 변경되면(예: set/update가 프로토타입 메서드로 변경,
  내부 상태 참조 방식 변경 등) 이 코드가 조용히 깨질 수 있다.
  또한 orgSet을 클로저로 캡처하지만 this 바인딩을 보존하지 않아,
  Angular 내부에서 this를 사용하는 구현으로 변경될 경우 문제가 발생한다.
suggestion: |
  래퍼 signal 또는 effect 기반 guard 패턴으로 대체하여
  Signal API의 공개 계약만 사용하도록 개선.
```

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/angular/src/core/utils/injectParent.ts:16-26
title: Angular 내부 API(_lView[8])에 의존하는 부모 컴포넌트 탐색
description: |
  NodeInjector의 비공개 필드 _lView와 고정 인덱스 [8]을 사용하여
  부모 컴포넌트 인스턴스를 획득한다. Angular 버전 업그레이드 시
  내부 슬롯 위치가 변경되면 런타임에 조용히 실패하거나 잘못된 객체를 반환한다.
  코드 내 주석으로 이 사실을 인지하고 있으나, 대응 수단이 없다.
suggestion: |
  Angular 21의 공개 API(예: inject() 계층 탐색, viewChild/contentChild 기반 연결)로
  대체 가능한지 검토. 불가능하면 Angular 버전별 슬롯 인덱스 매핑 또는
  초기화 시 검증 로직을 추가하여 업그레이드 시 조기 실패하도록 개선.
```

```
id: PERF-001
severity: Medium
category: 성능
location: packages/angular/src/features/shared-data/sd-shared-data-select.control.ts:280-296
title: 트리 구조 검색 시 메모이제이션 없는 재귀 탐색
description: |
  isIncludeSearchText()가 트리 구조에서 자식 노드를 재귀적으로 탐색하며,
  이 메서드는 각 항목의 가시성 판단(getItemVisible)에서 호출된다.
  항목 수 N, 트리 깊이 D일 때 최악의 경우 O(N×D) 탐색이 매 렌더 사이클마다 발생한다.
  검색어가 동일한 동안에도 동일 항목에 대해 반복 계산된다.
suggestion: |
  searchText가 변경될 때만 한 번 전체 트리를 순회하여
  Map<item, boolean> 캐시를 구축하고, getItemVisible에서는 캐시를 참조하도록 개선.
```

```
id: PERF-002
severity: Medium
category: 성능
location: packages/angular/src/core/providers/sd-shared-data.provider.ts:174-176
title: 부분 업데이트 시 Array.includes로 O(N×M) 필터링
description: |
  _onEvent의 부분 업데이트 로직에서 changeKeyStrings 배열에 대해
  Array.includes()를 사용한다. changeKeys가 M개, 기존 items가 N개일 때
  O(N×M) 복잡도가 된다. 대규모 공유 데이터(1000건 이상)에서
  다수의 키가 동시에 변경되면 성능 저하가 발생할 수 있다.
suggestion: |
  changeKeyStrings를 Set으로 변환하여 O(N) 필터링으로 개선:
  `const changeKeySet = new Set(changeKeys.map(String));`
  `filtered = currentItems.filter(item => !changeKeySet.has(String(item.__valueKey)));`
```

## Low

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/angular/src/ui/navigation/pagination/sd-pagination.control.ts:110-116
title: goToNextGroup과 goToPrevGroup의 비일관적 Math.max 가드
description: |
  goToPrevGroup(line 116)은 `Math.max(this.visiblePageCount(), 1)`로
  visiblePageCount가 0인 경우를 방어하지만,
  goToNextGroup(line 111)은 `this.visiblePageCount()`를 그대로 사용한다.
  hasPrev/hasNext 가드가 있어 실제 호출 시 문제가 되지 않지만,
  두 메서드의 방어 로직이 비대칭이다.
suggestion: |
  goToNextGroup에도 동일한 Math.max 가드를 적용하거나,
  groupIndex computed에서 이미 방어하고 있으므로 goToPrevGroup의 중복 가드를 제거.
```

```
id: PERF-003
severity: Low
category: 성능
location: packages/angular/src/features/permission-table/sd-permission-table.control.ts:245-298
title: 템플릿에서 호출되는 재귀 메서드(getEditDisabled, getIsPermExists, getIsPermChecked)
description: |
  getEditDisabled(), getIsPermExists(), getIsPermChecked()는 모두 재귀적이며
  템플릿의 @for 루프 내에서 각 항목마다 호출된다.
  N개 항목, 깊이 D의 트리에서 체크박스당 최대 3개의 재귀 호출이 발생하여
  O(N×D×3) 계산이 매 변경 감지 사이클마다 수행된다.
  일반적인 권한 테이블(20~50항목, 깊이 3~5)에서는 문제없으나,
  대규모 권한 구조에서는 성능 저하 가능성이 있다.
suggestion: |
  value() 변경 시 한 번만 계산하여 Map<item, {editDisabled, permExists, permChecked}>
  캐시를 구축하는 computed signal로 전환.
```
