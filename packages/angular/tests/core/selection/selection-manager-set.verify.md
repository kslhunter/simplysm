# PERF-001 isSelected Set 기반 — LLM 검증

## 검증 항목

- [x] `useSelectionManager.ts`에서 `selectedItemsSet` computed가 `new Set(options.selectedItems())`를 캐싱: 30행에 `const selectedItemsSet = computed(() => new Set(options.selectedItems()))` 확인
- [x] `isSelected()`에서 `selectedItemsSet().has(item)` 사용: 92행에 `return selectedItemsSet().has(item)` 확인
- [x] `isAllSelected()`도 동일한 `selectedItemsSet()` 공유 computed 사용: 34행에 `const set = selectedItemsSet()` 확인
- [x] 기존 테스트 12건 모두 통과: `selection-manager.spec.ts` — isSelected, select, deselect, toggle, toggleAll 등 동작 정상
