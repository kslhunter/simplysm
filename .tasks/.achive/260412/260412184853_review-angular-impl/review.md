# Code Review: .tasks/260412174058_review-angular 구현 검증

| 항목 | 내용 |
|---|---|
| 분석 대상 | `.tasks/260412174058_review-angular/` Feature 문서 3건 및 구현 코드 |
| 일시 | 2026-04-12 |
| 파일 수 | 문서 5건, 소스 14건, 테스트 14건 |
| 발견 이슈 | 2건 (Medium 1건, Low 1건) |

---

## 구현 검증 요약

### Feature 1.1 리소스 관리 및 에러 처리 — 대부분 정확, 1건 이슈

| 이슈 | 구현 결과 | 판정 |
|---|---|---|
| DESIGN-001 cancelled 플래그 | `injectDataSheetRefreshManager.ts:61-87` 참조 패턴과 동일하게 구현. 테스트 2건 추가 | OK |
| DESIGN-002 drag cleanup | `onResizeBarMousedown` 시작부에 `this._dragCleanup?.()` 추가. 테스트 1건 추가 | OK |
| DESIGN-007 resize cleanup | `onMousedown` 시작부에 `resizingCleanup?.()` 추가. 테스트 1건 추가 | OK |
| DESIGN-003 modalCount 복구 | `createComponent` try/catch, 실패 시 modalCount 감소 + reject. 테스트 1건 추가 | OK |
| DESIGN-005 스크립트 로드 | 에러 catch + 사용자 표시, 로드 대기 구현. 테스트 3건 수정/추가. **재시도 시 hang 버그 발견** | **이슈** |

### Feature 1.2 로직 정확성 및 성능 — 정확

| 이슈 | 구현 결과 | 판정 |
|---|---|---|
| LOGIC-001 key 폴백 | `?? this.constructor.name` 추가 | OK |
| LOGIC-003 barcode try/catch | `bwipjs.toSVG()` try/catch, 에러 시 빈 문자열 반환. 테스트 1건 추가 | OK |
| DESIGN-004 프리셋 중복 검사 | `onAddClick`에 `some(p => p.name === name)` 검사 + 토스트 경고. 테스트 2건 추가 | OK |
| PERF-001 isSelected Set | `selectedItemsSet` computed 추가, `isAllSelected`와 공유. 기존 테스트 12건 통과 | OK |
| PERF-002 getChildren 메모이제이션 | `_sortedChildrenMap` computed 추가, orderProp null 시 원본 반환 최적화. 기존 테스트 통과 | OK |

### Feature 2.1 네이밍 및 메시지 통일 — 정확

| 이슈 | 구현 결과 | 판정 |
|---|---|---|
| CONSIST-001 canDeactivateFn | 선언부 + 사용처 3개 + 테스트 3개 일괄 rename | OK |
| CONSIST-002 파일명 | `sd-date-range.picker.ts` → `sd-date-range-picker.ts`, import 경로 4곳 수정 | OK |
| CONSIST-003 띄어쓰기 | 2개 파일 토스트 메시지 공백 제거, 테스트 기대값도 수정 | OK |
| DESIGN-006 변수명 | `isPlaceBottom/isPlaceRight` → `shouldPlaceAbove/shouldPlaceLeft`, 사용처 8곳 일괄 | OK |

---

## Medium

### LOGIC-005

```
id: LOGIC-005
severity: Medium
category: 로직
location: packages/angular/src/features/address/sd-address-search.modal.ts:44-68
title: loadDaumPostcodeScript — 스크립트 로드 실패 후 재시도 시 Promise 영구 hang
description: 스크립트 로드가 실패(onerror)하면 `<script id="daum_address">` 요소가 DOM에 남아있다. 사용자가 모달을 닫고 재시도할 때, `getElementById("daum_address")`가 실패한 스크립트를 찾고 `typeof daum === "undefined"`이므로 load/error 이벤트 리스너를 새로 등록하지만, 이미 실패한 스크립트 요소는 이벤트를 다시 발생시키지 않는다. Promise가 resolve/reject 없이 영구 hang되어 무한 스피너가 표시된다.

  시뮬레이션:
  1. 첫 번째 모달 열기 → 스크립트 로드 실패 → onerror 트리거 → reject → 에러 메시지 표시 (정상)
  2. 모달 닫기 → 재열기 → loadDaumPostcodeScript() 호출
  3. existing = getElementById("daum_address") → 실패한 스크립트 요소 발견
  4. typeof daum === "undefined" → true → addEventListener("load", ...) / addEventListener("error", ...)
  5. 이미 로드가 끝난(실패한) 스크립트 요소에서 load/error 이벤트는 다시 발생하지 않음
  6. Promise 영구 hang → initialized가 false인 채 무한 스피너

suggestion: onerror 시 실패한 스크립트 요소를 DOM에서 제거하여 재시도 시 새 스크립트를 삽입하도록 한다. 예: loadDaumPostcodeScript 내 onerror 핸들러에 `scriptEl.remove()` 추가
```

---

## Low

### CONSIST-005

```
id: CONSIST-005
severity: Low
category: 일관성
location: .tasks/260412174058_review-angular/1.1-resource-management-error-handling.md:12,193-225
title: Feature 1.1 문서 내 D2 결정사항과 설계 섹션 간 불일치
description: D2 결정사항 테이블(12행)에서는 "모듈 레벨 상태 없이 race condition 처리, 테스트 용이"로 명시하였으나, 같은 문서의 설계 섹션(193-225행)에서는 `let _loadPromise: Promise<void> | null = null;` 모듈 레벨 상태를 사용하는 코드를 제시한다. 실제 구현은 D2 결정(모듈 레벨 상태 없음)을 따랐으므로 코드 자체의 문제는 아니지만, 문서의 설계 섹션이 결정사항과 모순되어 추후 참조 시 혼란을 줄 수 있다.
suggestion: 설계 섹션의 코드 예시를 D2 결정에 맞게 수정하여 모듈 레벨 _loadPromise 없는 구현으로 통일
```
