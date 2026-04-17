# WBS: Angular 이벤트 시스템 타입 정합성 확보

## 프로젝트 개요

- **배경:** EventManagerPlugin 기반 이벤트 시스템을 Directive 기반으로 전환 완료. 그러나 일부 컴포넌트에서 이벤트 타입이 정확하게 추론되지 않아 `as` 캐스팅이 잔존하며, 모든 컴포넌트의 host/template 이벤트 바인딩 정합성이 검증되지 않은 상태.
- **환경:** `packages/angular` — Angular 21, `strictTemplates: true`, `typeCheckHostBindings: true`, `strictDomEventTypes: true` (strictTemplates 하위 플래그로 자동 활성)
- **전제조건:**
  - SdResizeDirective, SdIntersectionDirective, SdCommandDirective 전환 완료
  - SdOptionEventPlugin + SdEvents(타입 shim) 구조 유지 (`.capture`/`.passive`/`.once` 수식어)
  - 일부 컴포넌트에 hostDirectives 이미 적용 (sd-modal, sd-dock, sd-echarts, sd-data-detail, sd-data-sheet, sd-sheet)
- **기술적 제약:**
  - host binding의 `$event` 타입은 hostDirectives로만 해결 가능 (imports로는 불가)
  - `(document:xxx)` 패턴은 document-level 이벤트로 hostDirectives 불필요 (결정 완료)
- **참조 자료:**
  - `packages/angular/src/core/events/` — 이벤트 directive/plugin 정의 (현재 구조 확인용)
  - `packages/angular/src/data/sheet/sd-sheet.ts` — hostDirectives + SdEvents 패턴 참조 구현

## Impact Mapping

- **Goal:** Angular 패키지 전체에서 이벤트 바인딩 타입 에러 0건 달성
  - **Actor:** 라이브러리 개발자
    - **Impact:** 이벤트 핸들러에서 `as` 캐스팅이나 `$any()` 없이 정확한 타입으로 작업한다
      - **Deliverable:** SdResizeEvent 인터페이스 타입 개선 + as 캐스팅 제거
      - **Deliverable:** 전체 컴포넌트 이벤트 바인딩 정합성 검증 및 수정

## Feature Breakdown

### Epic 1. 이벤트 타입 정합성

#### [x] Feature 1.1 SdResizeEvent 인터페이스 타입 개선

**의존성:** 없음

**범위:**

- `SdResizeEvent.target` 타입을 `Element` → `HTMLElement`로 변경
  - SdResizeDirective는 `ElementRef.nativeElement` (항상 HTMLElement)를 observe하므로 실질적으로 항상 HTMLElement
- 변경에 따른 `as HTMLElement` 캐스팅 제거:
  - `sd-kanban.ts` `onCardResize()`: `event.target as HTMLElement` 2건
  - `sd-sheet.ts` `onFeatureCellResize()`: `event.target as HTMLElement` 1건
- 타입체크 통과 확인

**경계:**

- host binding `$event` 타입 문제는 Feature 1.2에서 다룸
- SdIntersectionEvent 인터페이스는 현재 사용처가 없으므로 변경 불필요

**근거:**

- 코드 확인: `sd-kanban.ts` `onCardResize()`에서 `(event.target as HTMLElement).clientHeight`, `(event.target as HTMLElement).marginBottom` 사용
- 코드 확인: `sd-sheet.ts` `onFeatureCellResize()`에서 `(event.target as HTMLElement).offsetWidth` 사용
- `SdResizeDirective`는 `inject(ElementRef).nativeElement`를 observe — 런타임에서 항상 HTMLElement

#### [x] Feature 1.2 전체 컴포넌트 이벤트 바인딩 정합성 검증

**의존성:** Feature 1.1 (SdResizeEvent 타입 변경 반영 후 검증)

**범위:**

- `pnpm typecheck -t angular` 실행하여 현재 이벤트 관련 타입 에러 전수 파악
- 에러가 있는 컴포넌트에 대해:
  - host binding 커스텀 이벤트 → hostDirectives 누락 보완
  - template binding 커스텀 이벤트 → imports 누락 보완
  - 이벤트 핸들러 파라미터 타입 수정 (필요시)
- 검증 대상 컴포넌트 (현재 이벤트 사용 확인된 전체 목록):
  - **host sdResize**: sd-modal ✅, sd-dock ✅, sd-echarts ✅
  - **host sdCommand**: sd-data-detail ✅, sd-data-sheet ✅
  - **host .capture**: sd-sheet ✅ (SdEvents hostDirective)
  - **host document:drop.capture**: sd-kanban (현재 상태 유지 — 결정 완료)
  - **template sdResize**: sd-kanban ✅, sd-sheet ✅, sd-modal ✅, sd-dropdown-popup ✅, sd-collapse ✅
  - **template scroll.passive**: sd-sheet (파라미터 미사용, 이슈 없음)
- 불필요한 import 정리 (있는 경우)
- 최종 타입체크 통과 확인 (`pnpm typecheck -t angular`)

**경계:**

- `SdIntersectionDirective`는 현재 angular 패키지 내 사용처 없음 — 소비 프로젝트에서만 사용, 이 Feature에서 다루지 않음
- `SdOptionEventPlugin`의 구조 변경 없음
- 이벤트 시스템 외의 타입 에러는 이 Feature에서 수정하지 않음

**근거:**

- 사용자 요청: "angular 패키지의 각 컴포넌트 전부 하나씩 확인해서 전체적으로 리팩토링이 필요해 보임"
- 코드 확인: 6개 컴포넌트에 이미 hostDirectives 적용 — 나머지 확인 필요
- sd-sheet.ts의 패턴 (`hostDirectives: [{ directive: SdEvents, outputs: [...] }]`)이 참조 구현으로 확인됨

## 제외 사항

- `(document:drop.capture)` hostDirectives 적용 — 사유: document-level 이벤트로 요소 directive 불필요, 사용자 결정
- `SdIntersectionDirective` 소비 프로젝트 적용 — 사유: angular 패키지 내 사용처 없음, 범위 초과
- `SdOptionEventPlugin` → Directive 전환 — 사유: `.capture`/`.passive`/`.once` 수식어는 모든 DOM 이벤트에 적용되어 directive 전환 비현실적
- 이벤트 시스템 외의 타입 에러 수정 — 사유: 범위 초과
