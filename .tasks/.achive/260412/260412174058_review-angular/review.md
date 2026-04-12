# Code Review: packages/angular

| 항목 | 내용 |
|---|---|
| 분석 대상 | `packages/angular/src/` (core, controls, data, features, layout) |
| 일시 | 2026-04-12 |
| 파일 수 | 120+ |
| 발견 이슈 | 17건 (Medium 8건, Low 9건) |

---

## Medium

### DESIGN-001

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/angular/src/data/data-detail/sd-data-detail.base.ts:66-83
title: queueMicrotask에 취소 메커니즘 없음 — 동일 코드베이스의 시트 리프레시와 불일치
description: effect 내부에서 queueMicrotask로 비동기 작업(wait + refresh)을 예약하지만, onCleanup 기반 취소 플래그가 없다. injectDataSheetRefreshManager(같은 data/ 디렉토리, :61-87)에서는 cancelled 플래그 패턴을 정확히 구현하고 있어 의도적 누락이 아닌 것으로 보인다. effect가 재실행되면 이전 microtask와 새 microtask가 동시에 실행되어 이중 로드가 발생하고, 컴포넌트 destroy 후에도 microtask가 실행될 수 있다.
suggestion: injectDataSheetRefreshManager와 동일한 cancelled 플래그 패턴 적용
```

### DESIGN-002

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/angular/src/layout/dock/sd-dock.ts:175-182
title: onResizeBarMousedown에서 기존 drag 리스너 미정리 — 리스너 누수
description: onResizeBarMousedown 호출 시 document에 mousemove/mouseup 리스너를 등록하고 _dragCleanup에 정리 함수를 저장한다. 그러나 이미 드래그 중일 때 다시 mousedown이 발생하면(빠른 더블클릭 등), 이전 _dragCleanup을 호출하지 않고 덮어쓴다. 이전 리스너 쌍은 document에 영구 잔류한다.
suggestion: onResizeBarMousedown 시작부에 this._dragCleanup?.() 호출 추가
```

### DESIGN-003

```
id: DESIGN-003
severity: Medium
category: 설계
location: packages/angular/src/core/modal/sd-modal.provider.ts:91
title: modalCount 증가 후 createComponent 실패 시 감소 경로 없음
description: showAsync에서 modalCount.update(v => v + 1)이 createComponent(102행) 전에 실행된다. createComponent가 예외를 던지면 Promise는 resolve/reject되지 않고, modalCount는 영구적으로 1 증가 상태로 남는다. cleanup 함수(182행)에서만 modalCount를 감소시키므로 이 경로에 도달하지 못한다.
suggestion: try/catch로 감싸서 실패 시 modalCount 감소 + Promise reject 처리
```

### LOGIC-001

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/angular/src/data/data-sheet/sd-data-sheet.base.ts:87
title: key가 undefined가 되면 모든 시트가 동일한 시스템 설정 키를 공유
description: key = reflectComponentType(this.constructor as any)?.selector 는 생성자 필드 초기화에서 한 번만 실행된다. 서브클래스의 메타데이터 구성이 표준적이지 않으면 selector가 undefined가 되고, sd-data-sheet.ts(:200)에서 [key]="parent.key + '-sheet'" 바인딩 시 "undefined-sheet"가 된다. 같은 앱의 모든 해당 시트가 동일 설정 키를 공유하게 되어 컬럼 설정이 상호 간섭한다.
suggestion: undefined 방어 로직 추가 또는 abstract로 강제
```

### LOGIC-002

```
id: LOGIC-002
severity: Medium
category: 로직
location: packages/angular/src/data/data-sheet/useDataSheetFilterManager.ts:11-14
title: filter가 bindFilter 객체의 직접 참조를 보유 — lastFilter(클론)와 비대칭
description: filter 시그널은 computation: (f) => f로 생성되어 bindFilter()가 반환하는 객체를 직접 참조한다. 반면 lastFilter는 obj.clone으로 깊은 복제한다. 소비자가 bindFilter 원본 객체를 직접 변경(mutation)하면 filter 시그널의 값도 변경되지만 시그널 변경 알림 없이 조용히 바뀌어, "submit 하지 않았는데 필터가 적용된" 상태가 될 수 있다.
suggestion: filter도 초기화 시 깊은 복제 적용, 또는 직접 참조가 의도된 것이라면 lastFilter와의 비교 로직 검증
```

### DESIGN-004

```
id: DESIGN-004
severity: Medium
category: 설계
location: packages/angular/src/data/state-preset/sd-state-preset.ts:120,148,157
title: 프리셋 이름 중복 시 덮어쓰기/다중삭제 발생
description: onAddClick(120행)은 이름 중복을 검사하지 않는다. onSaveClick(148행)은 p.name === preset.name으로 첫 번째 일치 항목만 업데이트하여, 동명 프리셋 중 두 번째는 갱신되지 않는다. onDeleteClick(157행)은 filter로 동명 항목을 모두 삭제한다. 사용자가 같은 이름으로 프리셋을 추가하면 비대칭 동작(저장: 첫 번째만, 삭제: 전부)이 발생한다.
suggestion: 추가 시 이름 중복 검사 또는 고유 ID 기반 식별로 변경
```

### DESIGN-005

```
id: DESIGN-005
severity: Medium
category: 설계
location: packages/angular/src/features/address/sd-address-search.modal.ts:67-121
title: 스크립트 로드 실패 시 에러가 삼켜지고 스피너가 영구 표시
description: ngOnInit에서 void this._initAsync()로 호출하여 Promise rejection을 무시한다. 스크립트 로드 실패(네트워크 오류 등) 시 reject가 발생하지만 catch되지 않아 initialized가 false인 채로 남고, 사용자에게 무한 스피너만 보인다. 또한 스크립트가 이미 DOM에 삽입되었으나(getElementById 체크 통과) 아직 로드 중일 때 바로 new daum.Postcode()를 호출하면 ReferenceError 가능성이 있다.
suggestion: _initAsync의 에러를 catch하여 사용자에게 표시하고, 스크립트 로드 완료를 보장하는 로직 추가
```

### PERF-001

```
id: PERF-001
severity: Medium
category: 성능
location: packages/angular/src/core/selection/useSelectionManager.ts:90
title: isSelected()가 O(n) includes — 템플릿 @for 루프에서 O(N^2)
description: isSelected(item)은 options.selectedItems().includes(item)으로 O(n) 선형 탐색을 수행한다. 이 함수가 @for 루프 내의 각 행에서 호출되면 전체 O(N^2)가 된다. 대규모 시트(수백~수천 행)에서 성능 저하를 유발할 수 있다.
suggestion: computed로 selectedItems의 Set을 캐싱하고 isSelected에서 Set.has() 사용
```

---

## Low

### CONSIST-001

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/angular/src/core/modal/sd-activated-modal.provider.ts:11
title: canDeactiveFn — Angular CanDeactivate 네이밍과 불일치
description: 프로퍼티명이 canDeactiveFn으로 "ate"가 누락되어 있다. Angular의 CanDeactivate 인터페이스 및 같은 코드베이스의 setupCanDeactivate 함수명과 불일치한다. sd-modal.ts(:392), setupCanDeactivate.ts(:11)에서 일관되게 사용되어 기능적 문제는 없으나 네이밍 불일치이다.
suggestion: canDeactivateFn으로 이름 변경 (사용처 일괄)
```

### CONSIST-002

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/angular/src/controls/input/sd-date-range.picker.ts (파일명)
title: 파일명 sd-date-range.picker.ts — 컨벤션 sd-{name}.ts 위반
description: controls/ 내 다른 모든 파일은 sd-{name}.ts (하이픈 구분)를 사용하지만, 이 파일만 sd-date-range.picker.ts로 점(.) 구분자를 사용한다. 프로바이더(.provider.ts), 플러그인(.plugin.ts) 등의 점 접미사와도 성격이 다르다.
suggestion: sd-date-range-picker.ts로 이름 변경
```

### CONSIST-003

```
id: CONSIST-003
severity: Low
category: 일관성
location: packages/angular/src/data/data-sheet/injectDataSheetModalEditManager.ts:54
title: 토스트 메시지 띄어쓰기 불일치
description: "${del ? "삭제" : "복구"} 되었습니다." (공백 있음)으로 작성되어 있으나, sd-data-detail.base.ts(:129)는 "${del ? "삭제" : "복구"}되었습니다." (공백 없음)이다. 동일한 의미의 메시지에 띄어쓰기가 다르다.
suggestion: 공백 제거하여 통일
```

### CONSIST-004

```
id: CONSIST-004
severity: Low
category: 일관성
location: packages/angular/src/data/data-sheet/useDataSheetFilterManager.ts (파일명)
title: use 접두사 — 같은 폴더의 inject* 패턴과 불일치
description: 같은 data-sheet/ 폴더의 다른 composable은 모두 inject* 접두사(injectDataSheetRefreshManager, injectDataSheetExcelManager 등)를 사용한다. 이 함수는 inject()를 직접 호출하지 않아 use*가 규칙상 맞지만, 기능적 역할(상태 관리 + 액션 제공)은 inject* 계열과 동일하여 혼란을 줄 수 있다.
suggestion: 코드베이스 컨벤션 문서에 이 케이스에 대한 명시적 가이드 추가, 또는 내부적으로 inject()가 없으므로 현행 유지
```

### DESIGN-006

```
id: DESIGN-006
severity: Low
category: 설계
location: packages/angular/src/controls/dropdown/sd-dropdown.ts:202-203
title: isPlaceBottom/isPlaceRight 변수명이 의미와 반대
description: isPlaceBottom = window.innerHeight < rect.top * 2 — 실제로는 "요소가 뷰포트 하반부에 있으므로 팝업을 위로 배치"를 의미한다. 이름은 "아래에 배치"로 읽히지만 실제 동작은 "위에 배치"이다. isPlaceRight도 동일한 반전이 있다.
suggestion: isElementInBottomHalf / shouldPlaceAbove 등 의미가 명확한 이름으로 변경
```

### DESIGN-007

```
id: DESIGN-007
severity: Low
category: 설계
location: packages/angular/src/data/sheet/injectSheetColumnResizing.ts:65-70
title: onMousedown에서 기존 리사이징 리스너 미정리 (DESIGN-002와 동일 패턴)
description: sd-dock.ts의 DESIGN-002와 동일한 패턴. 이미 리사이징 중일 때 onMousedown이 재호출되면 resizingCleanup이 호출 없이 덮어써져 이전 리스너가 누수된다. 일반적 마우스 조작에서는 발생하기 어렵지만 방어 코드가 없다.
suggestion: onMousedown 시작부에 resizingCleanup?.() 호출 추가
```

### PERF-002

```
id: PERF-002
severity: Low
category: 성능
location: packages/angular/src/data/shared-data/sd-shared-data-select.ts:324-341
title: getChildren 메서드가 호출마다 재정렬 — 메모이제이션 없음
description: getChildren은 트리 렌더링 엔진에 의해 각 부모 노드마다 호출되며, 매번 [...result].sort(...)를 수행한다. P개 부모 × C개 자식 기준 O(P × C log C)이다. rootDisplayItems는 computed로 캐싱하고 있으나 getChildren은 일반 메서드여서 렌더링 시마다 반복 정렬된다.
suggestion: 자식 목록을 computed/Map으로 메모이제이션
```

### LOGIC-003

```
id: LOGIC-003
severity: Low
category: 로직
location: packages/angular/src/features/visual/sd-barcode.ts:30-39
title: bwipjs.toSVG()가 computed 내부에서 호출 — 예외 발생 시 에러 경계 없음
description: bwipjs.toSVG()는 잘못된 type/value 조합에서 동기 예외를 던진다. computed 내부에서 발생한 예외는 Angular의 변경 감지로 전파되어 글로벌 에러 핸들러를 트리거한다. 사용자 입력이 실시간으로 바뀌는 경우(예: 바코드 값 입력 중) 연속적 에러가 발생할 수 있다.
suggestion: try/catch로 감싸서 에러 시 빈 문자열 반환 또는 에러 상태 표시
```

### LOGIC-004

```
id: LOGIC-004
severity: Low
category: 로직
location: packages/angular/src/core/config/injectSdSystemConfigResource.ts:18-26
title: 낙관적 시그널 업데이트 후 비동기 persist 실패 시 롤백 없음
description: set(value) 호출 시 res.set(value)로 즉시 시그널을 업데이트한 뒤 queueMicrotask로 비동기 저장을 시도한다. 저장 실패 시 errorHandler로 에러는 보고되지만, 시그널 값은 이미 업데이트된 상태로 남아 UI와 실제 저장 상태가 불일치한다.
suggestion: 실패 시 이전 값으로 시그널 롤백 추가
```
