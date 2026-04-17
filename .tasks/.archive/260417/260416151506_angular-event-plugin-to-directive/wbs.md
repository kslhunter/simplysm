# WBS: Angular EventManagerPlugin → Directive 전환

## 프로젝트 개요

- **배경:** `@simplysm/angular` 패키지의 커스텀 이벤트(sdResize, sdIntersection, sdRefreshCommand, sdSaveCommand, sdInsertCommand)가 Angular 내부 API인 `EventManagerPlugin`으로 구현되어 있음. 이는 공식 public API가 아니라 향후 변경/제거 리스크가 있고, 네이티브 이벤트 옵션 확장과 성격이 다른 기능이 `SdEvents` directive에 혼재되어 단일 책임 원칙을 위반함
- **환경:** `packages/angular/` 패키지 내부 리팩토링. 소비 프로젝트의 템플릿 바인딩 `(sdResize)="..."` 등의 사용 패턴은 그대로 유지해야 함
- **전제조건:** 없음
- **기술적 제약:** Angular 21 standalone directive, signal-based output, OnPush change detection
- **참조 자료:**
  - `packages/angular/src/core/events/sd-events.ts` — 현재 SdEvents directive (커스텀 이벤트 output 선언)
  - `packages/angular/src/core/events/sd-resize-event.plugin.ts` — ResizeObserver 기반 plugin
  - `packages/angular/src/core/events/sd-intersection-event.plugin.ts` — IntersectionObserver 기반 plugin
  - `packages/angular/src/core/events/sd-option-event.plugin.ts` — .capture/.passive/.once 이벤트 수식어 plugin (유지 대상)
  - `packages/angular/src/core/commands/sd-refresh-command-event.plugin.ts` — Ctrl+Alt+L 커맨드 plugin
  - `packages/angular/src/core/commands/sd-save-command-event.plugin.ts` — Ctrl+S 커맨드 plugin
  - `packages/angular/src/core/commands/sd-insert-command-event.plugin.ts` — Ctrl+Insert 커맨드 plugin
  - `packages/angular/src/core/commands/findTopOpenModalEl.ts` — 커맨드 모달 스코핑 유틸
  - `packages/angular/src/core/provideSdAngular.ts:112-117` — EVENT_MANAGER_PLUGINS 등록부

## Impact Mapping

- **Goal:** Angular 내부 API(EventManagerPlugin) 의존성을 제거하여 유지보수 안정성 확보
  - **Actor:** 라이브러리 개발자
    - **Impact:** 공식 public API만 사용하여 Angular 버전 업그레이드 시 breaking change 리스크 감소
      - **Deliverable:** 커스텀 이벤트 plugin을 standalone directive로 전환

## Feature Breakdown

### Epic 1. EventManagerPlugin → Directive 전환

#### [x] Feature 1.1 SdResizeDirective 전환

**의존성:** 없음

**범위:**

- `SdResizeDirective` 생성: selector `[sdResize]`, `sdResize` output, ResizeObserver 로직 (debounce via requestAnimationFrame, prevWidth/prevHeight 변화 추적)
- 템플릿 사용처 마이그레이션: directive import 추가
  - `packages/angular/src/data/sheet/sd-sheet.ts` — `<table (sdResize)>`, feature cell `(sdResize)`
  - `packages/angular/src/controls/dropdown/sd-dropdown-popup.ts` — `<div (sdResize)>`
  - `packages/angular/src/controls/collapse/sd-collapse.ts` — `(sdResize)`
  - `packages/angular/src/data/kanban/sd-kanban.ts` — `(sdResize)`
  - `packages/angular/src/core/modal/sd-modal.ts` — 다이얼로그 내부 `(sdResize)`
- 호스트 바인딩 사용처 마이그레이션: `hostDirectives`를 사용하거나 컴포넌트 내부에서 직접 ResizeObserver 설정
  - `packages/angular/src/layout/dock/sd-dock.ts` — `"(sdResize)": "onHostResize($event)"`
  - `packages/angular/src/features/visual/sd-echarts.ts` — `"(sdResize)": "onHostResize()"`
  - `packages/angular/src/core/modal/sd-modal.ts` — `"(sdResize)": "onHostResize($event)"`
- `SdResizeEventPlugin` 파일 제거
- `SdEvents`에서 `[sdResize]` selector 및 `sdResize` output 제거
- `provideSdAngular()`에서 `SdResizeEventPlugin` 등록 제거

**경계:**

- `SdOptionEventPlugin`(.capture/.passive/.once)은 이 Feature에서 다루지 않음
- `SdIntersectionEventPlugin`, 커맨드 plugin은 이 Feature에서 다루지 않음

**근거:**

- 사용자 명시: "sdResize는 하나의 directive"
- 사용처: `Grep` 결과 7개 컴포넌트에서 `(sdResize)` 사용 확인

#### [x] Feature 1.2 SdIntersectionDirective 전환

**의존성:** Feature 1.1 (공유 파일: `provideSdAngular.ts`)

**범위:**

- `SdIntersectionDirective` 생성: selector `[sdIntersection]`, `sdIntersection` output, IntersectionObserver 로직
- `SdIntersectionEventPlugin` 파일 제거
- `provideSdAngular()`에서 `SdIntersectionEventPlugin` 등록 제거

**경계:**

- 현재 사용처 없음 — 사용처 마이그레이션 불필요
- `SdEvents`에 `sdIntersection` selector/output이 현재 없으므로 SdEvents 수정 불필요

**근거:**

- 사용자 명시: "sd-intersection-event.plugin.ts도 생각해봐야 할텐데" → "directive로 전환해야지"
- `Grep` 결과 `(sdIntersection)` 사용처 0건

#### [x] Feature 1.3 SdCommandDirective 전환

**의존성:** Feature 1.1 (공유 파일: `SdEvents`, `provideSdAngular.ts`)

**범위:**

- `SdCommandDirective` 생성: selector `[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]`, 3개 output, document keydown 리스너 + `shouldProcessCommandEvent()` 모달 스코핑 로직
- 호스트 바인딩 사용처 마이그레이션: `hostDirectives` 사용 (Feature 1.1 SdResizeDirective 패턴과 동일)
  - `packages/angular/src/data/data-detail/sd-data-detail.ts` — `"(sdRefreshCommand)"`, `"(sdSaveCommand)"`
  - `packages/angular/src/data/data-sheet/sd-data-sheet.ts` — `"(sdRefreshCommand)"`, `"(sdSaveCommand)"`
- `index.ts` export 업데이트: 3개 plugin export 제거, `SdCommandDirective` export 추가
- 3개 커맨드 plugin 파일 제거
- `SdEvents`에서 `[sdRefreshCommand], [sdSaveCommand], [sdInsertCommand]` selector 및 3개 output 제거
- `provideSdAngular()`에서 3개 커맨드 plugin 등록 제거

**경계:**

- `findTopOpenModalEl.ts`와 `shouldProcessCommandEvent()`는 유지 (SdCommandDirective에서 사용)
- `sdInsertCommand`는 현재 사용처 없으나, directive output으로는 유지

**근거:**

- 사용자 명시: "sdRefreshCommand/sdSaveCommand/sdInsertCommand를 묶어 하나의 directive"
- `Grep` 결과 2개 컴포넌트에서 `(sdRefreshCommand)`, `(sdSaveCommand)` 사용 확인

## 제외 사항

- `SdOptionEventPlugin` 전환 — 사유: .capture/.passive/.once는 Angular 이벤트 바인딩 시스템에 끼어드는 역할이므로 EventManagerPlugin이 적합. 사용자도 유지로 합의
- `findTopOpenModalEl.ts` 리팩토링 — 사유: 기존 유틸 함수를 그대로 활용. 범위 초과
