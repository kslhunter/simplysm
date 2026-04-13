# 코드 리뷰: angular

## LOGIC-001 [Critical] TipTap Underline 확장 미등록으로 런타임 에러 발생

- **위치:** packages/angular/src/features/editor/useTiptapToolbar.ts:69-70

UI에 Underline 버튼이 존재하고 `execCmd('underline')`이 `chain.toggleUnderline().run()`을 호출하지만, `@tiptap/extension-underline` 패키지가 dependencies에 없고 `DEFAULT_EXTENSIONS`에도 Underline 확장이 포함되지 않는다. `@tiptap/starter-kit`에는 Bold, Italic, Strike만 포함되며 Underline은 별도 확장이다. Underline 버튼 클릭 시 `toggleUnderline is not a function` 런타임 에러가 발생하거나 아무 동작도 하지 않는다.

**개선 방향:** `@tiptap/extension-underline` 패키지를 추가하고 `DEFAULT_EXTENSIONS`에 포함시키거나, 지원하지 않을 경우 UI에서 Underline 버튼을 제거한다.

---

## LOGIC-002 [Medium] useSheetCellAgent에서 clipboard.writeText에 null 전달 가능

- **위치:** packages/angular/src/data/sheet/useSheetCellAgent.ts:196

`td.textContent`는 `string | null` 타입이다. `navigator.clipboard.writeText(td.textContent)`에서 `td.textContent`가 null인 경우 타입 불일치가 발생한다. 빈 셀의 경우 `textContent`가 null일 수 있다.

**개선 방향:** `await navigator.clipboard.writeText(td.textContent ?? "")`로 null 방어를 추가한다.

---

## LOGIC-003 [Medium] SdTextfield 파싱 실패 시 input 요소와 model 값 불일치

- **위치:** packages/angular/src/controls/input/sd-textfield.ts:375-377

`onInput` 핸들러에서 `parsed === undefined`이면 `return`하여 value model을 갱신하지 않는다. 이때 input 요소의 text에는 사용자가 입력한 파싱 불가능한 문자열이 그대로 남지만, 내부 model은 이전 유효 값을 유지한다. Angular의 `[value]` 바인딩은 input 이벤트 중 값을 되돌리지 않으므로 UI와 model이 불일치한다. number 타입에서 "1.2.3" 같은 입력 시 발생한다. `onInputPaste`에서는 이미 `inputEl.value = this.controlValue()` 패턴으로 되돌리고 있다.

**개선 방향:** 파싱 실패 시 `inputEl.value = this.controlValue()`로 input 요소를 이전 유효 값으로 되돌린다.

---

## LOGIC-004 [Medium] SdBaseContainer.modalOrPageTitle에서 에러를 빈 문자열로 삼킴

- **위치:** packages/angular/src/layout/base-container/sd-base-container.ts:107-109

`modalOrPageTitle` computed에서 모든 예외를 잡아 빈 문자열을 반환한다. `getTitleByFullCode()`가 잘못된 코드로 예외를 던질 경우 타이틀이 조용히 빈 문자열이 되어 디버깅이 어렵다.

**개선 방향:** 최소한 에러 로깅을 추가하거나, 구체적으로 어떤 예외를 무시할지 명시적으로 지정한다.

---

## DESIGN-001 [Medium] SdGlobalErrorHandlerPlugin catch 블록에서 appRef 이중 destroy

- **위치:** packages/angular/src/core/error-handler/sd-global-error-handler.plugin.ts:74-83

`_displayErrorMessage`에서 `appRef.destroy()`를 호출한 후 후속 코드(DOM 생성 등)에서 예외가 발생하면 catch 블록으로 진입한다. catch 블록도 `appRef.destroy()`를 호출하므로 이미 파괴된 앱에 대해 이중 destroy가 시도되어 추가 예외가 발생할 수 있다.

**개선 방향:** catch 블록의 `appRef.destroy()`를 try-catch로 감싸거나, 이미 파괴되었는지 확인한다.

---

## DESIGN-002 [Medium] SdSharedDataProvider register 시 리스너 교체 경합

- **위치:** packages/angular/src/core/shared-data/sd-shared-data.provider.ts:121-153

`register`에서 기존 리스너를 `void client.removeListener`로 비동기 제거하면서 그 사이에 이벤트가 도착할 수 있다. 리스너 제거가 완료되기 전에 새 리스너가 등록되면 동일 이벤트가 이중 처리될 수 있다.

**개선 방향:** register에서 리스너 제거를 await하거나, 이벤트 도착 시 entry 유효성을 검증한다.

---

## LOGIC-005 [Low] setupModelHook에서 async canFn 사용 시 model.update의 stale value

- **위치:** packages/angular/src/core/setupModelHook.ts:31-33

`model.update`는 `fn(model())`로 값을 동기적으로 계산한 후 `model.set(value)`를 호출한다. canFn이 Promise를 반환하면 계산 시점과 resolve 시점 사이에 model 값이 바뀔 수 있어 stale value가 설정될 수 있다.

**개선 방향:** 비동기 canFn + model.update 조합 사용 시 주의가 필요함을 문서화하거나, Promise resolve 후 fn(model())을 재계산한다.

---

## LOGIC-006 [Low] SdNavigateWindowProvider.open에서 params 미지정 시 불필요한 세미콜론

- **위치:** packages/angular/src/core/routing/sd-navigate-window.provider.ts:38

params가 undefined일 때 `new URLSearchParams(undefined).toString()`은 빈 문자열을 반환하여 URL에 불필요한 세미콜론이 붙는다 (예: `pathname#navigate;`).

**개선 방향:** params가 undefined이거나 빈 객체일 때 세미콜론과 파라미터 부분을 생략한다.

---

## CONSIST-001 [Low] SdCheckbox vs SdSwitch 이벤트 전파 및 canChangeFn 지원 차이

- **위치:** packages/angular/src/controls/checkbox/sd-checkbox.ts:285, packages/angular/src/controls/checkbox/sd-switch.ts:129

SdSwitch.onClick은 `stopPropagation()`을 호출하지만 SdCheckbox.onClick은 이벤트 전파를 제어하지 않는다. 또한 SdCheckbox에는 `canChangeFn` + `setupModelHook`이 있지만 SdSwitch에는 없다. 유사한 토글 UI 간 기능 대칭성이 부족하다.

**개선 방향:** 의도적 차이인지 확인하고, 아니라면 통일한다.

---

## CONSIST-002 [Low] _getOrmDataEditToastErrorMessage 메서드 중복

- **위치:** packages/angular/src/data/data-detail/sd-data-detail.base.ts:180-189, packages/angular/src/data/data-sheet/sd-data-sheet.base.ts:295-304

동일한 에러 메시지 변환 로직이 SdDataDetailBase와 SdDataSheetBase에 각각 private 메서드로 중복 정의되어 있다.

**개선 방향:** 공통 유틸 함수로 추출한다.

---

## PERF-001 [Low] SdSelect contentHTML effect가 모든 아이템의 DOM 변경에 반응

- **위치:** packages/angular/src/controls/select/sd-select.ts:317-365

effect 내에서 모든 SdSelectItem의 `contentHTML()` signal이 tracked 의존성으로 등록되어, 선택되지 않은 아이템의 DOM 변경에도 전체 effect가 재실행된다.

**개선 방향:** selected 아이템만 필터링한 후 해당 아이템의 contentHTML()만 tracked로 읽도록 구조를 변경한다.

---

## DESIGN-003 [Low] SdModal._restoreConfig에서 void async 에러 미처리

- **위치:** packages/angular/src/core/modal/sd-modal.ts:348-353

effect 내에서 `void this._restoreConfig(k)`로 호출하여 비동기 에러가 unhandled rejection이 된다. `_saveConfig`도 동일 패턴이다.

**개선 방향:** `.catch(err => errorHandler.handleError(err))` 패턴을 적용한다.

---

## DESIGN-004 [Low] SdDataDetailBase에서 queueMicrotask + async 패턴의 에러 전파 부재

- **위치:** packages/angular/src/data/data-detail/sd-data-detail.base.ts:66-90

effect 내부에서 `queueMicrotask(async () => { ... })` 패턴 사용 시 내부 에러가 unhandled rejection이 될 수 있다. `SdGlobalErrorHandlerPlugin`이 잡아주므로 실질적 위험은 낮지만, 명시적 에러 처리가 부재하다.

**개선 방향:** queueMicrotask 내부에도 최외곽 try-catch를 추가하거나, `.catch()` 패턴을 적용한다.

---

## DESIGN-005 [Low] SdPermissionTable collapsedItems가 객체 참조 기반 Set

- **위치:** packages/angular/src/data/permission-table/sd-permission-table.ts:218

`collapsedItems`는 `Set<SdPermission<TModule>>`로 객체 참조로 동일성을 판단한다. items input이 새 배열로 교체되면(서버 리로드 등) 기존 접힘 상태가 모두 풀린다.

**개선 방향:** codeChain 기반의 문자열 키로 접힘 상태를 관리하면 items 재로드 시에도 상태가 유지된다.
