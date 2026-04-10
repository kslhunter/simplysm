# WBS: Angular 테마 선택기 컴포넌트

## 프로젝트 개요

- **배경:** 사용자가 폰트 크기와 다크/라이트 모드를 자신의 환경에 맞게 조절할 수 있는 테마 선택기가 필요
- **환경:** simplysm 모노레포의 `packages/angular` 패키지. 기존 `SdThemeProvider` 서비스(dark mode signal + localStorage 동기화)와 SCSS CSS 변수 기반 테마 시스템이 구축되어 있음
- **전제조건:** 기존 `SdThemeProvider`, `sd-dropdown`/`sd-dropdown-popup`, `sd-switch` 컴포넌트 활용
- **기술적 제약:** Chrome 61+ 호환, Angular 21 signal 기반, ViewEncapsulation.None + OnPush 패턴
- **참조 자료:**
  - `packages/angular/src/core/providers/sd-theme-provider.ts` — 기존 dark mode 상태 관리 (WritableSignal, body 클래스 토글)
  - `packages/angular/src/core/providers/provide-sd-angular.ts` — dark mode localStorage 동기화 로직
  - `packages/angular/src/ui/overlay/dropdown/sd-dropdown.ts` — dropdown 버튼 패턴
  - `packages/angular/src/ui/overlay/dropdown/sd-dropdown-popup.ts` — dropdown popup 패턴
  - `packages/angular/src/ui/form/checkbox/sd-switch.ts` — switch 토글 패턴
  - `packages/angular/scss/commons/_variables.scss` — CSS 변수 정의 (font-size 등)

## Impact Mapping

- **Goal:** 사용자가 화면 가독성과 시각적 편의를 자신의 환경에 맞게 조절할 수 있도록 한다
  - **Actor:** 웹 애플리케이션 최종 사용자
    - **Impact:** 시력·환경에 맞게 화면을 개인화하여 편안하게 사용한다
      - **Deliverable:** 테마 선택기 컴포넌트 (폰트 크기 조절 + 다크/라이트 전환)

## Feature Breakdown

### Epic 1. 테마 선택기

#### [x] Feature 1.1 폰트 크기 상태 관리

**Feature 문서:** [1.1-font-size-state-management.md](./1.1-font-size-state-management.md)

**의존성:** 없음

**범위:**

- `SdThemeProvider`에 폰트 크기 상태 추가 (WritableSignal, 기본값 16)
- 폰트 크기 프리셋 값: 12, 14, 16(기본), 20, 24, 28 (px)
- html root `font-size`를 signal 값에 연동하여 변경 (effect로 `document.documentElement.style.fontSize` 설정)
- 폰트 크기 설정을 localStorage에 저장/복원 (dark mode와 동일 패턴, `provideSdAngular.ts`에서 처리)
- 증가(+)/감소(-) 시 프리셋 배열의 다음/이전 값으로 이동
- 최소값(12px) 이하/최대값(28px) 이상으로는 변경 불가

**경계:**

- UI 컴포넌트는 Feature 1.2에서 다룸
- 프리셋 값 목록의 커스터마이징은 이 Feature에서 다루지 않음

**근거:**

- 사용자 답변: "html root font-size 조정" 선택
- 사용자 답변: "12, 14, 16, 20, 24, 28 이렇게 6가지면 충분"
- 기존 패턴: `SdThemeProvider.dark` + `provideSdAngular.ts`의 localStorage 동기화

**설계 결정 요약** (상세: Feature 문서 참조):

- D1: `fontSizePresets`를 SdThemeProvider의 readonly 프로퍼티로 노출
- D2: `increaseFontSize()`/`decreaseFontSize()` 메서드를 SdThemeProvider에 배치
- D3: localStorage 키는 `"sd-theme-font-size"`
- D4: 프리셋 외 값 직접 set 시 검증 없음 (기존 dark signal 패턴과 동일)

#### [x] Feature 1.2 테마 선택기 UI 컴포넌트

**Feature 문서:** [1.2-theme-selector-ui.md](./1.2-theme-selector-ui.md)

**의존성:** Feature 1.1

**범위:**

- `sd-theme-selector` 독립 컴포넌트 생성
- 드롭다운 버튼: 아이콘만 표시 (tablerPalette — 코드베이스가 @ng-icons/tabler-icons 사용)
- 드롭다운 팝업 내용:
  - 폰트 크기 영역: "글자 크기" 레이블 + [-] 현재값(px) [+] 스테퍼 UI
  - 다크 모드 영역: "다크 모드" 레이블 + sd-switch 토글
- 기존 `sd-dropdown`/`sd-dropdown-popup` 패턴 활용
- 기존 `sd-switch` 컴포넌트를 dark/light 전환에 사용
- `SdThemeProvider`의 dark signal과 폰트 크기 signal을 바인딩

**경계:**

- 상태 관리 로직(localStorage 등)은 Feature 1.1에서 처리됨
- topbar 등 특정 위치에의 배치는 소비 프로젝트 영역

**근거:**

- 사용자 답변: "독립 컴포넌트" 선택
- 사용자 답변: "아이콘만 (fa-palette 등)" 선택 → tablerPalette로 매핑 (코드베이스 패턴)
- 사용자 답변: "테마 선택기에 직접 구현" 선택 (별도 sd-sizing 컴포넌트 없이)
- 사용자 제시 레이아웃: `[-] 16px [+]` 스테퍼 + 다크 모드 스위치

**설계 결정 요약** (상세: Feature 문서 참조):

- D1: 파일 위치 `src/ui/theme/sd-theme-selector.ts` (신규 디렉토리)
- D2: 아이콘 `tablerPalette` (tabler-icons)
- D3: 스테퍼 버튼 `sd-button` (theme="link-gray", inline, size="sm")

## 제외 사항

- 색상 테마 선택 — 사용자 명시적 제외 ("폰트+다크만")
- 컴팩트 모드 — 사용자 명시적 제외
- 폰트 크기 프리셋 커스터마이징 — 사용자 요청 없음, 6가지 고정값으로 충분
- 별도 sd-sizing 범용 컴포넌트 — 사용자 선택으로 테마 선택기 내 직접 구현
