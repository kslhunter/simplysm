# Angular 패키지 마이그레이션 최종 심층 리뷰

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/angular/src/` |
| 일시 | 2026-03-31 22:20 |
| 파일 수 | 132 |
| 발견 이슈 | **63건** (Critical 8 / Medium 30 / Low 25) |

---

## Critical (8건)

### LOGIC-001

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/angular/src/core/utils/setups/setupModelHook.ts:8-9
title: WritableSignal.set만 오버라이드하고 update를 오버라이드하지 않아 canFn 검증이 우회됨
description: model.set만 교체하고 model.update는 교체하지 않는다. Angular의 WritableSignal.update()
  내부 구현이 set을 호출하는 것은 보장되지 않는다(구현 세부사항이지 계약이 아님).
  실제 소비 코드인 sd-checkbox.control.ts:290에서 this.value.update((v) => !v)를 호출하는데,
  이 경로는 canFn 검증을 거치지 않을 수 있다. 모델 값 변경의 비즈니스 규칙 검증이 무력화된다.
suggestion: model.update도 오버라이드하여 동일한 canFn 검증 로직을 거치도록 한다.
  예: const orgUpdate = model.update;
  model.update = (fn) => { const newValue = fn(model()); model.set(newValue); };
```

### LOGIC-002

```
id: LOGIC-002
severity: Critical
category: 로직
location: packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts:377-379
title: updatingFromEditor 플래그가 비동기 effect에서 무효화되어 매 키입력마다 커서 위치 리셋
description: onUpdate 콜백에서 updatingFromEditor = true → value.set(html) → updatingFromEditor = false를
  동기적으로 수행한다. 그러나 Angular effect는 비동기(change detection 시점)로 실행되므로,
  effect가 실행될 때 updatingFromEditor는 이미 false로 복원되어 가드가 작동하지 않는다.
  결과적으로 매 키입력마다 currentEditor.commands.setContent()가 호출되어
  커서 위치가 리셋되고 성능이 저하된다.
suggestion: 동기 boolean 대신 마지막 editor HTML을 별도 필드에 저장하고 비교하는 방식으로 변경.
  예: private lastEditorHtml: string | undefined;
  onUpdate에서 this.lastEditorHtml = html; value.set(html);
  effect에서 if (value === this.lastEditorHtml) return;
```

### LOGIC-003

```
id: LOGIC-003
severity: Critical
category: 로직
location: packages/angular/src/core/providers/sd-shared-data.provider.ts:148-181
title: _onEvent에서 getter() reject 시 unhandled promise rejection 발생
description: _onEvent는 service client의 이벤트 리스너 콜백에서 호출된다.
  entry.info.getter(changeKeys)가 reject되면 에러가 unhandled promise rejection으로
  전파된다. 형제 메서드인 _loadAndListen은 .catch((err) => this._errorHandler.handleError(err))로
  정상 처리하고 있으나 _onEvent에는 이 패턴이 누락되어 있다.
suggestion: _onEvent 본문을 try-catch로 감싸고 에러를 _errorHandler.handleError()로 라우팅.
```

### LOGIC-004

```
id: LOGIC-004
severity: Critical
category: 로직
location: packages/angular/src/features/data-view/sd-data-detail.control.ts:99-104
title: busyCount 증감 불균형으로 영구 busy 상태 가능
description: busyCount를 +1한 뒤 _sdToast.try() 내에서 Error가 아닌 값(string, object 등)이
  throw되면 _sdToast.try()가 이를 재throw하고, busyCount.update(v => v - 1)에 도달하지 못한다.
  queueMicrotask 내부이므로 unhandled rejection이 되어 UI는 영구 busy 상태에 빠진다.
  동일 패턴이 sd-data-select-button.control.ts:75-92, sd-data-sheet.control.ts:209-222,
  그리고 AbsSdDataSheet의 모든 async 메서드(doSubmit, doEditItem, doToggleDeleteItems,
  doDownloadExcel, doUploadExcel)에 반복된다.
suggestion: 모든 busyCount 증감 패턴에 try-finally를 적용.
  공통 유틸리티 함수 withBusy(busyCount, fn) 추출을 권장.
```

### LOGIC-005

```
id: LOGIC-005
severity: Critical
category: 로직
location: packages/angular/src/features/permission-table/sd-permission-table.control.ts:328-333
title: _changePermCheck에서 this.value() signal이 변경 전 값을 읽어 cascade 체크가 실패
description: _changePermCheck 메서드는 value 파라미터(로컬 객체)를 직접 수정하는데,
  332행에서 this.getIsPermChecked(item, "use")를 호출한다. getIsPermChecked는 this.value()
  signal을 읽는데, value.update() 콜백 내부에서 호출되므로 signal은 아직 업데이트 전 값이다.
  부모의 "use"를 true로 체크한 후 자식의 "edit"를 cascade 체크하려 할 때,
  부모 "use"가 value 파라미터에는 반영되었지만 signal에는 미반영이므로
  "use가 체크되지 않음"으로 잘못 판단하여 edit 체크가 무시된다.
suggestion: getIsPermChecked 대신 value 파라미터에서 직접 읽도록 수정.
  예: value[permCode + ".use"] !== true 로 변경.
```

### LOGIC-006

```
id: LOGIC-006
severity: Critical
category: 로직
location: packages/angular/src/ui/data/sheet/useSheetCellAgent.ts:22-33
title: _enterEditMode에서 queueMicrotask 클로저가 stale DOM 참조를 캡처
description: _enterEditMode는 editModeCellAddr.set() 호출 전에 cell DOM 참조를 캡처한다.
  signal 변경은 Angular change detection을 트리거하여 @for trackBy에 의해 <td> 재생성 가능.
  queueMicrotask 콜백에서 old(detached) DOM element에 findFirstFocusableChild()를 호출하면
  포커스가 실패한다. 반면 _moveToCell(50-52행)은 queueMicrotask 내부에서 DOM을 재조회한다.
suggestion: queueMicrotask 내부에서 domAccessor.getCell(r, c)로 DOM을 재조회하여
  _moveToCell의 패턴과 통일.
```

### LOGIC-007

```
id: LOGIC-007
severity: Critical
category: 로직
location: packages/angular/src/core/providers/sd-app-structure.provider.ts:99
title: getItemChainByFullCode가 중간 코드 누락 시 partial chain을 반환하여 하위 메서드 오동작
description: single()이 중간 코드에서 undefined를 반환하면 루프가 빈 cursorChildren로 계속 진행하여
  partial chain을 생성한다. 예: fullCode "a.b.c"에서 "b"가 없으면 결과는 ["a"]만 포함.
  getTitleByFullCode(50행)은 length === 0만 체크하므로 partial chain이 통과하여 잘못된 타이틀 생성.
  getPermsByFullCode(77행)은 .last()로 wrong item의 perms를 읽어 잘못된 권한 판단.
suggestion: 중간 코드가 없으면 즉시 throw하거나 빈 배열을 반환.
```

### LOGIC-008

```
id: LOGIC-008
severity: Critical
category: 로직
location: packages/angular/src/ui/data/sheet/useSheetCellAgent.ts:182-196, 65-69
title: navigator.clipboard(Chrome 66+), queueMicrotask(Chrome 71+)가 Chrome 61에서 미지원
description: 프로젝트는 Chrome 61+ 브라우저 지원을 요구한다. navigator.clipboard는 Chrome 66+,
  queueMicrotask는 Chrome 71+에서 도입된 런타임 API로 esbuild가 폴리필하지 않는다.
  Chrome 61-65에서 clipboard 사용 시 TypeError, Chrome 61-70에서 queueMicrotask 사용 
  ReferenceError가 발생한다. queueMicrotask는 이 파일 외에도 코드베이스 전체 6곳에서 사용된다.
suggestion: clipboard → document.execCommand("copy"/"paste") 폴백 추가.
  queueMicrotask → Promise.resolve().then()으로 대체하거나 폴리필 추가.
```

---

## Medium (30건)

### LOGIC-009

```
id: LOGIC-009
severity: Medium
category: 로직
location: packages/angular/src/core/plugins/events/sd-intersection-event.plugin.ts:21
title: entries.single()이 IntersectionObserver batch 콜백에서 예외 발생 가능
description: IntersectionObserver 콜백은 빠른 스크롤 시 동일 target에 대해 2개 이상의 엔트리를
  batch로 전달할 수 있다(스펙상 허용). 이 경우 single()이 "여러 개의 결과" 에러를 throw하고,
  SdGlobalErrorHandlerPlugin이 앱을 파괴한다.
suggestion: entries.last()를 사용하거나 entries[0]으로 변경.
```

### LOGIC-010

```
id: LOGIC-010
severity: Medium
category: 로직
location: packages/angular/src/core/plugins/sd-global-error-handler.plugin.ts:36-38
title: PromiseRejectionEvent의 else 분기에서 JSON.stringify(event)가 항상 "{}" 반환
description: reason이 Error/object/string이 아닌 경우(undefined, number, symbol)
  JSON.stringify(event)를 호출하지만, PromiseRejectionEvent의 프로퍼티는 non-enumerable이므로
  항상 "{}"를 반환하여 에러 정보가 완전히 소실된다.
suggestion: else 분기에서 String(reason)으로 변환하여 표시.
```

### LOGIC-011

```
id: LOGIC-011
severity: Medium
category: 로직
location: packages/angular/src/core/plugins/sd-global-error-handler.plugin.ts:15, 86-87
title: _displayErrorMessage 자체가 실패하면 사용자에게 빈 화면만 표시
description: _hasDisplayedError가 true 설정 후 _displayErrorMessage가 예외를 throw하면,
  catch 블록에서 appRef.destroy()만 실행되고 에러 오버레이는 표시되지 않는다.
  사용자는 빈 화면만 보게 된다.
suggestion: catch 블록에서도 최소한의 에러 메시지를 표시하는 폴백 추가.
  예: document.body.textContent = String(err)
```

### LOGIC-012

```
id: LOGIC-012
severity: Medium
category: 로직
location: packages/angular/src/core/providers/sd-shared-data.provider.ts:166-167
title: Array.includes로 key 매칭 시 타입 혼재(string vs number)로 필터 실패 가능
description: changeKeys.includes(item.__valueKey)는 SameValueZero 비교를 사용한다.
  서버가 changeKeys를 string으로 보내고 클라이언트의 __valueKey가 number인 경우
  [1].includes("1")은 false를 반환하여 필터가 실패하고 데이터 중복이 발생한다.
suggestion: 비교 전 키 타입을 정규화하거나 String 변환 후 비교.
```

### LOGIC-013

```
id: LOGIC-013
severity: Medium
category: 로직
location: packages/angular/src/core/providers/sd-shared-data.provider.ts:90-93
title: getHandle 동시 호출 시 concurrent load 발생 가능
description: register가 needsReload = true를 설정한 후 _loadAndListen이 진행 중일 때
  getHandle이 다시 호출되면 새로운 _loadAndListen이 동시 실행된다.
  두 번의 getter 호출로 stale 데이터가 설정된 후 즉시 덮어쓰여질 수 있다.
suggestion: entry에 loading flag를 추가하여 중복 로드 방지.
```

### LOGIC-014

```
id: LOGIC-014
severity: Medium
category: 로직
location: packages/angular/src/core/providers/sd-app-structure.provider.ts:71
title: permRecord가 undefined일 때 perms 미정의 항목에 전체 권한이 부여됨
description: permRecord가 undefined(로딩 전)인 상태에서, perms 필드가 없는 항목은
  모든 permKey가 granted로 처리된다. perms가 있는 항목은 empty 결과를 반환하므로
  로딩 중 partial 권한 상태가 된다.
suggestion: permRecord가 undefined일 때 빈 배열을 반환하여 "미로딩" 상태를 명확히 구분.
```

### LOGIC-015

```
id: LOGIC-015
severity: Medium
category: 로직
location: packages/angular/src/core/providers/sd-print.provider.ts:79
title: wait.until이 timeout 없이 영원히 폴링하여 initialized 미완료 시 영구 busy
description: compRef.instance.initialized() signal이 true가 되지 않으면
  (print template 버그 등) 100ms 간격으로 무한 폴링하여 busy 오버레이가 영구 표시된다.
suggestion: maxCount 파라미터 추가 (예: 300 → 30초 제한) 후 TimeoutError throw.
```

### LOGIC-016

```
id: LOGIC-016
severity: Medium
category: 로직
location: packages/angular/src/core/provideSdAngular.ts:141-151
title: Navigation busy counter가 음수로 내려갈 수 있어 한 번의 busy indicator 누락
description: effect의 첫 이벤트가 NavigationEnd(앱 초기화 후)인 경우 counter가 -1이 되고,
  다음 NavigationStart에서 0이 되어 busy indicator가 표시되지 않는다.
suggestion: decrement 전 globalBusyCount > 0 가드 추가, 또는 boolean flag로 변경.
```

### LOGIC-017

```
id: LOGIC-017
severity: Medium
category: 로직
location: packages/angular/src/core/utils/useSdSystemConfigResource.ts:12-15
title: options.key()가 undefined일 때 "${elTag}.undefined" 키로 서버 요청 발생
description: key가 undefined일 때 loader가 여전히 호출되어 "sd-sheet.undefined" 같은
  무의미한 키로 서버 요청이 발생한다.
suggestion: loader 내부에서 key == null 가드 추가, 또는 params가 undefined를 반환하도록 변경.
```

### LOGIC-018

```
id: LOGIC-018
severity: Medium
category: 로직
location: packages/angular/src/core/utils/useSdSystemConfigResource.ts:34-37
title: update 메서드의 this 바인딩이 destructuring 시 깨짐
description: 반환 객체의 update 메서드가 this.set(newValue)를 호출하는데,
  const { update } = useSdSystemConfigResource(...)로 destructuring하면
  this가 undefined가 되어 실패한다.
suggestion: 화살표 함수로 변경하거나 set을 클로저로 직접 캡처.
```

### LOGIC-019

```
id: LOGIC-019
severity: Medium
category: 로직
location: packages/angular/src/ui/form/select/sd-select.control.ts:356-363
title: Single 모드에서 선택 항목의 contentHTML이 빈 문자열이면 이전 표시 텍스트가 유지
description: 매칭 항목의 contentHTML()이 ""(초기 렌더링 전)이면 _selectedItemContentHTML 업데이트를
  건너뛰어 이전 선택 항목의 HTML이 표시에 잔류한다.
suggestion: html이 ""일 때 undefined로 설정하여 stale 표시 방지.
```

### LOGIC-020

```
id: LOGIC-020
severity: Medium
category: 로직
location: packages/angular/src/ui/form/input/sd-date-range.picker.ts:84-87
title: "월" 모드에서 handleFromDateChanged가 from 날짜를 1일로 정규화하지 않음
description: handleDatePeriodTypeChanged는 from을 setDay(1)로 정규화하지만,
  handleFromDateChanged는 정규화 없이 to만 계산한다. from이 프로그래밍적으로 중간 날짜로
  설정되면 from은 중간 날짜, to는 해당 월 말일이 되어 불일치 범위가 생성된다.
suggestion: handleFromDateChanged에서도 동일한 정규화 적용.
```

### LOGIC-021

```
id: LOGIC-021
severity: Medium
category: 로직
location: packages/angular/src/ui/form/input/sd-numpad.control.ts:136-150
title: 소수점 입력 중 "5." 상태가 즉시 삭제되어 소수 입력 불가
description: text→value effect에서 num.parseFloat("5.")가 undefined를 반환하면
  value가 undefined로 설정된다. value→text effect가 텍스트를 초기화하여
  사용자의 "5." 입력이 사라진다. "5.3" 같은 소수 입력이 불가능하다.
suggestion: parse 결과가 undefined일 때 value 업데이트를 건너뛰고 이전 값 유지.
```

### LOGIC-022

```
id: LOGIC-022
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/dropdown/sd-dropdown.control.ts:199-202
title: getRelativeOffset(document.body)가 scroll offset을 포함하여 position:fixed 팝업 위치 오류
description: popup은 position:fixed(viewport 기준)이지만, getRelativeOffset는
  window.scrollY/scrollX를 포함한 document-relative 좌표를 반환한다.
  페이지 스크롤 시 팝업이 의도한 위치보다 scroll offset만큼 아래에 배치된다.
suggestion: getBoundingClientRect()를 직접 사용하거나 scroll offset을 차감.
```

### LOGIC-023

```
id: LOGIC-023
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/modal/sd-modal.control.ts:170-171, 188-189
title: 모달 drag/resize가 offsetLeft/offsetTop(offsetParent 기준)과 clientX/Y(viewport 기준) 혼용
description: offsetLeft/offsetTop는 offsetParent 기준이지만 clientX/clientY는 viewport 기준이다.
  sd-modal host에 offset이 있으면(padding, margin, scroll) drag/resize 위치가 drift한다.
suggestion: getBoundingClientRect()로 viewport-relative 좌표 통일.
```

### LOGIC-024

```
id: LOGIC-024
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/modal/sd-modal.control.ts:272
title: parseInt(hostEl.style.zIndex)가 NaN 반환하여 _bringToFront 최적화 무효
description: inline zIndex가 설정되지 않은 모달에서 parseInt("", 10)은 NaN을 반환.
  NaN >= maxZ는 항상 false이므로 early-return 최적화가 작동하지 않아
  매 focus마다 불필요한 DOM write가 발생한다.
suggestion: parseInt(hostEl.style.zIndex || "0", 10) 사용.
```

### LOGIC-025

```
id: LOGIC-025
severity: Medium
category: 로직
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:637-648
title: Fixed column header의 inline z-index:1이 CSS z-index:2를 override하여 스크롤 시 겹침
description: _getFixedStyle()은 inline z-index:1을 설정한다. <th>의 CSS는 z-index:2(sticky-top).
  inline style이 우선하므로 fixed header cell이 z-index:1이 되어
  horizontal scroll 시 non-fixed header cell 아래로 밀린다.
suggestion: getHeaderCellStyle에서 fixed header에 z-index:3을 설정.
```

### LOGIC-026

```
id: LOGIC-026
severity: Medium
category: 로직
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:619-634
title: width와 collapse가 동시 설정 시 모순된 style이 생성
description: width="100px"과 collapse=true가 모두 설정되면
  "width:100px; min-width:100px; max-width:100px"와 "width:0; min-width:0; max-width:0"가
  동시에 출력된다. 브라우저에서 후자가 우선하지만 선언 순서에 의존하는 취약한 구조이다.
suggestion: collapse가 true일 때 width 블록을 건너뛰는 early return 추가.
```

### LOGIC-027

```
id: LOGIC-027
severity: Medium
category: 로직
location: packages/angular/src/features/address/sd-address-search.modal.ts:67-81
title: 외부 스크립트(다음 주소 API) 로드 실패 시 에러 핸들링 부재
description: scriptEl.onload만 처리하고 scriptEl.onerror를 처리하지 않는다.
  CDN 접근 실패 시 Promise가 영원히 resolve되지 않아 무한 busy spinner 표시.
suggestion: scriptEl.onerror 추가하여 Promise reject 또는 사용자 에러 알림.
```

### LOGIC-028

```
id: LOGIC-028
severity: Medium
category: 로직
location: packages/angular/src/features/data-view/sd-data-detail.control.ts:162-175
title: dataInfo()가 undefined일 때 isNew 판단이 논리적으로 불안정
description: dataInfo()가 undefined이면 ?.isNew가 undefined → !undefined는 true.
  _dataSnapshot == null도 true이므로 "변경사항 없음" 처리된다.
  의도대로 동작하지만 "dataInfo가 없는데 isNew가 아님"이라는 논리적 모순.
suggestion: dataInfo() != null && !dataInfo()!.isNew로 명시적 체크.
```

### LOGIC-029

```
id: LOGIC-029
severity: Medium
category: 로직
location: packages/angular/src/features/data-view/sd-data-sheet.control.ts:197-222
title: effect에서 page와 lastFilter 동시 변경 시 이중 refresh 트리거 가능
description: doFilterSubmit()에서 page(0) 설정 후 lastFilter 변경으로 effect가 2회 트리거된다.
  queueMicrotask가 coalescing하지만, 첫 microtask의 refresh()와 두 번째의 refresh()가
  동시 실행되어 이중 네트워크 요청이 발생할 수 있다.
suggestion: page와 lastFilter를 하나의 signal object로 합치거나, untracked 내에서 page 설정.
```

### LOGIC-030

```
id: LOGIC-030
severity: Medium
category: 로직
location: packages/angular/src/features/permission-table/sd-permission-table.control.ts:155
title: collapse icon의 open 속성 의미가 반전되어 시각적 표현이 실제 상태와 반대
description: [open]="getIsPermCollapsed(item)"으로 설정하여
  접힌 상태에서 아이콘이 회전(열림)되고, 펼친 상태에서 아이콘이 기본(닫힘)이 된다.
suggestion: [open]="!getIsPermCollapsed(item)"로 변경.
```

### LOGIC-031

```
id: LOGIC-031
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/toast/sd-toast.provider.ts:237-255
title: _setupAutoDismiss의 dismissPending 플래그가 리셋되지 않아 zombie 타이머 발생
description: dismiss 후에도 dismissPending이 true로 남아있어,
  transition 중 hover/leave 시 추가 dismissAfterDelay가 스케줄되어
  이미 파괴 중인 toast에 대한 중복 작업이 발생한다.
suggestion: dismissAfterDelay 호출 후 dismissPending = false로 리셋하거나
  dismissed flag로 후속 시도를 차단.
```

### LOGIC-032

```
id: LOGIC-032
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/toast/sd-toast.provider.ts:49-58
title: containerRef getter에서 overlap signal을 비반응적으로 읽어 stale 상태 유지
description: containerRef getter는 imperative 코드에서 호출되므로 overlap 변경이
  기존 컨테이너에 반영되지 않는다. overlap 변경과 다음 toast 표시 사이에
  컨테이너의 layout 모드가 stale 상태로 유지된다.
suggestion: overlap 바인딩을 constructor의 effect()로 이동.
```

### LOGIC-033

```
id: LOGIC-033
severity: Medium
category: 로직
location: packages/angular/src/ui/overlay/dropdown/sd-dropdown.control.ts:296-305
title: _removePopup이 maxHeight, maxWidth, overflow 인라인 스타일을 리셋하지 않음
description: 팝업이 열릴 때 설정된 maxHeight/maxWidth/overflow가 닫힐 때 리셋되지 않는다.
  mobile 모드에서 재오픈 시 이전 desktop 모드의 제약 조건이 잔류한다.
suggestion: _removePopup에서 maxHeight, maxWidth, overflow도 리셋.
```

### LOGIC-034

```
id: LOGIC-034
severity: Medium
category: 로직
location: packages/angular/src/core/utils/setups/setupRevealOnShow.ts:13
title: effect 내에서 시그널을 추적하지 않아 type/enabled 변경에 반응하지 않음
description: optFn()의 type을 untracked로 읽고, effect 내에서 어떤 signal도 track하지 않아
  초기 1회만 실행된다. sdShowEffectType input이 변경되어도 transform 방향이 갱신되지 않는다.
suggestion: type/enabled를 effect의 tracked 의존성으로 만들거나,
  constructor 직접 실행 + DestroyRef.onDestroy로 변경.
```

### LOGIC-035

```
id: LOGIC-035
severity: Medium
category: 로직
location: packages/angular/src/features/shared-data/sd-shared-data-select.control.ts:246-253
title: 드롭다운 닫힘 감지 effect가 초기 실행 시에도 searchText를 초기화
description: effect 첫 실행 시 dropdownOpen()이 false이면 searchText.set(undefined)가 즉시 실행.
  드롭다운이 열릴 때에도 타이밍에 따라 searchText가 초기화될 수 있다.
suggestion: 이전 값 비교로 dropdownOpen이 false로 "변할 때"만 초기화.
```

### DESIGN-001

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/angular/src/core/utils/injectParent.ts:16-17
title: Angular 내부 구현 세부사항(lView[8] === CONTEXT)에 의존
description: _lView 속성과 인덱스 8(CONTEXT 슬롯)은 Angular의 비공개 내부 구현이다.
  Angular 버전 업그레이드 시 인덱스가 변경되면 잘못된 객체를 반환하거나 에러가 발생한다.
suggestion: 반환된 comp의 타입 검증 추가, 또는 Angular 업그레이드 시 검증 테스트 작성.
```

### DESIGN-002

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/angular/src/core/providers/sd-file-dialog.provider.ts:35-46
title: Cancel 감지가 onfocus + setTimeout(1000ms)에 의존하여 브라우저/플랫폼 의존적
description: 파일 다이얼로그 cancel 감지가 window focus 이벤트 + 1000ms 딜레이에 의존한다.
  모바일 브라우저에서 focus가 보장되지 않고, 느린 기기에서 change 이벤트가
  1000ms 이후 발생하면 cancel로 오판될 수 있다.
suggestion: Chrome 77+ cancel 이벤트를 primary 메커니즘으로 추가하고 onfocus를 폴백으로 유지.
```

### DESIGN-003

```
id: DESIGN-003
severity: Medium
category: 설계
location: packages/angular/src/ui/data/sheet/sd-sheet-config.modal.ts:143-148
title: Modal의 input.required()가 SdModalProvider의 비동기 input 설정 타이밍에 의존
description: SdSheetConfigModal은 controls와 config을 input.required()로 선언한다.
  SdModalProvider가 ComponentRef.setInput()으로 설정하는데, 첫 CD 전에 설정되지 않으면
  런타임 에러가 발생한다. Provider의 타이밍 변경에 취약하다.
suggestion: SdModalProvider가 input 설정 후 CD를 실행함을 검증하거나, optional input 사용.
```

### PERF-001

```
id: PERF-001
severity: Medium
category: 성능
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:128
title: 템플릿에서 셀당 메서드 호출이 O(rows × cols) signal 읽기를 유발
description: getItemDef, getCellStyleWithIndent, getDataCellClass, isCellEditMode가
  매 셀마다 호출된다. 100행 × 20열 = 2000셀에서 셀당 ~5개 메서드 = 10,000회 호출/CD 사이클.
suggestion: per-row/per-cell computed를 pre-build하거나, tree depth indent를 행 단위로 사전 계산.
```

### PERF-002

```
id: PERF-002
severity: Medium
category: 성능
location: packages/angular/src/core/utils/useExpandingManager.ts:84-97
title: isVisible()가 호출마다 new Set(expandedItems())을 생성하여 O(N × |expandedItems|)
description: isVisible는 일반 함수(computed 아님)로, filter 내 N번 호출마다
  expandedItems()에서 새 Set을 생성한다.
suggestion: Set 생성을 별도 computed로 추출하여 캐싱.
```

### PERF-003

```
id: PERF-003
severity: Medium
category: 성능
location: packages/angular/src/features/permission-table/sd-permission-table.control.ts:225-228
title: arr() 메서드가 매 CD 사이클마다 새 배열을 생성하여 @for DOM 재생성
description: Array(len).fill(0).map(...)이 매 렌더링마다 새 배열 참조를 생성하여
  @for의 track이 무의미해지고 DOM이 불필요하게 재생성된다.
suggestion: 결과를 memoize하거나 별도 computed로 캐싱.
```

### CONSIST-001

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/angular/src/features/shared-data/sd-shared-data-select-list.control.ts:177-180
title: 검색 동작이 SdSharedDataSelectControl과 불일치 (case-sensitive, 공백 분리 미지원)
description: SdSharedDataSelectControl.isIncludeSearchText는 toLowerCase + 공백 분리 AND 검색.
  SdSharedDataSelectListControl.displayItems는 단순 includes로 case-sensitive 단일 문자열 비교.
  동일 프레임워크 내에서 동일 개념의 검색 동작이 불일치한다.
suggestion: 공통 검색 유틸 함수를 추출하여 통일.
```

---

## Low (25건)

### LOGIC-036

```
id: LOGIC-036
severity: Low
category: 로직
location: packages/angular/src/core/providers/sd-local-storage.provider.ts:15
title: JSON.parse가 손상된 localStorage 데이터에서 SyntaxError throw
description: localStorage에 유효하지 않은 JSON이 저장된 경우 SyntaxError가 발생한다.
suggestion: try-catch로 감싸고 파싱 실패 시 undefined 반환.
```

### LOGIC-037

```
id: LOGIC-037
severity: Low
category: 로직
location: packages/angular/src/core/providers/sd-navigate-window.provider.ts:10
title: hash에 ";"가 없을 때 의도하지 않은 URLSearchParams 파싱
description: ";"가 없으면 slice(0)이 전체 hash를 URLSearchParams에 전달한다.
  결과적으로 false를 반환하여 정상 동작하지만 우연적이다.
suggestion: ";" 부재 시 early return false 추가.
```

### LOGIC-038

```
id: LOGIC-038
severity: Low
category: 로직
location: packages/angular/src/core/provideSdAngular.ts:106-126
title: Service worker update polling이 실패 시 backoff 없이 5분마다 영구 재시도
description: checkForUpdate()가 지속 실패해도 5분 간격으로 무한 폴링.
suggestion: exponential backoff 또는 최대 재시도 횟수 고려.
```

### LOGIC-039

```
id: LOGIC-039
severity: Low
category: 로직
location: packages/angular/src/core/provideSdAngular.ts:59-61
title: 테마 persistence effect가 초기화 시 localStorage에 쓰기하여 multi-tab 충돌 가능
description: effect가 초기 실행 시 방금 읽은 값을 다시 localStorage에 쓴다.
  다른 탭의 변경을 덮어쓸 수 있다.
suggestion: 값 비교 후 변경 시에만 write, 또는 storage 이벤트로 tab 간 동기화.
```

### LOGIC-040

```
id: LOGIC-040
severity: Low
category: 로직
location: packages/angular/src/ui/overlay/modal/sd-modal.control.ts:111-123
title: widthPx/heightPx가 undefined로 변경 시 이전 inline style이 잔류
description: widthPx가 값에서 undefined로 변경되면 이전 inline width가 그대로 남는다.
suggestion: else 절에서 style을 ""로 리셋.
```

### LOGIC-041

```
id: LOGIC-041
severity: Low
category: 로직
location: packages/angular/src/ui/layout/dock/sd-dock.control.ts:134-183
title: Resize drag에서 음수 크기가 가능하여 invalid config 저장
description: drag로 음수 height/width가 계산되면 "-50px" 같은 값이 config에 저장된다.
suggestion: Math.max(0, calculated)로 하한 클램프.
```

### LOGIC-042

```
id: LOGIC-042
severity: Low
category: 로직
location: packages/angular/src/ui/overlay/dropdown/sd-dropdown.control.ts:70-71
title: _isMobile가 signal이 아니라 effect가 breakpoint 변경에 반응하지 않음
description: 드롭다운 열린 상태에서 viewport가 breakpoint를 넘으면
  desktop/mobile 전환이 반영되지 않는다.
suggestion: _isMobile을 signal로 변환.
```

### LOGIC-043

```
id: LOGIC-043
severity: Low
category: 로직
location: packages/angular/src/features/address/sd-address-search.modal.ts:91
title: RegExp에 불필요한 global flag(g)가 있어 상수 추출 시 bug
description: /[동로가]$/g — $ anchor가 있어 g flag가 의미 없다.
  상수로 추출하면 lastIndex 상태 때문에 두 번째 호출에서 false 반환.
suggestion: g 플래그 제거: /[동로가]$/
```

### LOGIC-044

```
id: LOGIC-044
severity: Low
category: 로직
location: packages/angular/src/features/shared-data/sd-shared-data-select-list.control.ts:166-172
title: pageLength가 전체 items 수 기준으로 계산되어 필터 후 마지막 페이지가 비어 보임
description: Math.ceil(items().length / pic)에서 __isHidden과 검색 필터 적용 전 길이를 사용.
  100개 중 30개 hidden이면 pageLength는 100 기준이지만 실제 표시는 70개 기준.
suggestion: 필터 적용 후의 길이로 pageLength 계산.
```

### LOGIC-045

```
id: LOGIC-045
severity: Low
category: 로직
location: packages/angular/src/ui/visual/sd-progress.control.ts:90
title: value()가 음수일 때 barWidth가 음수 퍼센트를 표시
description: Math.min(value * 100, 100)은 상한만 클램프하여 음수 값 시 "-50%"가 표시된다.
suggestion: Math.min(Math.max(value * 100, 0), 100)으로 하한 추가.
```

### LOGIC-046

```
id: LOGIC-046
severity: Low
category: 로직
location: packages/angular/src/core/directives/sd-router-link.directive.ts:38-39
title: option이 없어도 cursor:pointer가 적용되어 클릭 가능해 보이지만 동작 없음
description: host style에 cursor:pointer가 항상 적용되지만 option이 undefined이면 클릭 시 아무 동작 없음.
suggestion: [style.cursor]="option() ? 'pointer' : ''" 조건부 적용.
```

### LOGIC-047

```
id: LOGIC-047
severity: Low
category: 로직
location: packages/angular/src/core/pipes/format.pipe.ts:18-19
title: format에 'X'가 없으면 fullLength가 undefined로 비교 실패
description: format.match(/X/g)가 null이면 fullLength는 undefined.
  undefined === value.length는 항상 false로 원본 반환. 의도된 fallback이지만 불명확.
suggestion: fullLength == null 시 명시적 continue 추가.
```

### PERF-004

```
id: PERF-004
severity: Low
category: 성능
location: packages/angular/src/ui/form/select/sd-select.control.ts:322-366
title: Effect가 모든 item의 contentHTML() signal을 읽어 어떤 item 변경에도 재실행
description: 전체 SdSelectItemControl의 contentHTML()을 접근하여
  어떤 item 변경에도 effect가 재실행되어 전체 순회 반복.
suggestion: 선택된 item의 contentHTML만 track하거나 untracked 활용.
```

### PERF-005

```
id: PERF-005
severity: Low
category: 성능
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:597
title: isExpanded가 Array.includes (linear scan)로 O(rows × expandedCount)
description: expandedItems().includes(item)이 행마다 호출되어 linear scan.
suggestion: Set 기반 lookup 사용.
```

### PERF-006

```
id: PERF-006
severity: Low
category: 성능
location: packages/angular/src/features/data-view/sd-data-sheet.control.ts:409-415
title: _getDiffs()가 매 호출마다 전체 아이템 deep equal 비교
description: items가 수천 건이면 obj.equal로 모든 프로퍼티를 비교하므로 비용이 높다.
suggestion: 변경 flag를 별도 signal로 관리하거나 diff 결과 캐싱.
```

### DESIGN-004

```
id: DESIGN-004
severity: Low
category: 설계
location: packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts:292
title: colorPickerMode가 signal이 아닌 plain property로 template에서 사용
description: 코드베이스의 다른 모든 template-bound state가 signal인데
  이 필드만 plain property. zone 밖 변경 시 UI 미갱신 가능.
suggestion: signal<"text" | "bg" | undefined>(undefined)로 변환.
```

### DESIGN-005

```
id: DESIGN-005
severity: Low
category: 설계
location: packages/angular/src/ui/overlay/dropdown/sd-dropdown-popup.control.ts:104
title: 하드코딩된 300px 높이 제한이 parent의 maxHeight 계산과 충돌
description: viewport가 500px 허용해도 300px로 제한. viewport가 200px이면
  height:300px가 maxHeight:200px를 override하여 팝업이 viewport를 넘침.
suggestion: 300px 제한 제거하고 parent maxHeight에 의존, 또는 Math.min 적용.
```

### DESIGN-006

```
id: DESIGN-006
severity: Low
category: 설계
location: packages/angular/src/ui/data/sheet/useSheetColumnFixing.ts:17-24
title: Fixed column offset 계산이 px 단위 width만 지원
description: em, rem, % 등 다른 CSS 단위 사용 시 offset이 잘못 계산된다.
suggestion: fixed column은 px 필수임을 문서화하거나 non-px width 경고 추가.
```

### DESIGN-007

```
id: DESIGN-007
severity: Low
category: 설계
location: packages/angular/src/ui/visual/sd-barcode.control.ts:30-35
title: bwip-js SVG 출력을 innerHTML로 직접 삽입하여 XSS 가능성
description: barcode text가 untrusted input에서 유래하면 bwip-js의 SVG 생성에서
  injection이 가능할 수 있다. Angular의 내장 sanitization을 우회한다.
suggestion: DomSanitizer로 SVG 문자열을 sanitize하거나 [innerHTML] 바인딩 사용.
```

### CONSIST-002

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/angular/src/core/plugins/commands/ (3개 파일)
title: inject(DOCUMENT) 토큰을 사용하면서 실제로는 전역 document를 사용
description: DOCUMENT 토큰을 super()에 전달하지만 addEventListener에서 전역 document를 직접 사용.
  토큰 주입 의도와 실제 사용이 불일치.
suggestion: this._doc를 사용하도록 통일하거나, SSR 미사용이면 주석으로 명시.
```

### CONSIST-003

```
id: CONSIST-003
severity: Low
category: 일관성
location: packages/angular/src/ui/navigation/sidebar/sd-sidebar-menu.control.ts:123-129
title: ISdSidebarMenu, ISdTopbarMenu, ISdMenu 세 인터페이스가 동일 shape로 중복
description: 세 인터페이스가 { title, codeChain, url?, icon?, children? }로 동일.
  메뉴 구조 변경 시 3곳을 동기화해야 한다.
suggestion: ISdSidebarMenu, ISdTopbarMenu가 ISdMenu를 extend하도록 변경.
```

### CONSIST-004

```
id: CONSIST-004
severity: Low
category: 일관성
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:647 vs :243
title: Fixed cell 배경색이 --control-color로 header의 --theme-secondary-lightest를 override
description: _getFixedStyle의 inline background가 CSS의 header 배경색을 override하여
  fixed header와 non-fixed header의 배경색이 불일치한다.
suggestion: fixed header에는 --theme-secondary-lightest를 사용하도록 context별 분기.
```

### CONSIST-005

```
id: CONSIST-005
severity: Low
category: 일관성
location: packages/angular/src/features/shared-data/sd-shared-data-select-button.control.ts:49
title: TItem의 __valueKey가 number로 하드코딩되어 string key 미지원
description: ISharedDataBase<number>로 고정. SdSharedDataSelectControl과
  SdSharedDataSelectListControl은 string | number 모두 지원하여 불일치.
suggestion: ISharedDataBase<string | number>로 변경하여 통일.
```

### CONSIST-006

```
id: CONSIST-006
severity: Low
category: 일관성
location: packages/angular/src/ui/data/sheet/sd-sheet.control.ts:358-359
title: itemKeydown과 cellKeydown 이벤트의 key 필드 유무가 타입에서 구분되지 않음
description: 두 이벤트가 ISdSheetItemKeydownEventParam 공유. itemKeydown은 key가 없고
  cellKeydown은 항상 key가 있지만, 타입에서 key는 optional.
suggestion: 별도 이벤트 타입으로 분리하여 타입 안전성 확보.
```
