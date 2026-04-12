# @simplysm/angular 리팩토링 구현 리뷰

| 항목 | 값 |
|------|-----|
| 분석 대상 | `.tasks/260411152001_angular-refactor/*.md` 구현 결과 (packages/angular) |
| 분석 일시 | 2026-04-11 18:51 |
| 대상 Feature | 6건 (1.1, 1.2, 2.1, 3.1, 4.1, 4.2) |
| 소스 파일 수 | ~146개 (src/) + ~143개 (tests/) |
| 발견 이슈 | 1건 (Low: 1) |

---

## 검증 결과 요약

### Feature 1.1 Provider/Component 동거 — ✅ 정상 구현

- 5개 provider가 올바른 기능 폴더로 이동됨 (busy, toast, modal, print, theme)
- `provideSdAngular.ts`가 src/ 루트에 위치
- 이전 경로(`core/providers/sd-busy.provider.ts` 등)에 대한 참조 잔류 없음
- `index.ts` export 경로가 새 위치를 정확히 반영

### Feature 1.2 플랫 구조 전환 — ✅ 정상 구현

- `ui/`, `features/` 디렉토리가 완전히 제거됨
- 35개 기능 폴더가 `src/` 직하에 플랫 배치
- `data-view/`가 `data-sheet/`, `data-detail/`, `data-select-button/`으로 올바르게 3분할
- `tests/` 디렉토리가 `src/` 구조를 정확히 미러링 (tests/ui/, tests/features/ 제거됨)
- 이전 경로(`ui/overlay/`, `ui/form/`, `features/` 등)에 대한 import 잔류 없음
- `CLAUDE.md` 아키텍처 섹션이 새 플랫 구조를 반영

### Feature 2.1 mark() 안전성 확보 — ✅ 정상 구현

- `@angular/core/primitives/signals` import 완전 제거
- `clone` 파라미터 제거, 항상 shallow copy(`Array.isArray(v) ? [...v] : { ...v }`)
- 시그니처: `mark(sig: WritableSignal<any>): void` — 계획과 일치
- 호출부 변경 불필요 (기존에 clone 파라미터 없이 호출 중) — 확인됨

### Feature 3.1 대형 컴포넌트 로직 분할 — ✅ 정상 구현

- `injectFocusTrap()`: `src/modal/injectFocusTrap.ts`에 올바르게 추출. `inject(ElementRef)` 사용, `{ handleTabTrap }` 반환 — inject* 패턴 준수
- `injectDragResize()`: `src/modal/injectDragResize.ts`에 올바르게 추출. `inject(DestroyRef)` 사용, `destroyRef.onDestroy()`로 리스너 정리, `{ startDrag, startResize }` 반환 — inject* 패턴 준수
- `useTiptapToolbar()`: `src/editor/useTiptapToolbar.ts`에 올바르게 추출. `inject()` 미사용, Signal 입력 → 상태/메서드 반환 — use* 패턴 준수
- `sd-modal.ts`에서 이전 메서드(`_handleTabTrap`, `_getTabbableElements`, `_applyDrag`, `_applyResize`) 제거 확인
- `sd-tiptap-editor.ts`에서 toolbar 관련 로직이 `_toolbar` 위임으로 올바르게 교체됨
- 공개 API(selector, inputs, outputs) 변경 없음

### Feature 4.1 커맨드 플러그인 중복 제거 — ✅ 정상 구현

- `shouldProcessCommandEvent()` 함수가 `findTopOpenModalEl.ts`에 추가됨
- 3개 플러그인(save, refresh, insert) 모두 `shouldProcessCommandEvent` 사용으로 전환됨
- 기존 `findTopOpenModalEl` 직접 호출 + `contains` 체크 2줄이 1줄로 통합

### Feature 4.2 타입 re-export 정리 — ✅ 정상 구현

- `sd-app-structure.types.ts`에서 `@simplysm/service-common` re-export 완전 제거
- 로컬 타입(`SdMenu`, `SdFlatMenu`, `SdPermission`)만 잔류
- `index.ts`에서 `AppStructureItem`, `FlatPermission` export 제거 확인
- `sd-app-structure.provider.ts`가 `@simplysm/service-common`에서 직접 import

---

## 이슈 목록

### CONSIST-001
```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/angular/CLAUDE.md:152
title: CLAUDE.md의 mark() 함수 설명이 이전 구현(clone 파라미터, 비공개 API)을 기술
description:
  Feature 2.1에서 mark() 함수가 단순화되어 clone 파라미터가 제거되고
  Angular 비공개 API 의존이 제거되었으나, CLAUDE.md의 mark() 설명(152줄)은
  여전히 이전 구현을 기술하고 있다:
  "mark(sig, clone?): ... clone이 true이면 ... false이면 Angular 내부
  producerIncrementEpoch/producerNotifyConsumers API를 직접 호출"
  
  실제 구현: mark(sig: WritableSignal<any>): void — 항상 shallow copy,
  비공개 API 미사용.
  
  문서가 코드와 불일치하여 개발자에게 잘못된 정보를 전달한다.
suggestion:
  CLAUDE.md 152줄의 mark() 설명을 현재 구현에 맞게 업데이트:
  "mark(sig): WritableSignal의 값을 shallow copy하여 새 참조를 생성,
  consumer에게 변경을 알린다. 배열은 [...v], 객체는 {...v}로 복사."
```

---

## 요약

| Severity | 건수 | 주요 이슈 |
|----------|------|-----------|
| Critical | 0 | — |
| Medium | 0 | — |
| Low | 1 | CLAUDE.md mark() 함수 설명 불일치 |

**전체 평가**: 6개 Feature 모두 WBS 범위 내에서 정확하게 구현되었다. 디렉토리 구조 전환, import 경로 업데이트, composable 추출, 코드 중복 제거, 타입 정리 모두 계획과 일치하며, 이전 경로에 대한 잔류 참조가 없다. 유일한 이슈는 CLAUDE.md의 mark() 함수 문서가 이전 구현을 기술하고 있는 경미한 일관성 문제이다.
