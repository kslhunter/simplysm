# PERF-005: sd-sheet isExpanded Set lookup — LLM 검증

## 검증 항목
- [x] `_expandedSet`가 `computed(() => new Set(this.expandedItems()))`로 정의되어 expandedItems 변경 시 자동 재생성된다: sd-sheet.control.ts 확인
- [x] `isExpanded(item)`이 `this._expandedSet().has(item)`을 사용하여 O(1) lookup을 수행한다: sd-sheet.control.ts 확인
- [x] 동일 패턴이 `useExpandingManager.ts` line 53에 이미 존재하여 코드베이스 일관성을 유지한다: `const _expandedSet = computed(() => new Set(binding.expandedItems()))` 확인
- [x] 기존 tree 테스트(sheet-tree-pagination.spec.ts) 7건이 모두 통과하여 expand/collapse 동작에 회귀가 없다: 전체 90개 테스트 통과
