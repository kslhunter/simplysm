# WBS: Angular 21 최신 API 리팩토링

## 프로젝트 개요

- **배경:** Angular 패키지(`packages/angular`)의 코드가 대부분 Angular 21 best practices를 따르고 있으나, 일부 `signal()` + `effect()` 동기화 패턴이 Angular 19+에서 도입된 `linkedSignal()`, `resource()`, 또는 기존 `computed()`로 더 선언적으로 표현 가능한 케이스가 존재
- **환경:** simplysm 모노레포, Angular 21, TypeScript 5.9, sd-cli 빌드 시스템
- **전제조건:** Angular 21 환경에서 `linkedSignal()`, `resource()` API 사용 가능
- **기술적 제약:** 기존 API 동작(양방향 바인딩, 하위 클래스 호환성)을 깨뜨리지 않아야 함
- **참조 자료:**
  - angular-cli MCP의 best practices 가이드 (Angular 21 공식 코딩 표준 확인 목적)
  - 각 대상 파일의 현재 소스코드 (현행 패턴 및 사용처 확인 목적)

## Impact Mapping

- **Goal:** effect 내 signal set 패턴을 제거하고 선언적 API로 전환하여 코드 가독성 및 유지보수성 향상
  - **Actor:** simplysm 라이브러리 개발자/유지보수자
    - **Impact:** 상태 동기화 로직을 선언적으로 이해하고 수정한다
      - **Deliverable:** 6개 파일의 패턴을 Angular 21 최신 API로 리팩토링

## Feature Breakdown

### Epic 1. Angular 21 API 현대화

#### [x] Feature 1.1 Angular 21 최신 API 리팩토링 → [상세](./1.1-angular21-api-refactoring.md)

**의존성:** 없음

**범위:**

- `useDataSheetFilterManager.ts:11-18` — `signal()` + `effect()` → `linkedSignal()` 전환 (`filter`, `lastFilter` 2개 signal)
- `sd-sheet-config.modal.ts:170-175` — `signal(undefined)` + `computed(edit ?? initial)` → `linkedSignal()` 전환 (`_editItems` + `_items` → `_items` 1개)
- `sd-numpad.control.ts:123,135-150` — `signal()` + 양방향 동기화 effect 2개 → `linkedSignal()` + effect 1개로 축소 (`text` signal)
- `sd-select.control.ts:218,231-253` — 사이드이펙트 없는 `signal()` + `effect()` → `computed()` 전환 (`_flatItems`)
- `sd-gap.control.ts:46-62` — `effect()` + `ElementRef` 직접 조작 → `computed()` + `host` 스타일 바인딩 전환 (`display` 스타일)
- `sd-data-select-button.control.ts:75-92` — `effect()` + `queueMicrotask()` + async → `resource()` 전환 (`selectedItems` 로딩)

**경계:**

- 각 파일의 기존 public API(input/output/model 시그니처)는 변경하지 않음
- `resource()` 전환 시 abstract `load()` 메서드의 하위 클래스(`SdSharedDataSelectButtonControl` 등) 호환성 검증 필요 — 호환 불가 시 해당 건만 제외

**근거:**

- angular-cli MCP best practices: "Use signals for state management", "Use `computed()` for derived state"
- `linkedSignal()`: effect 내 signal set은 Angular 팀이 권장하지 않는 패턴. linkedSignal은 source 변경 시 자동 재계산 + 로컬 쓰기 가능
- `computed()`: 사이드이펙트 없는 순수 파생값은 effect가 아닌 computed가 적합
- `resource()`: effect + queueMicrotask + async 패턴을 선언적 비동기 로딩으로 대체

## 제외 사항

- 없음 (분석에서 도출된 6건 전체가 범위에 포함)
