# Code Review: @simplysm/angular

| 항목 | 값 |
|------|------|
| 분석 대상 | `packages/angular/src/` |
| 일시 | 2026-03-30 13:13 |
| 파일 수 | 119개 |
| 발견 이슈 | **38건** (Critical 5, Medium 17, Low 16) |

---

## Critical (5건)

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/angular/src/core/directives/sd-router-link.directive.ts:50-65
title: Ctrl/Alt/Shift+click이 Chrome <a> 표준 동작과 불일치
description:
  Chrome <a> 태그의 표준 수식키 동작:
  - Ctrl+click → 새 백그라운드 탭
  - Ctrl+Shift+click → 새 포그라운드 탭
  - Shift+click → 새 창
  - Alt+click → 다운로드
  현재 구현:
  - Ctrl+click, Alt+click → 동일하게 _navWindow.open(url, params, "_blank") 호출
  - Shift+click → 팝업 윈도우 (width/height 지정)
  문제 1: Ctrl/Alt+click에서 features="_blank"이 non-empty이므로
  SdNavigateWindowProvider.open의 팝업 분기에 진입하여
  window.open(url, "", "_blank")을 호출한다 (target이 빈 문자열, "_blank"은
  features로 전달). 새 탭이 아닌 예측 불가 팝업 동작 발생.
  문제 2: Ctrl+click과 Ctrl+Shift+click의 구분이 없음.
  문제 3: Alt+click이 다운로드가 아닌 새 탭 동작으로 매핑됨.
  문제 4: Shift+click이 새 창이 아닌 커스텀 팝업(window=true)으로 동작.
suggestion:
  Chrome <a> 표준 동작을 따르도록 수정한다:
  - Ctrl+click → window.open(url, "_blank") (새 백그라운드 탭)
  - Ctrl+Shift+click → window.open(url, "_blank") 후 focus (새 포그라운드 탭)
  - Shift+click → window.open(url, "_blank", "noopener") 등 새 창
  - Alt+click → 다운로드 또는 기본 동작 무시
  SdNavigateWindowProvider.open의 features/target 파라미터도 분리 필요.
```

```
id: LOGIC-002
severity: Critical
category: 로직
location: packages/angular/src/core/utils/setups/setupModelHook.ts:24
title: async canFn 에러가 .catch(() => {})로 완전히 무시됨
description:
  canFn이 비동기 함수일 때 .catch(() => {})로 모든 에러를 삼킨다.
  canFn 내부에서 네트워크 호출 등이 실패해도 사용자에게 아무런 피드백이 없고,
  모델은 이전 값을 유지한다. 프로젝트 규칙(sd-problem-solving.md)의
  "try-catch로 에러 무시 — 런타임 문제를 숨긴다"에 해당한다.
suggestion:
  빈 catch를 제거하고, Angular ErrorHandler를 통해 에러를 전파하거나
  onError 콜백을 추가한다.
```

```
id: LOGIC-003
severity: Critical
category: 로직
location: packages/angular/src/core/utils/setups/setupCanDeactivate.ts:28-32
title: canDeactivate 가드가 routeConfig에 누적되어 메모리 누수 발생
description:
  setupCanDeactivate가 activatedRoute.routeConfig.canDeactivate에 가드를 push한다.
  routeConfig는 같은 라우트의 모든 인스턴스가 공유한다.
  컴포넌트 파괴 시 가드를 제거하는 cleanup이 없으므로, 네비게이션을 반복할 때마다
  가드가 누적된다. 누적된 가드는 파괴된 컴포넌트의 클로저를 참조하며,
  매 deactivation마다 모두 호출된다.
suggestion:
  DestroyRef.onDestroy에서 해당 가드를 routeConfig.canDeactivate에서 splice로 제거한다.
```

```
id: LOGIC-004
severity: Critical
category: 로직
location: packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts:379
title: TipTap Underline 확장이 미등록 -- 밑줄 버튼 동작 불능
description:
  툴바에 밑줄(U) 버튼이 있고 chain.toggleUnderline().run()을 호출하지만,
  @tiptap/extension-underline이 package.json에 의존성으로 선언만 되어 있고
  실제로 import 및 DEFAULT_EXTENSIONS에 추가되지 않았다.
  StarterKit에는 Underline이 포함되지 않으므로 toggleUnderline()은 no-op이고,
  activeStates.underline은 항상 false이다.
suggestion:
  Underline을 import하여 DEFAULT_EXTENSIONS 배열에 추가한다.
```

```
id: LOGIC-005
severity: Critical
category: 로직
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:727-730
title: setTimeout으로 _isOnResizing 해제 -- 프로젝트 금지 패턴
description:
  onResizerMousedown의 mouseup 핸들러에서 _isOnResizing을 300ms setTimeout으로
  해제한다. 리사이즈 직후 헤더 클릭 시 소팅 트리거 방지 목적이지만,
  sd-problem-solving.md의 "setTimeout으로 타이밍 문제 회피" 금지에 해당한다.
  타이밍 기반이므로 느린 환경에서 300ms가 부족하거나, 빠른 환경에서 불필요한
  지연이 발생할 수 있다.
suggestion:
  mouseup 이벤트에서 stopPropagation 사용, 또는 mouseup의 timeStamp를 저장하고
  onHeaderClick에서 event.timeStamp과 비교하는 확정적 방식으로 대체한다.
```

---

## Medium (17건)

```
id: LOGIC-006
severity: Medium
category: 로직
location: packages/angular/src/core/plugins/events/sd-resize-event.plugin.ts:47-49
title: requestAnimationFrame이 cleanup 시 취소되지 않음
description:
  cleanup 함수가 resizeObserver.disconnect()만 호출한다.
  이미 스케줄된 requestAnimationFrame 콜백이 disconnect 이후 실행되어
  파괴된 엘리먼트에 핸들러가 동작할 수 있다.
suggestion:
  cleanup에서 cancelAnimationFrame(animationFrameId)를 호출한다.
```

```
id: LOGIC-007
severity: Medium
category: 로직
location: packages/angular/src/core/providers/sd-app-structure.provider.ts:55
title: getTitleByFullCode가 잘못된 fullCode에서 TypeError 발생
description:
  getItemChainByFullCode가 빈 배열을 반환하면 .last()가 undefined이고,
  .title 접근 시 TypeError가 발생한다. URL 파라미터나 역직렬화된 상태에서
  잘못된 fullCode가 들어올 수 있다.
suggestion:
  빈 itemChain에 대한 가드를 추가한다 (fallback 값 반환 또는 명시적 에러).
```

```
id: LOGIC-008
severity: Medium
category: 로직
location: packages/angular/src/core/utils/useSdSystemConfigResource.ts:27-29
title: queueMicrotask 내 setAsync 에러가 추적 불가
description:
  set 메서드가 sdSystemConfig.setAsync를 queueMicrotask 내에서 호출한다.
  실패 시 unhandled promise rejection이 발생하지만, 호출자에게 반환되지 않아
  저장 실패를 알 수 없다.
suggestion:
  Angular ErrorHandler를 통해 에러를 전파하거나 set이 Promise를 반환하도록 변경한다.
```

```
id: LOGIC-009
severity: Medium
category: 로직
location: packages/angular/src/core/utils/setups/setupInvalid.ts:15-16
title: indicator/hidden input 엘리먼트가 destroy 시 DOM에서 제거되지 않음
description:
  createIndicatorEl, createInputHiddenEl이 hostEl에 엘리먼트를 추가하지만,
  컴포넌트 파괴 시 제거하는 로직이 없다. *ngIf 등으로 호스트가 재사용되면
  고아 엘리먼트가 누적될 수 있다.
suggestion:
  DestroyRef.onDestroy에서 indicatorEl.remove(), inputEl.remove()를 호출한다.
```

```
id: LOGIC-010
severity: Medium
category: 로직
location: packages/angular/src/ui/form/input/sd-date-range.picker.ts:74
title: "월" 기간 타입에서 to 날짜가 비정규화된 fromDate로 계산됨
description:
  periodType이 "월"일 때, from은 fromDate.setDay(1)로 정규화하지만
  to는 원본 fromDate로 계산한다. fromDate가 1월 31일이면
  addMonths(1)이 2월 28일이 되어 to가 1월 31일 대신 다른 값이 될 수 있다.
suggestion:
  정규화된 firstOfMonth를 기준으로 to를 계산한다:
  firstOfMonth.addMonths(1).addDays(-1)
```

```
id: LOGIC-011
severity: Medium
category: 로직
location: packages/angular/src/ui/form/input/sd-textfield.control.ts:381-394
title: onInputPaste에서 preventDefault 누락 -- 브라우저 기본 붙여넣기와 충돌
description:
  onInputPaste가 클립보드 데이터를 읽어 모델 값을 설정하지만,
  event.preventDefault()를 호출하지 않는다. 핸들러 반환 후 브라우저가
  기본 paste를 실행하여 input에 텍스트를 삽입하고, onInput이 다시 트리거된다.
suggestion:
  event.preventDefault()를 핸들러 시작부에 호출하고,
  inputEl.value를 포맷된 값으로 수동 설정한다.
```

```
id: LOGIC-012
severity: Medium
category: 로직
location: packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts:297-302
title: disabled/readonly effect가 editor 생성을 추적하지 못함
description:
  두 번째 effect가 this.editor를 읽지만 editor는 plain 필드(signal 아님)이다.
  첫 번째 effect가 editor를 생성해도 두 번째 effect가 재실행되지 않아
  초기 editable 상태가 적용되지 않을 수 있다.
suggestion:
  this.editor를 signal로 만들거나, editable 로직을 첫 번째 effect에 통합한다.
```

```
id: LOGIC-013
severity: Medium
category: 로직
location: packages/angular/src/ui/layout/kanban/sd-kanban-lane.control.ts:139,161
title: isAllSelected/onSelectAllButtonClick이 selectable 플래그를 무시
description:
  isAllSelected가 모든 kanban을 체크하여 selectable=false인 항목 때문에
  항상 false를 반환한다. onSelectAllButtonClick도 selectable 여부를 확인하지 않고
  모든 값을 selectedValues에 추가한다. selectableKanbanLength(line 147)에서는
  selectable을 필터링하므로 의도가 불일치한다.
suggestion:
  isAllSelected와 onSelectAllButtonClick 모두 ctrl.selectable()로 필터링한다.
```

```
id: LOGIC-014
severity: Medium
category: 로직
location: packages/angular/src/ui/navigation/pagination/sd-pagination.control.ts:69
title: visiblePageCount=0일 때 0으로 나누기 발생
description:
  groupIndex가 currentPage() / visiblePageCount()를 계산한다.
  visiblePageCount가 0이면 Math.floor(x / 0)이 Infinity/NaN이 되어
  displayPages, hasPrev, hasNext, 네비게이션 메서드가 모두 오동작한다.
suggestion:
  Math.max(this.visiblePageCount(), 1)로 최솟값을 보장한다.
```

```
id: LOGIC-015
severity: Medium
category: 로직
location: packages/angular/src/ui/data/sheet/useSheetLayoutEngine.ts:86-110
title: 헤더 머지 시 spanStartHeaders가 비-머지 행에서 갱신 누락 가능
description:
  컬럼 머지 시(canMerge=true) spanStartHeaders[row]가 갱신되지 않고
  이전 값을 유지한다. 세 번째 이상의 연속 컬럼에서 부모 레벨 비교 시
  머지 시작 컬럼의 headers와만 비교되어, 중간에 다른 sub-header가 있는 컬럼이
  잘못 머지될 수 있다.
  (참고: 의도된 설계일 수 있으므로 확인 필요)
suggestion:
  머지 시에도 spanStartHeaders[row]를 현재 비교 대상의 원본 headers로 추적한다.
```

```
id: LOGIC-016
severity: Medium
category: 로직
location: packages/angular/src/ui/data/sheet/useSheetCellAgent.ts:196
title: navigator.clipboard.writeText에 null이 전달될 수 있음
description:
  td.textContent는 string | null 타입이다. null일 때
  clipboard.writeText(null)이 호출되면 "null" 문자열이 복사된다.
suggestion:
  td.textContent ?? ""로 null을 빈 문자열로 대체한다.
```

```
id: LOGIC-017
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/modal/sd-modal.control.ts:254-266
title: 모달 z-index가 포커스 전환마다 무한 증가
description:
  _bringToFront가 포커스 시마다 최대 z-index + 1을 설정한다.
  모달 간 포커스 전환을 반복하면 z-index가 계속 증가한다.
  sd-modal.provider.ts:204-215의 _assignZIndex에서도 동일한 패턴이다.
suggestion:
  이미 최상위 z-index이면 스킵하거나, 주기적으로 z-index를 재정규화한다.
```

```
id: LOGIC-018
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/toast/sd-toast.provider.ts:200-213
title: progress 토스트에서 setTimeout 사용 -- 프로젝트 금지 패턴
description:
  progress가 100에 도달하면 setTimeout(() => this._dismissToast(toastRef), 1000)으로
  1초 뒤 해제한다. sd-problem-solving.md 금지 목록에 해당한다.
  또한 effect 내 setTimeout이 progress 변경마다 중복 등록될 수 있다.
suggestion:
  CSS transition의 transitionend 이벤트 등 확정적 타이밍으로 대체하고,
  중복 등록을 방지하는 플래그를 추가한다.
```

```
id: LOGIC-019
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/toast/sd-toast.provider.ts:259-273
title: toast dismiss에서 transitionend + setTimeout이 이중 파괴를 유발
description:
  _dismissToast가 transitionend 이벤트와 300ms setTimeout 두 경로로
  _destroyToast를 호출한다. idx === -1 가드가 이중 파괴를 방지하지만,
  transitionend 리스너가 제거되지 않고, transition이 여러 property에서
  발생하면 다중 호출될 수 있다.
suggestion:
  양방향 정리(transitionend에서 clearTimeout, setTimeout에서 removeEventListener)를
  추가하고, transitionend에 { once: true }와 propertyName 필터링을 적용한다.
```

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/angular/src/ui/form/input/sd-textfield-type-handlers.ts:363-377
title: DateTime/Time validate 핸들러에서 min/max 검증 누락
description:
  DateOnly 핸들러(323-333)와 Number 핸들러(186-191)는 min/max를 검증하지만,
  DateTime과 Time 핸들러는 required와 instanceof만 확인한다.
  textfield 컨트롤이 모든 타입에 min/max를 전달하므로,
  datetime/time에 [min]/[max]를 설정해도 검증이 작동하지 않는다.
suggestion:
  DateTime, Time 핸들러에도 min/max tick 비교 로직을 추가한다.
```

```
id: CONSIST-002
severity: Medium
category: 일관성
location: packages/angular/src/ui/navigation/sidebar/sd-sidebar-container.control.ts:89
title: 백드롭 클릭이 close가 아닌 toggle을 수행
description:
  onBackdropClick()이 this.toggle.update((v) => !v)로 토글한다.
  실제로 백드롭은 toggle=true일 때만 표시되므로 결과적으로 닫히지만,
  의도가 "닫기"인데 "토글"로 구현되어 의미가 불일치한다.
suggestion:
  this.toggle.set(false)로 변경하여 "닫기" 의도를 명확히 한다.
```

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/angular/src/ui/overlay/modal/sd-modal.control.ts:107-149
title: 모달 드래그/리사이즈 중 파괴 시 document 이벤트 리스너 미해제
description:
  mousemove/mouseup 리스너가 document에 등록되고 mouseup 시 해제하지만,
  드래그 중 모달이 프로그래밍 방식으로 닫히면 mouseup이 호출되지 않아
  리스너가 남는다. sd-sheet.control.ts에서는 DestroyRef로 cleanup을 등록하지만
  이 컴포넌트에는 그런 cleanup이 없다.
suggestion:
  DestroyRef.onDestroy에서 document 이벤트 리스너를 해제하는 로직을 추가한다.
```

---

## Low (16건)

```
id: LOGIC-020
severity: Low
category: 로직
location: packages/angular/src/core/providers/sd-navigate-window.provider.ts:22-36
title: 마지막 팝업 윈도우만 부모 unload 시 자동 닫힘
description:
  open() 호출 시 _beforeUnloadController를 매번 교체하여
  이전 팝업의 beforeunload 리스너가 제거된다.
  다수 팝업 중 마지막 것만 부모 종료 시 닫힌다.
suggestion:
  열린 윈도우를 Set으로 관리하고 단일 beforeunload 핸들러에서 모두 닫는다.
```

```
id: LOGIC-021
severity: Low
category: 로직
location: packages/angular/src/core/providers/sd-app-structure.provider.ts:72-79
title: getPermsByFullCode가 잘못된 fullCode에 대해 권한을 부여
description:
  fullCode에 해당하는 item이 없거나 item에 "perms"가 없으면
  permKey를 결과에 무조건 push한다.
  잘못된 fullCode에 대해 모든 권한이 부여되는 보안 관련 이슈이다.
suggestion:
  item 미발견과 perms 미존재를 구분하고, item이 없으면 권한을 부여하지 않는다.
```

```
id: LOGIC-022
severity: Low
category: 로직
location: packages/angular/src/ui/navigation/pagination/sd-pagination.control.ts:114,122
title: goToPrevGroup/goToLast가 경계 조건에서 음수 페이지 설정 가능
description:
  goToPrevGroup: groupIndex=0일 때 음수 페이지.
  goToLast: totalPageCount=0일 때 -1.
  UI에서 disabled로 방지하지만 public 메서드이므로 프로그래밍 호출 시 문제.
suggestion:
  각 메서드 시작부에 가드를 추가한다.
```

```
id: LOGIC-023
severity: Low
category: 로직
location: packages/angular/src/ui/form/input/sd-textfield-type-handlers.ts:216-218
title: format 핸들러의 regex 문자 클래스 구성에서 특수문자 이스케이프 미비
description:
  비포맷 문자를 "\\" + item으로 이스케이프하지만, ] 또는 ^ 등
  regex 특수문자가 포맷에 포함되면 잘못된 regex가 생성된다.
suggestion:
  regex 특수문자 전체를 처리하는 유틸리티로 이스케이프한다.
```

```
id: LOGIC-024
severity: Low
category: 로직
location: packages/angular/src/ui/visual/sd-progress.control.ts:25
title: progress bar width가 100%를 초과할 수 있음
description:
  value() * 100 + '%'로 너비를 설정하여 value > 1이면 100% 초과.
  overflow:hidden으로 시각적으로 잘리지만 clamping이 없다.
suggestion:
  Math.min(value() * 100, 100)으로 clamp한다.
```

```
id: PERF-001
severity: Low
category: 성능
location: packages/angular/src/core/utils/useExpandingManager.ts:91
title: isVisible가 매 항목마다 expandedItems를 선형 탐색
description:
  isVisible이 부모 체인을 탐색하며 매 조상마다 expandedItems().includes()를
  호출한다 (O(n)). sd-sheet에서 displayItems.filter에 사용되어
  전체 O(items * depth * expandedCount) 복잡도.
suggestion:
  expandedItems()를 Set으로 변환하여 O(1) 조회로 변경한다.
```

```
id: PERF-002
severity: Low
category: 성능
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:506-523
title: getCellStyle이 매 셀마다 getItemCellStyleFn()을 두 번 호출
description:
  조건부(line 516)와 호출부(line 517)에서 signal을 두 번 읽는다.
  동일 패턴이 getDataCellClass(644-645)에서도 반복.
suggestion:
  로컬 변수에 한 번 캐시하여 사용한다.
```

```
id: PERF-003
severity: Low
category: 성능
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:481-488
title: getColumnCellTpl/getColumnSummaryTpl이 매 셀마다 선형 탐색
description:
  columnControls().find()로 key에 해당하는 컬럼을 찾으며,
  @for 루프에서 매 행 x 매 컬럼마다 호출되어 O(rows * cols^2).
suggestion:
  columnControls를 key 기준 Map으로 캐시하는 computed signal을 만든다.
```

```
id: DESIGN-002
severity: Low
category: 설계
location: packages/angular/src/core/plugins/sd-global-error-handler.plugin.ts:89-90
title: 반복 에러 시 전체 화면 오버레이가 중첩 생성되고 appRef.destroy() 다중 호출
description:
  에러마다 appRef.destroy()와 오버레이 div 생성이 실행된다.
  연쇄 실패 시 오버레이가 중첩되고 두 번째 destroy()가 예외를 던질 수 있다.
suggestion:
  오버레이 생성 여부를 추적하여 이미 표시된 경우 스킵한다.
```

```
id: DESIGN-003
severity: Low
category: 설계
location: packages/angular/src/core/utils/setups/setupRipple.ts:47-49
title: ontransitionend에서 getComputedStyle로 opacity 문자열 비교 -- 비효율적이고 취약
description:
  transitionend가 transform/opacity 두 번 발생하며, 매번 getComputedStyle을 호출한다.
  브라우저별 opacity 직렬화 차이("0" vs "0.0")가 있을 수 있다.
suggestion:
  event.propertyName === "opacity"로 필터링하여 한 번만 cleanup을 수행한다.
```

```
id: DESIGN-004
severity: Low
category: 설계
location: packages/angular/src/ui/layout/dock/sd-dock.control.ts:126
title: 드래그 리사이즈 중 컴포넌트 파괴 시 document 이벤트 리스너 미해제
description:
  mousemove/mouseup 리스너가 드래그 시작 시 등록되고 mouseup 시 해제되지만,
  드래그 중 라우트 네비게이션 등으로 컴포넌트 파괴 시 리스너가 남는다.
suggestion:
  DestroyRef.onDestroy에서 리스너 해제를 보장한다.
```

```
id: DESIGN-005
severity: Low
category: 설계
location: packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts:252-253
title: 에디터 툴바 active states가 plain 필드 -- OnPush에서 변경 감지 누락 가능
description:
  activeStates, activeColor, activeBgColor가 signal이 아닌 plain 필드이다.
  onTransaction에서 갱신되지만, OnPush 컴포넌트에서 markForCheck 없이는
  템플릿 바인딩이 업데이트되지 않을 수 있다.
suggestion:
  signal로 변환하거나 ChangeDetectorRef.markForCheck()를 호출한다.
```

```
id: DESIGN-006
severity: Low
category: 설계
location: packages/angular/src/ui/data/list/sd-list-item.control.ts:134
title: layout=flat + 자식없음 조합에서 ripple/CSS 스타일 불일치
description:
  layout=flat일 때 CSS에서는 자식 유무와 무관하게 cursor:default, hover 투명을 적용하지만,
  ripple은 자식이 없을 때 활성화된다. 클릭 불가 스타일에 ripple이 동작한다.
suggestion:
  layout=flat이면 자식 유무와 무관하게 ripple을 비활성화한다.
```

```
id: CONSIST-003
severity: Low
category: 일관성
location: packages/angular/src/ui/overlay/modal/sd-modal.provider.ts:68
title: canDeactivefn 프로퍼티명 오타 (canDeactiveFn이어야 함)
description:
  프로젝트 전체에서 camelCase를 사용하고 있으나(getChildrenFn, trackByFn 등)
  이 프로퍼티만 "fn"이 소문자이다.
suggestion:
  canDeactiveFn으로 이름을 통일한다 (provider, setupCanDeactivate, modal control).
```

```
id: CONSIST-004
severity: Low
category: 일관성
location: packages/angular/src/ui/form/input/sd-textfield-type-handlers.ts:106-113
title: String 핸들러가 minlength/maxlength/pattern을 "text" 서브타입에만 적용
description:
  createStringHandler가 text, password, email, color에 사용되지만,
  minlength/maxlength/pattern 검증이 type === "text"로 제한되어
  email 타입에 설정해도 검증이 작동하지 않는다.
suggestion:
  email 타입에도 minlength/maxlength/pattern 검증을 확장한다.
```

```
id: CONSIST-005
severity: Low
category: 일관성
location: packages/angular/src/ui/overlay/dropdown/sd-dropdown-popup.control.ts:104
title: 드롭다운 팝업에서 px/rem 단위 혼용
description:
  clientHeight > 300 (px)과 height: "18.75rem"이 혼용되어 있다.
  기본 font-size 16px 기준 18.75rem = 300px이지만,
  font-size가 다른 환경에서 관계가 깨진다.
suggestion:
  하나의 단위로 통일하거나, 관계를 보장하는 방식으로 수정한다.
```

---

## 요약

| Severity | 건수 | 주요 카테고리 |
|----------|------|-------------|
| Critical | 5 | 로직 5 |
| Medium | 17 | 로직 13, 일관성 2, 설계 1, 성능 1 |
| Low | 16 | 로직 5, 성능 3, 설계 5, 일관성 3 |
| **합계** | **38** | |

### 주요 발견

1. **네비게이션 버그** (LOGIC-001): Ctrl/Alt+click이 새 탭 대신 팝업을 열어 사용자 경험에 직접적 영향
2. **리소스 누수** (LOGIC-003, LOGIC-009, DESIGN-001, DESIGN-004): canDeactivate 가드 누적, DOM 엘리먼트 미제거, document 이벤트 리스너 미해제
3. **프로젝트 규칙 위반** (LOGIC-002, LOGIC-005, LOGIC-018): 에러 삼킴(.catch(() => {}))과 setTimeout 타이밍 우회
4. **기능 미작동** (LOGIC-004): TipTap 에디터 밑줄 버튼이 동작하지 않음
5. **검증 누락** (CONSIST-001): DateTime/Time 타입의 min/max 검증이 작동하지 않음
