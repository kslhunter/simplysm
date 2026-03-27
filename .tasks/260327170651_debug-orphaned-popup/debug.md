# 디버그: sd-select @if 제거 시 dropdown popup orphaned

## 에러 증상

- **에러 메시지:** 없음 (UI 동작 버그)
- **위치:** `packages/sd-angular/src/ui/overlay/dropdown/sd-dropdown.control.ts`
- **재현:**
  1. sd-data-sheet 내 `@if`로 sd-select 조건부 렌더링
  2. 셀 편집 모드 진입
  3. sd-select 클릭 → dropdown popup 열림
  4. popup 항목 클릭 → focus 이동 → 셀 blur → 편집 모드 종료
  5. `@if` false → sd-select DOM 제거, popup은 `document.body`에 orphaned 상태로 남음
  6. 이후 어디를 클릭해도 popup이 사라지지 않음

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | 증거1: popup이 document.body로 이동됨 | 증거2: $effect는 open 시그널 변경 시에만 else 실행 | 증거3: @if false → 컴포넌트 destroy, open 시그널은 여전히 true | 증거4: 수동 클릭에도 popup 미제거 |
|----|------|------|------|------|
| H1: $effect cleanup 미실행 | C | C | C | C |
| H2: onDocumentBlurCapture가 close 차단 | N | C | N | I → 폐기 |
| H3: document.body popup이 Angular 정리 범위 밖 | C | N | C | C |

> H3은 H1의 전제 조건이므로 H1으로 통합

### 결과: 확정 — H1

`SdDropdownControl`이 `open = true` 상태에서 `@if`에 의해 destroy될 때,
Angular가 `$effect`를 내부적으로 torn down하지만 **effect 함수의 else 분기(cleanup 로직)는 실행되지 않음**.
`document.body`에 이동된 popup 엘리먼트는 Angular의 DOM 정리 범위 밖이므로 영원히 orphaned 상태로 남는다.

또한 `SdDropdownControl`이 destroy되면 `(document:blur.capture)` 이벤트 바인딩도 해제되어
이후 어디를 클릭해도 popup을 닫는 이벤트 핸들러가 존재하지 않게 된다.

## 해결 방안

### 방안 A: ngOnDestroy + `_popupEl` 캐싱 ✅ 선택됨

- **설명:** `$effect`에서 popup을 `document.body`에 append할 때 `_popupEl` 필드에 캐싱.
  `ngOnDestroy`에서 캐싱된 DOM 참조로 popup 명시적 제거.
  이미 제거된 경우 `remove()`는 no-op이므로 안전.

```typescript
private _popupEl?: HTMLElement;

constructor() {
  $effect(() => {
    if (this.open()) {
      this._popupEl = this.popupElRef().nativeElement;
      document.body.appendChild(this._popupEl);
      // ... 기존 positioning 코드
    } else {
      // ... 기존 focus 관리 + style reset + remove
      this._popupEl = undefined;
    }
  });
}

ngOnDestroy() {
  this._popupEl?.remove();
}
```

- **장점:** 변경 범위 최소 (기존 로직 불변). destroy 타이밍에 `contentChild` signal 접근 불필요 (캐싱된 DOM ref 사용).
- **반론:** popup 생명주기 관리 코드가 `$effect`와 `ngOnDestroy` 두 곳에 분산됨.
- **점수:** 안정성 9/10, 유지보수성 8/10, UX 영향 9/10 → **평균 8.7/10**

### 방안 B: $effect onCleanup 단일 관리

- **설명:** `onCleanup`으로 popup 제거를 $effect 안에서 통합 관리.
- **장점:** $effect 단일 진입점.
- **반론:** `onCleanup`은 effect 재실행 직전에도 호출 → 정상 close 플로우에서 focus 복귀 UX 회귀 발생.
- **점수:** 안정성 6/10, 유지보수성 9/10, UX 영향 6/10 → **평균 7.0/10**

### 방안 C: 수행 안 함

- **점수:** 안정성 1/10, 유지보수성 5/10, UX 영향 1/10 → **평균 2.3/10**

## 선택 결과

**방안 A** (평균 8.7/10)

기존 focus 관리 로직 보존 + 최소 변경으로 근본 원인 제거.
`_popupEl` 캐싱으로 destroy 타이밍의 signal 접근 문제도 회피.
