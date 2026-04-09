# WBS: sd-modal 컴포넌트 인라인 스타일 추가

## 프로젝트 개요

- **배경:** sd-modal.control.ts에 `styles` 속성이 누락되어 있어 시각적 스타일이 전혀 없음. 동일 overlay 카테고리의 모든 형제 컴포넌트는 인라인 SCSS를 보유.
- **환경:** @simplysm/angular 패키지, Angular 21, ViewEncapsulation.None, 인라인 SCSS 패턴
- **전제조건:** 기존 template 구조(._backdrop, ._dialog, ._header, ._title, ._close-btn, ._content, ._resize-handle) 유지
- **기술적 제약:** CSS 변수 시스템 사용 (--gap-*, --theme-*, --trans-*, --border-*, --z-index-*), SCSS @use로 variables/mixins 참조, Chrome 61+ 호환
- **참조 자료:**
  - `.tasks/260406192618_debug-modal-no-styles/debug.md` — 디버그 분석 결과
  - `packages/angular/src/ui/overlay/modal/sd-modal.control.ts` — 대상 파일
  - `packages/angular/src/ui/overlay/busy/sd-busy-container.control.ts` — 스타일 패턴 참조
  - `packages/angular/src/ui/overlay/dropdown/sd-dropdown-popup.control.ts` — 스타일 패턴 참조
  - `packages/angular/scss/commons/_variables.scss` — z-index: modal: 4000
  - `packages/angular/scss/commons/_mixins.scss` — elevation mixin

## Impact Mapping

- **Goal:** sd-modal 컴포넌트가 다른 overlay 컴포넌트와 동일한 수준의 시각적 완성도를 갖추어, 소비 프로젝트에서 추가 스타일링 없이 사용 가능하게 한다
  - **Actor:** @simplysm/angular 소비 프로젝트 개발자
    - **Impact:** 모달을 열었을 때 별도 CSS 작성 없이 즉시 사용 가능한 UI를 확인한다
      - **Deliverable:** sd-modal.control.ts에 인라인 SCSS styles 추가

## Feature Breakdown

### Epic 1. sd-modal 스타일링

#### [x] Feature 1.1 sd-modal 인라인 SCSS 추가

**의존성:** 없음

**범위:**

- 호스트 요소(sd-modal) 기본 스타일: position fixed, 전체 화면 커버, z-index, display 제어
- ._backdrop 스타일: 반투명 오버레이 배경
- ._dialog 스타일: 중앙 정렬, 배경색, 그림자(elevation), border-radius, max-width/max-height, overflow
- ._header 스타일: flex 레이아웃, 패딩, 하단 보더, 커서(movable시 grab)
- ._title 스타일: flex-grow, font-weight
- ._close-btn 스타일: 버튼 리셋, 호버 효과
- ._content 스타일: 패딩, overflow auto
- ._resize-handle 스타일: 각 방향별 위치, 크기, 커서
- data-sd-open 상태 제어: open일 때만 표시
- data-sd-float 변형: float 모달 스타일 (작은 크기, 우측 하단 등)
- data-sd-fill 변형: 전체 채움 스타일
- data-sd-position 변형: bottom-right, top-right 위치 지정
- 모바일 반응형 처리 (breakpoint-mobile)

**경계:**

- 컨텐츠 모달(sd-confirm-modal, sd-prompt-modal 등)의 내부 스타일은 다루지 않음 (이미 각자 보유)
- 애니메이션/트랜지션 효과는 이 Feature에서 다루지 않음 (기존 template에 없음)
- SdModalProvider의 로직 변경 없음

**근거:**

- 디버그 분석: sd-modal.control.ts에 styles 속성 부재 확인 (debug.md)
- 코드 확인: 형제 컴포넌트(sd-busy-container, sd-dropdown-popup, sd-toast-container) 모두 인라인 SCSS 보유
- template 구조: ._backdrop, ._dialog, ._header, ._title, ._close-btn, ._content, ._resize-handle 클래스가 이미 정의됨

## 제외 사항

- 다크모드 전용 스타일 추가 — CSS 변수 기반이므로 테마 변수가 자동 적용됨 (별도 처리 불필요)
- 애니메이션/트랜지션 — 기존 template에 애니메이션 관련 구조 없음, 요청 범위 밖
