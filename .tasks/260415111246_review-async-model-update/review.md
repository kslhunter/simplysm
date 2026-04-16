# 코드 리뷰: async-model-update

## LOGIC-001 [Critical] setupModelHook의 update 메서드 비동기 분기에서 fn(model())을 재호출하여 잘못된 값 설정 가능

- **위치:** packages/angular/src/core/setupModelHook.ts:47

`update` 메서드에서 `canFn()`이 Promise를 반환하는 비동기 경로에서, Promise가 resolve된 후 `fn(model())`을 다시 호출한다. 이 시점에서 `model()`의 값은 line 32에서 `value`를 계산했을 때와 달라져 있을 수 있다.

동일 파일의 `set` 메서드(line 22-24)는 올바르게 원래 `value`를 사용하지만, `update` 메서드는 그렇지 않다. 비동기 대기 중 다른 코드가 model 값을 변경하면, `fn()`이 의도하지 않은 상태에 적용되어 잘못된 결과가 설정된다.

```typescript
// 현재 코드 (line 31-52)
model.update = (fn) => {
    const value = fn(model());     // ← 현재 상태 기반으로 값 계산
    const canSet = canFn()(value);
    // ...
    void canSet.then((allowed) => {
      if (allowed !== false) {
        orgSet(fn(model()));       // ← BUG: model()이 변경된 상태일 수 있음
      }
    })
};

// set 메서드의 올바른 패턴 (line 10-28)
model.set = (value) => {
    // ...
    void canSet.then((allowed) => {
      if (allowed !== false) {
        orgSet(value);             // ← 원래 value 사용
      }
    })
};
```

**개선 방향:** line 47의 `orgSet(fn(model()))`을 `orgSet(value)`로 변경하여, line 32에서 미리 계산한 값을 사용한다.

---

## LOGIC-002 [Medium] sd-sheet의 Shift+Click 범위 선택에서 하드코딩된 100ms setTimeout으로 데이터 불일치 가능

- **위치:** packages/angular/src/data/sheet/sd-sheet.ts:849

`onSelectorMouseDown`에서 Shift+Click 범위 선택 시 `setTimeout(..., 100)`으로 선택 처리를 지연한다. 이 100ms 동안 `displayItems()` signal이 변경되면(필터링, 정렬, 페이지 변경 등), setTimeout 콜백에서 읽는 `displayItems()`는 클릭 시점과 다른 데이터를 반환하여 잘못된 항목이 선택/해제된다.

```typescript
// 현재 코드 (line 849-859)
setTimeout(() => {
  const items = this.displayItems();     // ← 100ms 후의 데이터, 클릭 시점과 다를 수 있음
  const isSelect = this.selection.isSelected(items[fr]);
  for (let i = Math.min(fr, r); i <= Math.max(fr, r); i++) {
    if (isSelect) {
      this.selection.select(items[i]);   // ← 잘못된 항목 선택 가능
    } else {
      this.selection.deselect(items[i]);
    }
  }
}, 100);
```

**개선 방향:** `setTimeout(100)` 대신 `displayItems()`를 setTimeout 외부에서 캡처하거나, `queueMicrotask()`로 대체하여 불필요한 지연을 제거한다.

---

## CONSIST-001 [Low] sd-date-range-picker에서 "월" 타입 처리 로직이 두 핸들러에 중복

- **위치:** packages/angular/src/controls/input/sd-date-range-picker.ts:69

`handleDatePeriodTypeChanged()`(line 70-78)와 `handleFromDateChanged()`(line 85-93)에서 `periodType() === "월"` 분기의 로직이 동일하다. 두 핸들러 모두 from 날짜를 월 초로 맞추고, to 날짜를 해당 월 말로 설정하는 동일한 코드를 포함한다.

```typescript
// handleDatePeriodTypeChanged() (line 70-78)
if (this.periodType() === "월") {
  const fromDate = this.from();
  if (fromDate) {
    const firstOfMonth = fromDate.setDay(1);
    this.from.set(firstOfMonth);
    this.to.set(firstOfMonth.addMonths(1).addDays(-1));
  } else {
    this.to.set(undefined);
  }
}

// handleFromDateChanged() (line 85-93) — 동일한 코드
if (this.periodType() === "월") {
  const fromDate = this.from();
  if (fromDate) {
    const firstOfMonth = fromDate.setDay(1);
    this.from.set(firstOfMonth);
    this.to.set(firstOfMonth.addMonths(1).addDays(-1));
  } else {
    this.to.set(undefined);
  }
}
```

**개선 방향:** "월" 타입의 from/to 동기화 로직을 private 메서드로 추출하여 두 핸들러에서 호출한다.

---
