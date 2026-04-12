# PERF-002 getChildren 메모이제이션 — LLM 검증

## 검증 항목

- [x] `sd-shared-data-select.ts`에 `_sortedChildrenMap` computed 추가: `itemByParentKeyMap`과 `displayOrderKeyProp`에 의존하여 정렬된 자식 Map을 캐싱
- [x] `getChildren` 메서드가 `_sortedChildrenMap()?.get(...)` lookup만 수행: 이전에는 매 호출마다 `[...result].sort(...)` 수행 → 이제 computed 캐시 사용
- [x] `displayOrderKeyProp`이 null일 때 정렬 없이 원본 `parentMap` 반환: 불필요한 복사 방지
- [x] 기존 `shared-data-select.spec.ts` 테스트 모두 통과: 기능 동작에 변경 없음
