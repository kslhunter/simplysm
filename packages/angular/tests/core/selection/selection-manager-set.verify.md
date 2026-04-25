# Feature 1.1 useSelectionManager key 기반 전환 — LLM 검증

## 검증 항목

- `useSelectionManager.ts`에서 옵션이 `selectedKeys: WritableSignal<unknown[]>`로 변경됨: 6행 확인
- 내부 `selectedKeys` computed 제거 → `options.selectedKeys` 직접 사용: 50행 `options.selectedKeys()` 확인
- `select()` 내부에서 `keyOf(item)` 계산 후 `options.selectedKeys.set/update` 사용: 76-90행 확인
- `deselect()` 내부에서 key 필터링으로 `options.selectedKeys.update` 사용: 93-97행 확인
- `toggleAll()` 내부에서 key 배열 직접 조작: 108-126행 확인
- `isSelected()` 내부에서 `options.selectedKeys()` 직접 참조: 128-130행 확인
- `SelectModalOutputResult<T>` 인터페이스에서 `selectedItems` 제거, `selectedItemKeys` → `selectedKeys` 변경
- Acceptance Test 11건, Unit Test 19건 모두 통과
