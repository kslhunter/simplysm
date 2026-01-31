---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-02-01'
epicCount: 11
storyCount: 40
frCoverage: '40/40 (100%)'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
project_name: '@simplysm/solid'
user_name: '김석래'
date: '2026-02-01'
---

# @simplysm/solid - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for @simplysm/solid, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Form Controls (FR1-FR17):**
- FR1: Button 컴포넌트 - 클릭 가능한 버튼 렌더링
- FR2: Anchor 컴포넌트 - 링크 스타일 버튼 렌더링
- FR3: TextField 컴포넌트 - 텍스트 입력
- FR4: Textarea 컴포넌트 - 여러 줄 텍스트 입력
- FR5: Select 컴포넌트 - 옵션 목록 선택
- FR6: Checkbox 컴포넌트 - 불린 선택
- FR7: CheckboxGroup 컴포넌트 - 다중 선택
- FR8: Switch 컴포넌트 - 토글 선택
- FR9: Radio 컴포넌트 - 단일 선택
- FR10: DateField 컴포넌트 - 날짜 입력
- FR11: TimeField 컴포넌트 - 시간 입력
- FR12: DateRange 컴포넌트 - 날짜 범위 입력
- FR13: NumberField 컴포넌트 - 숫자 입력
- FR14: Range(Slider) 컴포넌트 - 범위 값 입력
- FR15: ColorField 컴포넌트 - 색상 선택
- FR16: 폼 컴포넌트 유효성 검사 상태 표시
- FR17: Form 컴포넌트 - 폼 컨트롤 그룹화

**Layout (FR18-FR19):**
- FR18: Dock 컴포넌트 - 고정/유동 영역 배치
- FR19: Card 컴포넌트 - 카드 형태 콘텐츠 표시

**Navigation (FR20-FR24):**
- FR20: Tab 컴포넌트 - 탭 기반 콘텐츠 전환
- FR21: Sidebar 컴포넌트 - 사이드 네비게이션
- FR22: Topbar 컴포넌트 - 상단 네비게이션
- FR23: Pagination 컴포넌트 - 페이지 네비게이션
- FR24: Collapse 컴포넌트 - 접기/펼치기 UI

**Data Display (FR25-FR29):**
- FR25: List 컴포넌트 - 항목 목록 표시
- FR26: Sheet 컴포넌트 - 테이블 형태 데이터 표시
- FR27: Sheet 열 정렬 기능
- FR28: Sheet 행 선택 기능
- FR29: Sheet 필터링 기능

**Overlay (FR30-FR33):**
- FR30: Modal 컴포넌트 - 모달 대화상자
- FR31: Toast 컴포넌트 - 알림 메시지
- FR32: Dropdown 컴포넌트 - 드롭다운 메뉴
- FR33: Busy 상태 표시 - 로딩 중 표시

**Visual Feedback (FR34-FR36):**
- FR34: Progress 컴포넌트 - 진행 상태 표시
- FR35: Note 컴포넌트 - 안내 메시지 표시
- FR36: Label 컴포넌트 - 레이블 표시

**Configuration (FR37-FR39):**
- FR37: ConfigProvider - 앱 전역 설정
- FR38: ThemeProvider - 테마 설정
- FR39: vanilla-extract 스타일 시스템 일관성

**Accessibility (FR40):**
- FR40: 모든 컴포넌트 키보드 네비게이션 지원

### NonFunctional Requirements

- NFR1: 각 컴포넌트 초기 렌더링 16ms 이내 (60fps)
- NFR2: Sheet 가상 스크롤 1,000행+ 처리
- NFR3: SolidJS 1.9+ 호환
- NFR4: 최신 Chrome, Firefox, Safari, Edge 지원
- NFR5: 기존 @simplysm/solid 컴포넌트와 충돌 없음
- NFR6: 개별 컴포넌트 tree-shaking 가능
- NFR7: 미사용 컴포넌트 번들 제외
- NFR8: 완전한 TypeScript 타입 정의
- NFR9: 각 컴포넌트 독립적 테스트 가능
- NFR10: 기존 solid 패키지 API 패턴 일관성

### Additional Requirements

**From Architecture:**
- 기존 vanilla-extract 스타일 시스템 (atoms, themeVars) 활용
- 기존 solid 패키지 폴더 구조 준수: `components/{category}/{component}.tsx`
- 스타일 파일: `{component}.css.ts` 동일 폴더
- Props 패턴: `interface {Component}Props`
- 상태 관리: createSignal, createEffect (SolidJS 네이티브)
- Busy → Context 기반 전역 상태로 개선

**From UX Design:**
- 520px 반응형 브레이크포인트
- 다크/라이트 테마 지원
- ripple, invalid directive 적용
- 일관된 size 변형 (sm, md, lg)
- 일관된 피드백 패턴 (success, error, warning, info)

### FR Coverage Map

| Epic | 커버하는 FR | 스토리 수 |
|------|-----------|----------|
| Epic 1: 기반 인프라 | FR37, FR38, FR39 | 3 |
| Epic 2: 기본 폼 컨트롤 | FR1, FR2, FR3, FR4, FR6, FR8, FR16 | 7 |
| Epic 3: 레이아웃 구성 | FR18, FR19 | 2 |
| Epic 4: 선택 컨트롤 | FR5, FR7, FR9, FR32 | 4 |
| Epic 5: 날짜/숫자 입력 | FR10, FR11, FR12, FR13, FR14, FR15 | 6 |
| Epic 6: 네비게이션 | FR20, FR21, FR22, FR23, FR24 | 5 |
| Epic 7: 오버레이 | FR30, FR31, FR33 | 3 |
| Epic 8: 시각적 피드백 | FR34, FR35, FR36 | 3 |
| Epic 9: 폼 통합 | FR17, FR40 | 2 |
| Epic 10: 데이터 목록 | FR25 | 1 |
| Epic 11: 데이터 시트 | FR26, FR27, FR28, FR29 | 4 |

**총 FR 커버리지:** 40/40 (100%)

## Epic List

### Epic 1: 기반 인프라 (Foundation Infrastructure)
**Goal:** 개발자가 @simplysm/solid를 설치하고 앱에 테마/설정을 적용할 수 있다
**FR Coverage:** FR37, FR38, FR39
**의존성:** 없음 (첫 번째 에픽)
**완료 기준:** ConfigProvider, ThemeProvider로 앱 감싸기 가능

### Epic 2: 기본 폼 컨트롤 (Basic Form Controls)
**Goal:** 개발자가 기본적인 사용자 입력(텍스트, 버튼, 체크박스)을 받을 수 있다
**FR Coverage:** FR1, FR2, FR3, FR4, FR6, FR8, FR16
**의존성:** Epic 1 (테마 시스템)
**완료 기준:** Button, TextField, Textarea, Checkbox, Switch로 간단한 폼 구성 가능

### Epic 3: 레이아웃 구성 (Layout Composition)
**Goal:** 개발자가 페이지 레이아웃을 구성할 수 있다
**FR Coverage:** FR18, FR19
**의존성:** Epic 1 (테마 시스템)
**완료 기준:** Dock과 Card로 관리자 페이지 기본 레이아웃 구성 가능

### Epic 4: 선택 컨트롤 (Selection Controls)
**Goal:** 개발자가 옵션 목록에서 사용자 선택을 받을 수 있다
**FR Coverage:** FR5, FR7, FR9, FR32
**의존성:** Epic 2 (기본 폼 컨트롤)
**완료 기준:** Select, CheckboxGroup, Radio, Dropdown으로 다양한 선택 UI 구현 가능

### Epic 5: 날짜/숫자 입력 (Date & Number Input)
**Goal:** 개발자가 날짜, 시간, 숫자 등 특수한 입력을 받을 수 있다
**FR Coverage:** FR10, FR11, FR12, FR13, FR14, FR15
**의존성:** Epic 4 (Dropdown 필요)
**완료 기준:** DateField, TimeField, DateRange, NumberField, Range, ColorField 사용 가능

### Epic 6: 네비게이션 (Navigation)
**Goal:** 개발자가 앱 네비게이션 구조를 구현할 수 있다
**FR Coverage:** FR20, FR21, FR22, FR23, FR24
**의존성:** Epic 3 (레이아웃)
**완료 기준:** Tab, Sidebar, Topbar, Pagination, Collapse로 완전한 네비게이션 구현 가능

### Epic 7: 오버레이 (Overlay)
**Goal:** 개발자가 모달, 토스트 등 오버레이 UI를 표시할 수 있다
**FR Coverage:** FR30, FR31, FR33
**의존성:** Epic 1 (테마 시스템)
**완료 기준:** Modal, Toast, Busy로 사용자 피드백 및 대화상자 표시 가능

### Epic 8: 시각적 피드백 (Visual Feedback)
**Goal:** 개발자가 진행 상태, 안내 메시지 등 시각적 피드백을 표시할 수 있다
**FR Coverage:** FR34, FR35, FR36
**의존성:** Epic 1 (테마 시스템)
**완료 기준:** Progress, Note, Label로 다양한 시각적 피드백 제공 가능

### Epic 9: 폼 통합 (Form Integration)
**Goal:** 개발자가 폼 컨트롤들을 그룹화하고 접근성을 갖춘 완전한 폼을 구성할 수 있다
**FR Coverage:** FR17, FR40
**의존성:** Epic 2, Epic 4, Epic 5 (모든 폼 컨트롤)
**완료 기준:** Form 컴포넌트로 유효성 검사, 키보드 네비게이션이 완비된 폼 구성 가능

### Epic 10: 데이터 목록 (Data List)
**Goal:** 개발자가 항목 목록을 표시할 수 있다
**FR Coverage:** FR25
**의존성:** Epic 1 (테마 시스템)
**완료 기준:** List 컴포넌트로 항목 목록 표시 가능

### Epic 11: 데이터 시트 (Data Sheet)
**Goal:** 개발자가 테이블 형태의 대용량 데이터를 표시하고 조작할 수 있다
**FR Coverage:** FR26, FR27, FR28, FR29
**의존성:** Epic 6 (Pagination), Epic 2 (Checkbox)
**완료 기준:** Sheet 컴포넌트로 정렬/필터/선택/페이지네이션 완비된 데이터 테이블 구현 가능

---

## Epic 1: 기반 인프라 (Foundation Infrastructure)

개발자가 @simplysm/solid를 설치하고 앱에 테마/설정을 적용할 수 있다.

### Story 1.1: ConfigProvider 구현

As a 개발자,
I want ConfigProvider로 앱 전역 설정을 제공할 수 있기를,
So that 모든 컴포넌트가 일관된 설정을 사용할 수 있다.

**Acceptance Criteria:**

**Given** @simplysm/solid가 설치된 SolidJS 프로젝트
**When** ConfigProvider로 앱을 감싸고 설정을 전달
**Then** 하위 컴포넌트에서 useConfig()로 설정 접근 가능
**And** TypeScript 타입이 완전히 정의됨

### Story 1.2: ThemeProvider 구현

As a 개발자,
I want ThemeProvider로 다크/라이트 테마를 설정할 수 있기를,
So that 앱 전체에 일관된 테마가 적용된다.

**Acceptance Criteria:**

**Given** ConfigProvider가 적용된 앱
**When** ThemeProvider로 감싸고 theme="dark" 또는 "light" 설정
**Then** themeVars CSS 변수가 적용됨
**And** 테마 전환 시 모든 컴포넌트 스타일이 즉시 변경됨

### Story 1.3: 스타일 시스템 통합 검증

As a 개발자,
I want vanilla-extract 스타일 시스템이 모든 컴포넌트에 일관되게 동작하기를,
So that 테마와 디자인 토큰이 일관되게 적용된다.

**Acceptance Criteria:**

**Given** ThemeProvider가 적용된 앱
**When** 모든 컴포넌트를 렌더링
**Then** atoms, themeVars가 일관되게 적용됨
**And** CSS 변수 기반 테마 전환이 동작함

---

## Epic 2: 기본 폼 컨트롤 (Basic Form Controls)

개발자가 기본적인 사용자 입력(텍스트, 버튼, 체크박스)을 받을 수 있다.

### Story 2.1: Button 컴포넌트 마이그레이션

As a 개발자,
I want Button 컴포넌트를 사용하여 클릭 가능한 버튼을 렌더링할 수 있기를,
So that 사용자 액션을 받을 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Button 스펙
**When** SolidJS Button 컴포넌트 구현
**Then** theme (primary/secondary/danger), size (sm/md/lg), disabled 지원
**And** ripple directive 적용, onClick 핸들러 동작

### Story 2.2: Anchor 컴포넌트 마이그레이션

As a 개발자,
I want Anchor 컴포넌트를 사용하여 링크 스타일 버튼을 렌더링할 수 있기를,
So that 링크처럼 보이는 버튼을 만들 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Anchor 스펙
**When** SolidJS Anchor 컴포넌트 구현
**Then** href 또는 onClick 지원, 스타일은 링크처럼 표시
**And** disabled 상태 지원

### Story 2.3: TextField 컴포넌트 마이그레이션

As a 개발자,
I want TextField 컴포넌트를 사용하여 텍스트 입력을 받을 수 있기를,
So that 사용자 텍스트 입력을 처리할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 TextField 스펙
**When** SolidJS TextField 컴포넌트 구현
**Then** value/onChange, placeholder, disabled, type 지원
**And** invalid directive 적용, 포커스 스타일 동작

### Story 2.4: Textarea 컴포넌트 마이그레이션

As a 개발자,
I want Textarea 컴포넌트를 사용하여 여러 줄 텍스트 입력을 받을 수 있기를,
So that 긴 텍스트 입력을 처리할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Textarea 스펙
**When** SolidJS Textarea 컴포넌트 구현
**Then** value/onChange, rows, disabled 지원
**And** invalid directive 적용, 자동 높이 조절 옵션

### Story 2.5: Checkbox 컴포넌트 마이그레이션

As a 개발자,
I want Checkbox 컴포넌트를 사용하여 불린 선택을 받을 수 있기를,
So that 예/아니오 선택을 처리할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Checkbox 스펙
**When** SolidJS Checkbox 컴포넌트 구현
**Then** checked/onChange, disabled 지원
**And** 라벨 클릭 시 토글, indeterminate 상태 지원

### Story 2.6: Switch 컴포넌트 마이그레이션

As a 개발자,
I want Switch 컴포넌트를 사용하여 토글 선택을 받을 수 있기를,
So that 온/오프 선택을 시각적으로 표시할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Switch 스펙
**When** SolidJS Switch 컴포넌트 구현
**Then** checked/onChange, disabled 지원
**And** 애니메이션 트랜지션, 라벨 지원

### Story 2.7: 유효성 검사 스타일 통합

As a 개발자,
I want 폼 컴포넌트에 유효성 검사 상태를 표시할 수 있기를,
So that 사용자에게 입력 오류를 알릴 수 있다.

**Acceptance Criteria:**

**Given** TextField, Textarea, Checkbox, Switch 컴포넌트
**When** invalid prop을 true로 설정
**Then** 빨간 테두리 및 에러 스타일 적용
**And** 에러 메시지 표시 영역 제공

---

## Epic 3: 레이아웃 구성 (Layout Composition)

개발자가 페이지 레이아웃을 구성할 수 있다.

### Story 3.1: Dock 컴포넌트 마이그레이션

As a 개발자,
I want Dock 컴포넌트를 사용하여 고정/유동 영역을 배치할 수 있기를,
So that 관리자 페이지 레이아웃을 구성할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Dock 스펙
**When** SolidJS Dock 컴포넌트 구현
**Then** top/left/right/bottom 고정 영역 + fill 유동 영역 지원
**And** 중첩 가능, 반응형 지원

### Story 3.2: Card 컴포넌트 마이그레이션

As a 개발자,
I want Card 컴포넌트를 사용하여 콘텐츠를 카드 형태로 표시할 수 있기를,
So that 콘텐츠를 시각적으로 그룹화할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Card 스펙
**When** SolidJS Card 컴포넌트 구현
**Then** 헤더, 바디, 푸터 영역 지원
**And** elevation/shadow 스타일, padding 옵션

---

## Epic 4: 선택 컨트롤 (Selection Controls)

개발자가 옵션 목록에서 사용자 선택을 받을 수 있다.

### Story 4.1: Dropdown 컴포넌트 마이그레이션

As a 개발자,
I want Dropdown 컴포넌트를 사용하여 드롭다운 메뉴를 표시할 수 있기를,
So that 클릭 시 옵션 목록을 보여줄 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Dropdown 스펙
**When** SolidJS Dropdown 컴포넌트 구현
**Then** trigger 클릭 시 드롭다운 열림, 외부 클릭 시 닫힘
**And** Portal 기반 렌더링, 위치 자동 조정

### Story 4.2: Select 컴포넌트 마이그레이션

As a 개발자,
I want Select 컴포넌트를 사용하여 옵션 목록에서 선택을 받을 수 있기를,
So that 드롭다운 선택 UI를 제공할 수 있다.

**Acceptance Criteria:**

**Given** Dropdown 컴포넌트
**When** SolidJS Select 컴포넌트 구현
**Then** value/onChange, options, placeholder 지원
**And** 검색 필터, multiple 선택 옵션

### Story 4.3: CheckboxGroup 컴포넌트 마이그레이션

As a 개발자,
I want CheckboxGroup 컴포넌트를 사용하여 다중 선택을 받을 수 있기를,
So that 여러 옵션을 동시에 선택할 수 있다.

**Acceptance Criteria:**

**Given** Checkbox 컴포넌트
**When** SolidJS CheckboxGroup 컴포넌트 구현
**Then** value/onChange (배열), options 지원
**And** 가로/세로 배치 옵션

### Story 4.4: Radio 컴포넌트 마이그레이션

As a 개발자,
I want Radio 컴포넌트를 사용하여 단일 선택을 받을 수 있기를,
So that 여러 옵션 중 하나만 선택할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Radio 스펙
**When** SolidJS Radio 컴포넌트 구현
**Then** value/onChange, options, name 지원
**And** 가로/세로 배치 옵션

---

## Epic 5: 날짜/숫자 입력 (Date & Number Input)

개발자가 날짜, 시간, 숫자 등 특수한 입력을 받을 수 있다.

### Story 5.1: NumberField 컴포넌트 마이그레이션

As a 개발자,
I want NumberField 컴포넌트를 사용하여 숫자 입력을 받을 수 있기를,
So that 숫자 값을 정확하게 입력받을 수 있다.

**Acceptance Criteria:**

**Given** TextField 컴포넌트 기반
**When** SolidJS NumberField 컴포넌트 구현
**Then** value/onChange (number), min/max, step 지원
**And** 천단위 구분자 옵션, 증감 버튼

### Story 5.2: Range 컴포넌트 마이그레이션

As a 개발자,
I want Range(Slider) 컴포넌트를 사용하여 범위 값을 입력받을 수 있기를,
So that 슬라이더로 값을 선택할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Range 스펙
**When** SolidJS Range 컴포넌트 구현
**Then** value/onChange, min/max, step 지원
**And** 현재 값 표시, 마크 표시 옵션

### Story 5.3: DateField 컴포넌트 마이그레이션

As a 개발자,
I want DateField 컴포넌트를 사용하여 날짜 입력을 받을 수 있기를,
So that 캘린더에서 날짜를 선택할 수 있다.

**Acceptance Criteria:**

**Given** Dropdown 컴포넌트
**When** SolidJS DateField 컴포넌트 구현
**Then** value/onChange (DateTime), format 지원
**And** 캘린더 피커, 수동 입력 가능

### Story 5.4: TimeField 컴포넌트 마이그레이션

As a 개발자,
I want TimeField 컴포넌트를 사용하여 시간 입력을 받을 수 있기를,
So that 시간 값을 선택할 수 있다.

**Acceptance Criteria:**

**Given** Dropdown 컴포넌트
**When** SolidJS TimeField 컴포넌트 구현
**Then** value/onChange (Time), format 지원
**And** 시간 피커, 수동 입력 가능

### Story 5.5: DateRange 컴포넌트 마이그레이션

As a 개발자,
I want DateRange 컴포넌트를 사용하여 날짜 범위 입력을 받을 수 있기를,
So that 시작일/종료일을 함께 선택할 수 있다.

**Acceptance Criteria:**

**Given** DateField 컴포넌트
**When** SolidJS DateRange 컴포넌트 구현
**Then** from/to value/onChange 지원
**And** 범위 선택 캘린더 UI

### Story 5.6: ColorField 컴포넌트 마이그레이션

As a 개발자,
I want ColorField 컴포넌트를 사용하여 색상 선택을 받을 수 있기를,
So that 색상 값을 선택할 수 있다.

**Acceptance Criteria:**

**Given** Dropdown 컴포넌트
**When** SolidJS ColorField 컴포넌트 구현
**Then** value/onChange (hex string), 팔레트 지원
**And** 색상 피커 UI, 수동 입력 가능

---

## Epic 6: 네비게이션 (Navigation)

개발자가 앱 네비게이션 구조를 구현할 수 있다.

### Story 6.1: Tab 컴포넌트 마이그레이션

As a 개발자,
I want Tab 컴포넌트를 사용하여 탭 기반 콘텐츠 전환을 구현할 수 있기를,
So that 여러 콘텐츠를 탭으로 전환할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Tab 스펙
**When** SolidJS Tab 컴포넌트 구현
**Then** TabList, TabPanel 구조, activeTab/onTabChange 지원
**And** 키보드 네비게이션 (화살표 키)

### Story 6.2: Sidebar 컴포넌트 마이그레이션

As a 개발자,
I want Sidebar 컴포넌트를 사용하여 사이드 네비게이션을 구현할 수 있기를,
So that 앱 메뉴를 사이드바에 표시할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Sidebar 스펙
**When** SolidJS Sidebar 컴포넌트 구현
**Then** 아이콘 + 텍스트 메뉴, 접힘/펼침 상태 지원
**And** 반응형 (모바일에서 오버레이)

### Story 6.3: Topbar 컴포넌트 마이그레이션

As a 개발자,
I want Topbar 컴포넌트를 사용하여 상단 네비게이션을 구현할 수 있기를,
So that 앱 헤더를 표시할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Topbar 스펙
**When** SolidJS Topbar 컴포넌트 구현
**Then** 로고, 메뉴, 사용자 영역 슬롯 지원
**And** 반응형 레이아웃

### Story 6.4: Pagination 컴포넌트 마이그레이션

As a 개발자,
I want Pagination 컴포넌트를 사용하여 페이지 네비게이션을 구현할 수 있기를,
So that 페이지 이동을 제공할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Pagination 스펙
**When** SolidJS Pagination 컴포넌트 구현
**Then** currentPage/onChange, totalPages, pageSize 지원
**And** 이전/다음, 페이지 번호 표시

### Story 6.5: Collapse 컴포넌트 마이그레이션

As a 개발자,
I want Collapse 컴포넌트를 사용하여 접기/펼치기 UI를 구현할 수 있기를,
So that 콘텐츠를 접었다 펼 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Collapse 스펙
**When** SolidJS Collapse 컴포넌트 구현
**Then** open/onOpenChange, 헤더/콘텐츠 영역 지원
**And** 애니메이션 트랜지션

---

## Epic 7: 오버레이 (Overlay)

개발자가 모달, 토스트 등 오버레이 UI를 표시할 수 있다.

### Story 7.1: Modal 컴포넌트 마이그레이션

As a 개발자,
I want Modal 컴포넌트를 사용하여 모달 대화상자를 표시할 수 있기를,
So that 사용자에게 중요한 정보나 입력을 받을 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Modal 스펙
**When** SolidJS Modal 컴포넌트 구현
**Then** open/onOpenChange, 헤더/바디/푸터 영역 지원
**And** 배경 딤, ESC 닫기, 외부 클릭 닫기 옵션

### Story 7.2: Toast 컴포넌트 마이그레이션

As a 개발자,
I want Toast 컴포넌트를 사용하여 알림 메시지를 표시할 수 있기를,
So that 사용자에게 피드백을 줄 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Toast 스펙
**When** SolidJS Toast 컴포넌트 구현
**Then** theme (success/error/warning/info), 자동 dismiss 지원
**And** 스택 표시, 위치 설정 옵션

### Story 7.3: Busy 상태 관리 구현

As a 개발자,
I want Busy 상태를 표시하여 로딩 중임을 나타낼 수 있기를,
So that 사용자에게 작업 진행 중임을 알릴 수 있다.

**Acceptance Criteria:**

**Given** SolidJS Context 패턴
**When** BusyContext 및 Busy 컴포넌트 구현
**Then** useBusy() 훅으로 전역 busy 상태 관리
**And** 오버레이 스피너 또는 인라인 표시 옵션

---

## Epic 8: 시각적 피드백 (Visual Feedback)

개발자가 진행 상태, 안내 메시지 등 시각적 피드백을 표시할 수 있다.

### Story 8.1: Progress 컴포넌트 마이그레이션

As a 개발자,
I want Progress 컴포넌트를 사용하여 진행 상태를 표시할 수 있기를,
So that 작업 진행률을 시각적으로 보여줄 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Progress 스펙
**When** SolidJS Progress 컴포넌트 구현
**Then** value (0-100), theme, indeterminate 모드 지원
**And** 바 또는 서클 스타일

### Story 8.2: Note 컴포넌트 마이그레이션

As a 개발자,
I want Note 컴포넌트를 사용하여 안내 메시지를 표시할 수 있기를,
So that 사용자에게 정보를 제공할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Note 스펙
**When** SolidJS Note 컴포넌트 구현
**Then** theme (info/success/warning/danger), 아이콘 지원
**And** 제목/내용 영역

### Story 8.3: Label 컴포넌트 마이그레이션

As a 개발자,
I want Label 컴포넌트를 사용하여 레이블을 표시할 수 있기를,
So that 폼 필드에 레이블을 붙일 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Label 스펙
**When** SolidJS Label 컴포넌트 구현
**Then** for 속성, required 표시 지원
**And** 스타일 일관성

---

## Epic 9: 폼 통합 (Form Integration)

개발자가 폼 컨트롤들을 그룹화하고 접근성을 갖춘 완전한 폼을 구성할 수 있다.

### Story 9.1: Form 컴포넌트 마이그레이션

As a 개발자,
I want Form 컴포넌트를 사용하여 폼 컨트롤들을 그룹화할 수 있기를,
So that 폼 제출을 통합 관리할 수 있다.

**Acceptance Criteria:**

**Given** 모든 폼 컨트롤 컴포넌트
**When** SolidJS Form 컴포넌트 구현
**Then** onSubmit, 유효성 검사 통합 지원
**And** Enter 키 제출, 비활성화 상태 전파

### Story 9.2: 키보드 네비게이션 통합

As a 개발자,
I want 모든 컴포넌트가 키보드 네비게이션을 지원하기를,
So that 접근성 요구사항을 충족할 수 있다.

**Acceptance Criteria:**

**Given** 모든 인터랙티브 컴포넌트
**When** Tab, Enter, Space, 화살표 키 사용
**Then** 적절한 포커스 이동 및 활성화
**And** ARIA 속성 적용

---

## Epic 10: 데이터 목록 (Data List)

개발자가 항목 목록을 표시할 수 있다.

### Story 10.1: List 컴포넌트 마이그레이션

As a 개발자,
I want List 컴포넌트를 사용하여 항목 목록을 표시할 수 있기를,
So that 데이터 항목을 나열할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 List 스펙
**When** SolidJS List 컴포넌트 구현
**Then** items 배열, 항목 렌더 함수 지원
**And** 선택 가능, 클릭 핸들러 지원

---

## Epic 11: 데이터 시트 (Data Sheet)

개발자가 테이블 형태의 대용량 데이터를 표시하고 조작할 수 있다.

### Story 11.1: Sheet 기본 구조 마이그레이션

As a 개발자,
I want Sheet 컴포넌트로 테이블 형태의 데이터를 표시할 수 있기를,
So that 데이터를 행/열로 표시할 수 있다.

**Acceptance Criteria:**

**Given** sd-angular의 Sheet 스펙
**When** SolidJS Sheet 기본 구조 구현
**Then** columns 정의, data 바인딩, 가상 스크롤 지원
**And** 1,000행 이상에서도 60fps 유지

### Story 11.2: Sheet 열 정렬 기능

As a 개발자,
I want Sheet에서 열 정렬 기능을 사용할 수 있기를,
So that 데이터를 정렬해서 볼 수 있다.

**Acceptance Criteria:**

**Given** Sheet 기본 구조
**When** 열 헤더 클릭
**Then** 해당 열 기준 오름차순/내림차순 정렬
**And** 정렬 상태 아이콘 표시

### Story 11.3: Sheet 행 선택 기능

As a 개발자,
I want Sheet에서 행 선택 기능을 사용할 수 있기를,
So that 선택된 행에 대해 작업할 수 있다.

**Acceptance Criteria:**

**Given** Sheet 기본 구조, Checkbox 컴포넌트
**When** 행 체크박스 클릭
**Then** 해당 행 선택/해제, 전체 선택 지원
**And** selectedRows 상태 관리

### Story 11.4: Sheet 필터링 기능

As a 개발자,
I want Sheet에서 필터링 기능을 사용할 수 있기를,
So that 원하는 데이터만 표시할 수 있다.

**Acceptance Criteria:**

**Given** Sheet 기본 구조
**When** 필터 조건 설정
**Then** 조건에 맞는 행만 표시
**And** 필터 상태 표시, 필터 초기화
