# 코드 리뷰 리포트: @simplysm/angular

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/angular/src/` |
| 일시 | 2026-04-01 23:13 |
| 파일 수 | 134개 |
| 발견 이슈 | 39건 (Critical 4, Medium 18, Low 17) |

---

## Critical

### LOGIC-001
- **severity**: Critical
- **category**: 로직
- **location**: `packages/angular/src/core/plugins/commands/sd-save-command-event.plugin.ts:33`, `sd-insert-command-event.plugin.ts:33`, `sd-refresh-command-event.plugin.ts:33`
- **title**: 커맨드 플러그인이 document에 다중 리스너를 등록하여 동일 커맨드가 여러 번 실행됨
- **description**: `addEventListener` 호출 시마다 `document`에 새 `keydown` 리스너를 등록한다. 페이지에 `(sdSaveCommand)` 바인딩이 3개 있으면 Ctrl+S 시 3개 모두 실행된다. `stopPropagation()`은 같은 타겟(document)의 다른 리스너를 막지 못한다 — `stopImmediatePropagation()`이 필요하다. `findTopOpenModalEl`로 모달 필터링이 있지만, 같은 모달 안에 복수 바인딩이 있으면 방어되지 않는다.
- **suggestion**: `stopImmediatePropagation()`을 사용하거나, document에 단일 리스너를 등록하고 DOM 트리 최하위 요소에만 이벤트를 디스패치하는 방식으로 변경

### LOGIC-002
- **severity**: Critical
- **category**: 로직
- **location**: `packages/angular/src/features/data-view/sd-data-sheet.control.ts:204-230`
- **title**: effect 내 비동기 작업의 취소가 불완전하여 이전 결과가 최신을 덮어씀
- **description**: effect의 `onCleanup`으로 `cancelled` 플래그를 설정하지만, `queueMicrotask` → `withBusy` → `sdSharedData.wait()` → `refresh()` 체인이 시작된 후에는 `cancelled`를 다시 확인하지 않는다. 빠른 연속 조작(페이지 변경 → 필터 변경 → 정렬 변경)에서 이전 비동기 결과(예: 페이지 1 데이터)가 최신 결과(페이지 2 데이터)를 덮어쓸 수 있다.
- **suggestion**: `refresh()` 호출 전후로 `cancelled` 플래그를 재확인하거나, `AbortController` 패턴을 도입하여 이전 요청을 무효화

### DESIGN-001
- **severity**: Critical
- **category**: 설계
- **location**: `packages/angular/src/ui/overlay/toast/sd-toast.provider.ts:93-145, 231-271`
- **title**: overlap 모드에서 기존 토스트의 `notify` Promise가 영원히 resolve되지 않음
- **description**: `notify`가 반환하는 Promise는 `closeSub` 또는 `onDismiss` 콜백에서 resolve된다. overlap 모드에서 새 토스트 표시 시 `_removeAllToasts()`가 기존 토스트를 `_destroyToast`로 직접 파괴하는데, 이때 `onDismiss` 콜백이 호출되지 않고 `closeSub`도 정리되지 않는다. 결과적으로 `await toast.notify(...)` 호출자의 Promise가 영원히 pending 상태로 남는다.
- **suggestion**: 토스트별 resolve 함수를 Map으로 추적하고, `_destroyToast` 시 `resolve(undefined)`를 호출하여 Promise를 해제

### LOGIC-003
- **severity**: Critical
- **category**: 로직
- **location**: `packages/angular/src/ui/data/sheet/useSheetCellAgent.ts:196`
- **title**: `navigator.clipboard.writeText()`에 `null` 가능 값 전달
- **description**: `td.textContent`의 타입은 `string | null`이다. 빈 `<td>` 등에서 `textContent`가 `null`이면 `writeText(null)`이 호출되어 런타임 오류 또는 `"null"` 문자열이 클립보드에 복사된다.
- **suggestion**: `td.textContent ?? ""`로 null 방어 처리

---

## Medium

### DESIGN-002
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/core/plugins/sd-global-error-handler.plugin.ts:89, 96-97`
- **title**: 첫 번째 에러 이후 추가 에러가 로깅도 되지 않음
- **description**: `_hasDisplayedError` 플래그로 첫 번째 에러만 UI 표시 + 로깅한다. 앱 파괴 후 window의 error/rejection 리스너는 여전히 활성이지만, 두 번째 이후 에러는 `_systemLog.writeAsync`도 호출되지 않아 로그에도 남지 않는다.
- **suggestion**: `_hasDisplayedError` 체크를 UI 표시에만 적용하고, 로깅은 항상 수행되도록 분리

### DESIGN-003
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/core/providers/sd-navigate-window.provider.ts:38`
- **title**: params가 undefined일 때 URL 끝에 불필요한 세미콜론 추가
- **description**: `params`가 `undefined`일 때 `new URLSearchParams(undefined).toString()`은 빈 문자열을 반환하므로 URL 끝에 `;`만 남는다 (예: `#/some/path;`).
- **suggestion**: params가 undefined이거나 빈 객체일 때 세미콜론 부분을 생략하도록 조건 분기 추가

### DESIGN-004
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/core/providers/sd-shared-data.provider.ts:51-83`
- **title**: `register`에서 기존 리스너 제거가 fire-and-forget이라 일시적 이중 리스너 가능
- **description**: 기존 entry 재등록 시 `void client.removeListener(existing.listenerKey)`로 비동기 제거 후, 완료를 기다리지 않고 `_loadAndListen`에서 새 리스너를 등록한다. 제거 완료 전에 같은 이벤트에 두 개의 리스너가 활성화될 수 있다.
- **suggestion**: `removeListener` 완료를 await하거나, `_loadAndListen` 내부에서 제거 완료 후 등록하도록 순서 보장

### LOGIC-004
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/core/utils/setups/setupModelHook.ts:30-33`
- **title**: `model.update` 오버라이드에서 비동기 `canFn` 사용 시 stale 값 문제
- **description**: `model.update(fn)`이 호출되면 `fn(model())`로 즉시 새 값을 계산하지만, 비동기 `canFn`이 resolve될 때까지 signal 값이 다른 곳에서 변경될 수 있다. update의 의미론("현재 값 기반 계산")과 실제 설정 시점 사이에 불일치가 발생한다.
- **suggestion**: 비동기 canFn과 update 조합에 대한 방어 로직 추가 또는 문서화

### LOGIC-005
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/features/address/sd-address-search.modal.ts:68-84`
- **title**: Daum 주소 스크립트 중복 로드 시 race condition
- **description**: `document.getElementById("daum_address")`로 존재 여부를 확인하지만, 두 모달 인스턴스가 거의 동시에 열리면 둘 다 스크립트가 없다고 판단하여 `<script>` 태그를 두 번 삽입할 수 있다.
- **suggestion**: 모듈 레벨 `Promise`로 스크립트 로딩을 싱글톤화하여 후속 호출은 동일 Promise를 await

### LOGIC-006
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/features/data-view/sd-data-sheet.control.ts:232`
- **title**: 모달에서 `setupCanDeactivate`가 변경사항 확인을 건너뜀
- **description**: `viewType() === "modal"`이면 항상 `true`를 반환하여 변경사항 무시 확인 없이 deactivate를 허용한다. 인라인 편집 후 변경사항이 있어도 사용자 확인 없이 모달이 닫힐 수 있다.
- **suggestion**: 모달에서도 `checkIgnoreChanges()`를 호출하거나, editMode에 따라 조건 분기

### DESIGN-005
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/features/data-view/sd-data-detail.control.ts:91-108`
- **title**: 초기화 effect에서 `refresh()` 실패 시 빈 폼 상태로 initialized=true
- **description**: `_sdToast.try`가 에러를 toast로 표시하고 삼키므로, `refresh()` 실패 후에도 `initialized.set(true)`가 실행된다. `data`가 `{} as T`인 빈 상태로 초기화 완료가 되어 사용자가 빈 폼을 보게 된다.
- **suggestion**: 에러 발생 시 에러 상태를 별도 관리하거나, 재시도 옵션 제공

### DESIGN-006
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/features/data-view/sd-data-sheet.control.ts:316-329`
- **title**: `doToggleDeleteItem`에서 아이템 객체를 직접 뮤테이션 후 배열 참조만 갱신
- **description**: `item[this.itemPropInfo.isDeleted]`를 직접 변경한 뒤 `this.items.update((v) => [...v])`로 새 배열을 만든다. OnPush 전략에서 자식 컴포넌트가 동일 객체 참조를 input으로 받으면 변경을 감지하지 못할 수 있다.
- **suggestion**: 아이템 객체를 clone하여 불변성 유지 후 배열 업데이트

### LOGIC-007
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/ui/form/input/sd-numpad.control.ts:135-150`
- **title**: 두 effect가 순환적으로 서로를 트리거하여 부분 입력이 사라짐
- **description**: 첫 번째 effect는 `text` → `value` 동기화, 두 번째는 `value` → `text` 동기화. 사용자가 `"-"`를 입력하면 `parseFloat("-")` = `undefined` → value 설정 → 두 번째 effect가 text를 `undefined`로 덮어써 입력이 사라진다.
- **suggestion**: 사용자 입력 중 상태와 value 동기화를 분리하는 플래그 또는 단방향 흐름으로 전환

### LOGIC-008
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/ui/form/select/sd-select.control.ts:325-370`
- **title**: multi 모드에서 `contentHTML()` 호출이 untracked 블록의 영향으로 변경 감지 누락
- **description**: `untracked` 블록 내에서 `selectedItems`를 필터링한 후 `contentHTML()`을 호출하는데, 이 signal 읽기가 effect의 의존성으로 등록되지 않을 수 있다. 선택된 아이템의 DOM 내용이 변경되어도 표시가 갱신되지 않을 수 있다.
- **suggestion**: `contentHTML()` 호출을 effect의 추적 범위 내에서 수행하거나 별도 추적 구조 도입

### LOGIC-009
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/ui/form/input/sd-textfield-type-handlers.ts:143-151`
- **title**: number 타입 `parse`에서 `undefined` 반환 시 input UI와 value 불일치
- **description**: `"-"` 단독 입력 시 `parse`가 `undefined`를 반환하여 기존 value가 유지되지만, `inputEl.value`에는 `-`가 그대로 남아 UI와 내부 값이 불일치한다.
- **suggestion**: `parse`가 `undefined` 반환 시 input 요소의 display value를 현재 value 기반으로 갱신

### LOGIC-010
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/ui/overlay/toast/sd-toast.provider.ts:148-166`
- **title**: `try` 메서드에서 `Error` 인스턴스가 아닌 예외를 re-throw
- **description**: `if (!(err instanceof Error)) { throw err; }` — JavaScript에서 `throw "문자열"` 패턴이나 third-party에서 비-Error 객체를 throw하면, toast 표시 없이 상위로 전파된다.
- **suggestion**: 비-Error 객체도 `String(err)`로 변환하여 toast danger 메시지로 표시

### DESIGN-007
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/ui/overlay/busy/sd-busy-container.control.ts:230-242`
- **title**: keydown 이벤트 리스너가 DestroyRef에서 해제되지 않음
- **description**: 생성자에서 `el.addEventListener("keydown", ..., { capture: true })`를 등록하지만 `onDestroy`에서 `removeEventListener`를 호출하지 않는다.
- **suggestion**: `DestroyRef.onDestroy`에서 명시적으로 리스너 제거

### DESIGN-008
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/ui/overlay/toast/sd-toast.provider.ts:231-271`
- **title**: toast의 `mouseenter`/`mouseleave` 리스너가 파괴 시 해제되지 않음
- **description**: `_setupAutoDismiss`에서 등록한 이벤트 리스너를 `_destroyToast`에서 제거하지 않는다. DOM 제거 시 GC될 수 있지만 타이밍 이슈 가능성이 있다.
- **suggestion**: cleanup 함수를 반환하여 `_destroyToast`에서 호출

### LOGIC-011
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/ui/navigation/collapse/sd-collapse.control.ts:63-67`
- **title**: effect 내 `offsetHeight` 측정이 닫힌 상태에서 0을 반환하여 다시 열리지 않을 수 있음
- **description**: `open()`이 `false`로 변경되면 effect가 실행되어 `offsetHeight`를 측정하는데, 이전 effect에 의해 이미 `margin-top: -{height}px`가 적용되어 있으면 `offsetHeight`가 0이 된다. 이후 열릴 때 `margin-top: -0px`가 되어 콘텐츠가 보이지 않을 수 있다.
- **suggestion**: `open()`이 `true`로 변경될 때만 재측정하거나, `onContentResize` 이벤트에만 의존

### LOGIC-012
- **severity**: Medium
- **category**: 로직
- **location**: `packages/angular/src/ui/data/sheet/useSheetLayoutEngine.ts:113-115`
- **title**: 헤더 병합 시 `spanStartHeaders` 업데이트로 잘못된 병합 발생
- **description**: `canMerge`가 `true`이고 colspan 증가 시, `spanStartHeaders[row]`를 마지막 병합 column의 headers로 업데이트한다. 다음 column 비교 시 span의 첫 번째가 아닌 마지막 column의 headers를 참조하므로, 부모 레벨 텍스트가 다른 column이 잘못 병합될 수 있다.
- **suggestion**: `spanStartHeaders[row]`를 업데이트하지 않고 span 시작 column의 headers를 유지

### PERF-001
- **severity**: Medium
- **category**: 성능
- **location**: `packages/angular/src/ui/data/sheet/sd-sheet.control.ts:653-664`
- **title**: `getDataCellClass()`가 매 변경감지 사이클마다 모든 셀에서 호출됨
- **description**: 템플릿 `@for` 루프 내 바인딩이므로 `items × columns` 횟수만큼 실행된다. 100행 × 10열이면 매 사이클 1000번 호출.
- **suggestion**: edit mode 셀만 클래스가 변경되도록 signal 기반 computed로 변경하거나 결과 캐싱

### PERF-002
- **severity**: Medium
- **category**: 성능
- **location**: `packages/angular/src/core/utils/useSelectionManager.ts:89`
- **title**: `isSelected()`가 `includes()`로 O(n) 선형 탐색 수행
- **description**: sheet `@for` 내 각 행마다 호출되므로 전체 복잡도 O(rows × selectedItems). 선택 아이템이 많으면 성능 저하 발생. `_expandedSet`에서는 이미 `Set` 패턴을 적용하고 있다.
- **suggestion**: `Set` 기반 computed signal로 O(1) 조회 가능하도록 개선

### DESIGN-009
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/ui/data/sheet/useSheetCellAgent.ts:28-30`
- **title**: `findFirstFocusableChild()` prototype 확장에 대한 암묵적 의존
- **description**: `cell.findFirstFocusableChild()`는 `@simplysm/core-browser`의 `Element.prototype` 확장 메서드인데, 해당 import가 이 파일에 없다. 다른 곳의 side-effect import에 의존한다.
- **suggestion**: 파일 상단에 `import "@simplysm/core-browser"` 명시적 추가

### DESIGN-010
- **severity**: Medium
- **category**: 설계
- **location**: `packages/angular/src/ui/data/sheet/useSheetDomAccessor.ts:12-18`
- **title**: DOM 쿼리 결과에 non-null assertion(`!`) 남용
- **description**: `getContainer()`, `getTable()` 등이 모두 `querySelector(...)!`로 null 가능성을 무시한다. 초기화 타이밍이나 DOM 구조 변경 시 런타임 오류가 발생한다.
- **suggestion**: null 반환을 타입에 반영하고 호출부에서 방어적 처리, 또는 초기화 시 캐싱

---

## Low

### CONSIST-001
- **severity**: Low
- **category**: 일관성
- **location**: `packages/angular/src/core/plugins/commands/sd-insert-command-event.plugin.ts` vs `sd-save-command-event.plugin.ts` vs `sd-refresh-command-event.plugin.ts`
- **title**: 커맨드 플러그인 간 `supports()` 메서드의 반환 타입 어노테이션 불일치
- **description**: `SdInsertCommandEventPlugin`만 `override supports(eventName: string): boolean`으로 반환 타입을 명시하고, 나머지 두 개는 생략한다.
- **suggestion**: 세 파일 모두 동일한 스타일로 통일

### CONSIST-002
- **severity**: Low
- **category**: 일관성
- **location**: `packages/angular/src/features/data-view/sd-data-sheet.control.ts:424-433` vs `sd-data-detail.control.ts:198-207`
- **title**: `_getOrmDataEditToastErrorMessage` 메서드 완전 중복
- **description**: 두 클래스에 완전히 동일한 private 메서드가 존재한다. 한쪽만 변경되면 불일치가 발생한다.
- **suggestion**: 공통 유틸리티 함수로 추출

### CONSIST-003
- **severity**: Low
- **category**: 일관성
- **location**: `packages/angular/src/features/data-view/sd-data-sheet.control.ts:356-357` vs `sd-data-detail.control.ts:154`
- **title**: 삭제/복구 성공 메시지의 미세한 공백 차이
- **description**: Sheet: `` `${del ? "삭제" : "복구"} 되었습니다.` `` (공백 있음), Detail: `` `${del ? "삭제" : "복구"}되었습니다.` `` (공백 없음)
- **suggestion**: 메시지 형식 통일

### CONSIST-004
- **severity**: Low
- **category**: 일관성
- **location**: `packages/angular/src/ui/form/checkbox/sd-checkbox.control.ts:251` vs `sd-switch.control.ts:23`
- **title**: tabindex 바인딩 방식 불일치
- **description**: Checkbox: `"[attr.tabindex]": "0"` (숫자), Switch: `"[attr.tabindex]": "'0'"` (문자열). 기능적으로 동일하나 패턴 불일치.
- **suggestion**: 프로젝트 전반에서 tabindex 바인딩 방식 통일

### CONSIST-005
- **severity**: Low
- **category**: 일관성
- **location**: `packages/angular/src/ui/form/checkbox/sd-switch.control.ts:129` vs `sd-checkbox.control.ts:285`
- **title**: click 핸들러에서 `event.preventDefault()/stopPropagation()` 호출 여부 불일치
- **description**: Switch는 `event.preventDefault()`와 `stopPropagation()`을 호출하지만, 유사한 역할의 Checkbox는 이벤트 객체를 받지 않아 전파 제어를 하지 않는다.
- **suggestion**: 두 컴포넌트의 이벤트 전파 처리 통일

### CONSIST-006
- **severity**: Low
- **category**: 일관성
- **location**: `packages/angular/src/ui/form/checkbox/sd-checkbox.control.ts:250`
- **title**: checkbox에 disabled 상태에서도 tabindex=0 유지
- **description**: `SdAnchorControl`은 `disabled() ? undefined : 0`으로 disabled 시 tabindex를 제거하지만, Checkbox는 항상 `tabindex="0"`. disabled 요소에 키보드 포커스가 이동할 수 있다.
- **suggestion**: disabled 시 tabindex 제거하여 다른 컴포넌트와 동일 패턴 적용

### CONSIST-007
- **severity**: Low
- **category**: 일관성
- **location**: `packages/angular/src/ui/navigation/sidebar/sd-sidebar-menu.control.ts` vs `sd-topbar-menu.control.ts`
- **title**: `getMenuRouterLinkOption`/`getIsMenuSelected` 래퍼 메서드 중복 정의
- **description**: 두 컴포넌트 모두 `menu-utils.ts` 함수를 동일 시그니처로 래핑하는 인스턴스 메서드를 각각 정의한다.
- **suggestion**: 공통 base 클래스/mixin으로 추출하거나 템플릿에서 유틸 함수 직접 참조

### DESIGN-011
- **severity**: Low
- **category**: 설계
- **location**: `packages/angular/src/core/providers/sd-navigate-window.provider.ts:28-35`
- **title**: `_openedWindows`에 이미 닫힌 창 참조가 누적
- **description**: `Set`에 추가된 Window 객체가 `closed === true`가 되어도 제거되지 않는다. 심각한 누수는 아니지만 불필요한 참조가 쌓인다.
- **suggestion**: `open()` 호출 시 이전 closed 윈도우 정리

### DESIGN-012
- **severity**: Low
- **category**: 설계
- **location**: `packages/angular/src/features/data-view/sd-data-sheet.control.ts:124`
- **title**: `reflectComponentType` 기반 `key`가 undefined일 수 있음
- **description**: `reflectComponentType(this.constructor as any)?.selector`가 `undefined`이면 `"undefined-sheet"`가 key로 전달된다.
- **suggestion**: `key`를 추상 프로퍼티로 선언하거나 undefined fallback 명시 처리

### DESIGN-013
- **severity**: Low
- **category**: 설계
- **location**: `packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts:413-416`
- **title**: `toggleUnderline()`이 StarterKit에 포함되지 않아 동작하지 않을 수 있음
- **description**: `DEFAULT_EXTENSIONS`에 `StarterKit`이 있지만 Underline 확장은 별도 패키지(`@tiptap/extension-underline`)가 필요하다. toolbar의 밑줄 버튼이 동작하지 않을 수 있다.
- **suggestion**: Underline 확장을 `DEFAULT_EXTENSIONS`에 추가하거나 toolbar에서 밑줄 버튼 제거

### DESIGN-014
- **severity**: Low
- **category**: 설계
- **location**: `packages/angular/src/ui/form/input/sd-date-range.picker.ts:84-103`
- **title**: `handleFromDateChanged`에서 `from` 변경 시 불필요한 이중 실행
- **description**: 월 모드에서 `from`이 15일이면 `setDay(1)`로 변경하는데, `(valueChange)` 이벤트가 다시 발생하여 핸들러가 재귀 호출된다. 두 번째에서 동일 값이므로 무한 루프는 아니지만 불필요한 이중 실행.
- **suggestion**: from 값이 변경 전과 동일한지 가드 추가

### DESIGN-015
- **severity**: Low
- **category**: 설계
- **location**: `packages/angular/src/ui/form/select/sd-select.control.ts:399-404`
- **title**: `onSelectAll`이 hidden/disabled 아이템의 기존 선택을 제거
- **description**: visible+enabled 아이템만 수집하여 `value.set(values)`로 전체 교체한다. 이미 선택된 hidden/disabled 아이템의 선택 상태가 사라진다.
- **suggestion**: 기존 hidden/disabled 아이템 선택을 보존하면서 visible+enabled 아이템을 추가

### PERF-003
- **severity**: Low
- **category**: 성능
- **location**: `packages/angular/src/core/providers/sd-app-structure.provider.ts:62-88`
- **title**: `getPermsByFullCode`에서 permKey마다 `getItemChainByFullCode` 반복 호출
- **description**: `permKeys.length × fullCodes.length`번의 트리 순회가 발생한다. computed 내부에서 호출되어 signal 변경마다 재실행된다.
- **suggestion**: fullCodes에 대한 아이템 조회를 먼저 캐싱하고 permKey 루프에서 재사용

### PERF-004
- **severity**: Low
- **category**: 성능
- **location**: `packages/angular/src/ui/overlay/modal/sd-modal.control.ts:264-275`
- **title**: Tab 키 입력마다 전체 DOM 트리를 TreeWalker로 순회
- **description**: `_getTabbableElements`가 매 Tab 키 입력 시 모달 내 전체 DOM을 순회하여 tabbable 요소를 수집한다. 복잡한 모달에서 입력 지연 가능.
- **suggestion**: tabbable 요소 목록을 캐싱하고 MutationObserver로 DOM 변경 시에만 갱신

### PERF-005
- **severity**: Low
- **category**: 성능
- **location**: `packages/angular/src/ui/layout/kanban/sd-kanban-lane.control.ts:139-141, 148-149`
- **title**: `isAllSelected`와 `selectableKanbanLength`에서 동일 필터링 중복 수행
- **description**: 두 computed signal 모두 `kanbanControls().filter((ctrl) => ctrl.selectable())`를 독립적으로 수행한다.
- **suggestion**: `selectableControls`를 별도 computed signal로 추출하여 공유

### LOGIC-013
- **severity**: Low
- **category**: 로직
- **location**: `packages/angular/src/ui/layout/kanban/sd-kanban.control.ts:133-135`
- **title**: `selected` computed에서 `includes()` 참조 비교가 객체 타입에서 실패 가능
- **description**: `selectedValues().includes(this.value()!)`에서 `T`가 객체 타입이고 매번 새 인스턴스가 생성되면 참조 비교로 선택 상태를 감지하지 못한다.
- **suggestion**: 비교 함수를 옵션으로 제공하거나 API 계약으로 참조 동일성 요구 문서화

### LOGIC-014
- **severity**: Low
- **category**: 로직
- **location**: `packages/angular/src/features/data-view/sd-data-select-button.control.ts:75-92`
- **title**: effect 내 비동기 load 결과가 stale할 수 있음 (LOGIC-002와 동일 패턴)
- **description**: `value` 시그널을 추적하는 effect에서 `queueMicrotask` 내 `load()` 호출이 비동기이므로, 로드 완료 전 value가 변경되면 이전 값에 대한 결과가 `selectedItems`를 덮어쓴다.
- **suggestion**: effect의 `onCleanup`으로 취소 플래그 추가 후 load 완료 시 확인

### DESIGN-016
- **severity**: Low
- **category**: 설계
- **location**: `packages/angular/src/ui/data/sheet/sd-sheet.control.ts:666-668`
- **title**: async `onKeydownCapture`의 반환 Promise가 무시되어 unhandled rejection 가능
- **description**: `(keydown.capture)` 호스트 바인딩에서 호출되는 async 메서드의 Promise가 Angular에 의해 무시된다. 내부 clipboard 작업에서 에러 발생 시 unhandled rejection이 된다.
- **suggestion**: `handleKeydownCapture` 내부에 에러 처리 추가
