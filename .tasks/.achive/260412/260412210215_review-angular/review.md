# 코드 리뷰: angular

## LOGIC-001 [Critical] setupModelHook의 update 비동기 경로에서 canFn이 승인하지 않은 값이 설정될 수 있음

- **위치:** packages/angular/src/core/setupModelHook.ts:44-49

`model.update(fn)` 호출 시, `canFn`이 Promise를 반환하는 비동기 경로에서 `fn(model())`을 두 번 평가한다:

1. **32행**: `const value = fn(model())` — 이 시점의 값으로 `canFn()(value)`를 호출하여 승인 여부를 판단
2. **48행**: `orgSet(fn(model()))` — Promise 해소 시점에 `fn(model())`을 재평가하여 새 값을 설정

Promise가 해소되기까지 시간이 경과하므로, 그 사이에 `model()`의 값이 다른 경로(다른 `set`/`update` 호출)를 통해 변경될 수 있다. 이 경우 48행의 `fn(model())`은 32행에서 `canFn`이 검증한 값과 다른 값을 생산하며, **canFn의 가드를 우회**하게 된다.

예시: 토글 함수 `v => !v`에서:
- 현재값 `false` → `canFn(true)` 호출 → `true` 승인
- 대기 중 다른 경로에서 값이 `true`로 변경됨
- Promise 해소 → `fn(model())` = `fn(true)` = `false` → canFn은 `false`를 승인한 적 없으나 `false`가 설정됨

대조적으로, `model.set` 경로(14-28행)는 최초 계산된 `value`를 캡처하여 Promise 해소 시에도 동일한 값을 사용하므로 이 문제가 없다.

**개선 방향:** `set` 경로와 일관되게, 48행에서 `fn(model())`을 재평가하지 않고 32행에서 이미 계산한 `value`를 사용한다: `orgSet(value)`

---

## DESIGN-001 [Low] SdModal의 headerStyle, noFirstControlFocusing 입력이 선언 후 미사용 (dead code)

- **위치:** packages/angular/src/core/modal/sd-modal.ts:311-312

`headerStyle`과 `noFirstControlFocusing` 두 input이 선언되어 있지만, SdModal 컴포넌트의 템플릿(35-62행)과 클래스 로직 어디에서도 참조하지 않는다.

- `headerStyle`: `._header` div에 `[style]="headerStyle()"` 바인딩이 없다. `SdModalProvider`(sd-modal.provider.ts:129-131)가 `modalRef.setInput("headerStyle", value)`로 값을 주입하지만, 컴포넌트가 이를 소비하지 않으므로 효과가 없다.
- `noFirstControlFocusing`: `SdModalProvider`(sd-modal.provider.ts:171)가 `options.noFirstControlFocusing`을 직접 읽어 포커스 동작을 결정한다. 모달 컴포넌트의 input은 `setInput`으로 설정되지만 컴포넌트 자체에서는 읽지 않으므로 dead code이다.

두 input 모두 호출자에게 "사용 가능한 옵션"이라는 잘못된 기대를 줄 수 있다 (`headerStyle`의 경우 실제로 스타일이 적용될 것이라 기대하나 무시됨).

**개선 방향:** `headerStyle`은 템플릿에서 실제로 바인딩하거나, 불필요하면 input과 `SdModalOptions` 타입에서 제거한다. `noFirstControlFocusing`은 provider가 `options`에서 직접 읽으므로 SdModal input에서 제거한다.

---

## CONSIST-001 [Low] SdCheckbox와 SdSwitch의 tabindex 호스트 바인딩 표현식 불일치

- **위치:** packages/angular/src/controls/checkbox/sd-checkbox.ts:250, packages/angular/src/controls/checkbox/sd-switch.ts:24

동일한 기능(탭 포커스 가능하게 하기)을 수행하는 tabindex 바인딩이 두 컴포넌트에서 다른 표현식으로 작성되어 있다:

- SdCheckbox: `"[attr.tabindex]": "0"` — 숫자 리터럴
- SdSwitch: `"[attr.tabindex]": "'0'"` — 문자열 리터럴

DOM 결과(`tabindex="0"`)는 동일하지만, 같은 디렉토리에 있는 같은 성격의 컴포넌트에서 표현 방식이 다르다.

**개선 방향:** 하나의 방식으로 통일한다 (어느 쪽이든 기능적 차이 없음).
