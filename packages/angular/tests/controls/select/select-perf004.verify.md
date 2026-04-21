# PERF-004: sd-select contentHTML effect 최적화 — LLM 검증

## 검증 항목
- effect 내 item.value() 읽기가 untracked로 감싸져 있다: single 모드 `untracked(() => items.find((item) => item.value() === currentValue))`, multi 모드 `untracked(() => items.filter((item) => arr.includes(item.value())))` 확인
- 선택된 item의 contentHTML()은 untracked 바깥에서 호출되어 정상 추적된다: single 모드 `selectedItem.contentHTML()`, multi 모드 `for (const item of selectedItems) { item.contentHTML() }` 확인
- _itemControls()와 value()는 tracked 상태로 유지된다: effect 콜백 최상단에서 `const items = this._itemControls(); const currentValue = this.value();` 호출, untracked 바깥
- selectMode()와 multiSelectionDisplayDirection()은 tracked 상태로 유지된다: untracked 바깥에서 호출 확인
