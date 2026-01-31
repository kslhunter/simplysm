---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain-skipped
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
classification:
  projectType: developer_tool
  domain: general
  complexity: medium
  projectContext: brownfield
inputDocuments:
  - docs/index.md
  - docs/architecture.md
  - docs/development-guide.md
  - docs/source-tree-analysis.md
  - docs/api-contracts.md
  - docs/component-inventory.md
  - docs/technology-stack.md
  - .legacy-packages/sd-angular/README.md
documentCounts:
  brief: 0
  research: 0
  brainstorming: 0
  projectDocs: 7
  migrationTarget: 1
workflowType: 'prd'
---

# Product Requirements Document - @simplysm/solid

**Author:** 김석래
**Date:** 2026-02-01

## Executive Summary

### Vision

sd-angular UI 프레임워크를 SolidJS로 완전히 마이그레이션하여 @simplysm/solid 단일 UI 패키지로 통합한다.

### Product Differentiator

- SolidJS의 fine-grained reactivity를 활용한 고성능 UI 컴포넌트
- vanilla-extract 기반 통합 스타일링 시스템
- 기존 sd-angular의 검증된 기능을 현대적 프레임워크로 제공

### Target Users

- SolidJS로 관리자/업무 시스템을 개발하는 개발자
- 테이블, 폼, 모달 등 복잡한 UI가 필요한 프로젝트

### Project Context

- **Type:** Brownfield - 기존 @simplysm/solid 패키지 확장
- **Migration Source:** .legacy-packages/sd-angular
- **Exclusion:** features/data-view

## Success Criteria

### User Success (개발자 경험)

- sd-angular에서 제공하던 모든 UI 기능을 SolidJS에서 동일하게 사용 가능
- 기존 solid 패키지와 일관된 API 스타일 및 prop 네이밍 패턴
- vanilla-extract 기반 통합 스타일링으로 테마 일관성 유지
- 마이그레이션된 컴포넌트와 기존 컴포넌트가 자연스럽게 조합 가능

### Business Success

- sd-angular 패키지 완전 삭제 가능
- @simplysm/solid 단일 UI 패키지로 통합
- Angular 의존성 제거로 프레임워크 단순화

### Technical Success

- 모든 마이그레이션된 컴포넌트가 기존 기능과 동등하게 동작
- vanilla-extract 스타일 시스템 일관성 유지
- 기존 solid 패키지 폴더 구조 패턴 준수
- Core 인프라는 SolidJS 네이티브 기능으로 대체 (createSignal, createEffect, createMemo 등)
- busy → Suspense 또는 Context 기반 전역 상태로 개선

### Measurable Outcomes

- sd-angular의 모든 MVP 컴포넌트가 @simplysm/solid에서 동등한 기능 제공
- 기존 solid 패키지 테스트가 마이그레이션 후에도 통과
- sd-angular 패키지 삭제 후 의존성 오류 없음

## Product Scope

### MVP - 핵심 UI 컴포넌트

**MVP Approach:** Problem-Solving MVP - 개발자가 SolidJS로 관리자 페이지를 빠르게 만들 수 있게 하는 최소 기능 제공

| 순서 | 카테고리 | 컴포넌트 | 비고 |
|------|----------|----------|------|
| 1 | Form (→controls/) | button, anchor, textfield, textarea, select, checkbox, checkbox-group, switch, radio, datefield, timefield, daterange, numberfield, range, colorfield, form | |
| 2 | Layout | dock, card | grid, flex, pane, view는 atoms로 대체 |
| 3 | Navigation (→navigator/) | tab, sidebar, topbar, pagination, collapse | |
| 4 | Data | list | |
| 5 | Overlay | modal, toast, dropdown, busy | busy는 SolidJS 패턴으로 개선 |
| 6 | Visual | progress, note, label | |
| 7 | Data | **sheet** | MVP지만 의존성으로 인해 마지막 구현 |

### Growth Features (Post-MVP)

| 카테고리 | 내용 |
|----------|------|
| Layout | kanban |
| Visual | barcode, calendar, echarts |
| Core 인프라 | SolidJS 네이티브로 대체되지 않는 것만 |
| Features | theme-selector, permission-table, shared-data, address, base |

### Vision (Future)

- sd-angular 완전 삭제 후 @simplysm/solid가 유일한 UI 라이브러리로 자리잡음
- SolidJS 생태계의 관용적 패턴을 완전히 수용한 현대적 UI 프레임워크

### Out of Scope

- features/data-view

### Risk Mitigation

| 리스크 유형 | 리스크 | 완화 전략 |
|-------------|--------|-----------|
| Technical | sheet 복잡도 | 다른 컴포넌트 안정화 후 마지막에 구현 |
| Technical | SolidJS 패턴 학습 곡선 | 기존 solid 패키지 코드 참조 |
| Market | API 호환성 혼란 | 명확한 마이그레이션 가이드 제공 |
| Resource | 예상보다 많은 컴포넌트 수 | MVP 범위 내에서 우선순위 조정 가능 |

## User Journeys

### Journey 1: 신규 개발자의 컴포넌트 사용 여정

**페르소나: 민수 (SolidJS 개발자)**
- SolidJS로 사내 관리자 페이지를 개발 중
- UI 컴포넌트 라이브러리를 찾고 있음
- Angular 경험 없음, SolidJS는 6개월 사용

**Opening Scene (현재 상황):**
민수는 SolidJS로 관리자 대시보드를 만들고 있다. 테이블, 폼, 모달 같은 기본 UI를 직접 만들다 보니 시간이 너무 걸린다.

**Rising Action (발견과 도입):**
1. @simplysm/solid 패키지 발견
2. `pnpm add @simplysm/solid` 설치
3. 문서/데모 확인하며 사용법 파악
4. `ConfigProvider`, `ThemeProvider` 설정
5. 첫 번째 컴포넌트 (`Button`, `TextField`) 사용

**Climax (가치 실현):**
`Sheet` 컴포넌트로 데이터 테이블을 빠르게 구현. 정렬, 필터, 페이지네이션이 기본 제공.

**Resolution (새로운 현실):**
복잡한 폼, 모달, 토스트까지 빠르게 구현. 일관된 디자인으로 완성도 높은 관리자 페이지 완성.

### Journey Requirements Summary

| 여정 단계 | 필요한 기능 |
|-----------|-------------|
| 발견 | 명확한 문서, 데모 페이지 |
| 설치 | 간단한 설치 과정, peer dependency 최소화 |
| 설정 | ConfigProvider/ThemeProvider 쉬운 설정 |
| 첫 사용 | 직관적인 API, 좋은 기본값 |
| 고급 사용 | 컴포넌트 조합, 커스터마이징 |

## Developer Tool Specific Requirements

### Language & Platform Matrix

| 항목 | 지원 |
|------|------|
| 언어 | TypeScript (JavaScript 호환) |
| 프레임워크 | SolidJS 1.9+ |
| 런타임 | 브라우저 (browser target) |
| 스타일링 | vanilla-extract |

### Installation Methods

```bash
# npm
npm install @simplysm/solid

# pnpm
pnpm add @simplysm/solid

# yarn
yarn add @simplysm/solid
```

**Peer Dependencies:** solid-js, @vanilla-extract/css

### API Surface

- **컴포넌트**: Button, TextField, Select, Checkbox, Modal, Toast, Sheet 등
- **Context Providers**: ConfigProvider, ThemeProvider
- **Hooks**: useLocalStorage 등
- **Directives**: ripple, invalid 등

### Documentation & Examples

| 항목 | 제공 방식 |
|------|----------|
| 데모 | solid-demo 패키지 (Vite dev server) |
| 타입 정의 | TypeScript .d.ts 자동 생성 |
| IDE 지원 | TypeScript LSP 활용 |

### Migration Guide (sd-angular → @simplysm/solid)

마이그레이션 완료 후 제공 예정:
- 컴포넌트 매핑 테이블
- API 차이점
- SolidJS 패턴 가이드

## Functional Requirements

### Form Controls (폼 입력)

- **FR1:** 개발자는 Button 컴포넌트를 사용하여 클릭 가능한 버튼을 렌더링할 수 있다
- **FR2:** 개발자는 Anchor 컴포넌트를 사용하여 링크 스타일 버튼을 렌더링할 수 있다
- **FR3:** 개발자는 TextField 컴포넌트를 사용하여 텍스트 입력을 받을 수 있다
- **FR4:** 개발자는 Textarea 컴포넌트를 사용하여 여러 줄 텍스트 입력을 받을 수 있다
- **FR5:** 개발자는 Select 컴포넌트를 사용하여 옵션 목록에서 선택을 받을 수 있다
- **FR6:** 개발자는 Checkbox 컴포넌트를 사용하여 불린 선택을 받을 수 있다
- **FR7:** 개발자는 CheckboxGroup 컴포넌트를 사용하여 다중 선택을 받을 수 있다
- **FR8:** 개발자는 Switch 컴포넌트를 사용하여 토글 선택을 받을 수 있다
- **FR9:** 개발자는 Radio 컴포넌트를 사용하여 단일 선택을 받을 수 있다
- **FR10:** 개발자는 DateField 컴포넌트를 사용하여 날짜 입력을 받을 수 있다
- **FR11:** 개발자는 TimeField 컴포넌트를 사용하여 시간 입력을 받을 수 있다
- **FR12:** 개발자는 DateRange 컴포넌트를 사용하여 날짜 범위 입력을 받을 수 있다
- **FR13:** 개발자는 NumberField 컴포넌트를 사용하여 숫자 입력을 받을 수 있다
- **FR14:** 개발자는 Range(Slider) 컴포넌트를 사용하여 범위 값을 입력받을 수 있다
- **FR15:** 개발자는 ColorField 컴포넌트를 사용하여 색상 선택을 받을 수 있다
- **FR16:** 개발자는 폼 컴포넌트에 유효성 검사 상태를 표시할 수 있다
- **FR17:** 개발자는 Form 컴포넌트를 사용하여 폼 컨트롤들을 그룹화할 수 있다

### Layout (레이아웃)

- **FR18:** 개발자는 Dock 컴포넌트를 사용하여 고정 영역과 유동 영역을 배치할 수 있다
- **FR19:** 개발자는 Card 컴포넌트를 사용하여 콘텐츠를 카드 형태로 표시할 수 있다

### Navigation (네비게이션)

- **FR20:** 개발자는 Tab 컴포넌트를 사용하여 탭 기반 콘텐츠 전환을 구현할 수 있다
- **FR21:** 개발자는 Sidebar 컴포넌트를 사용하여 사이드 네비게이션을 구현할 수 있다
- **FR22:** 개발자는 Topbar 컴포넌트를 사용하여 상단 네비게이션을 구현할 수 있다
- **FR23:** 개발자는 Pagination 컴포넌트를 사용하여 페이지 네비게이션을 구현할 수 있다
- **FR24:** 개발자는 Collapse 컴포넌트를 사용하여 접기/펼치기 UI를 구현할 수 있다

### Data Display (데이터 표시)

- **FR25:** 개발자는 List 컴포넌트를 사용하여 항목 목록을 표시할 수 있다
- **FR26:** 개발자는 Sheet 컴포넌트를 사용하여 테이블 형태의 데이터를 표시할 수 있다
- **FR27:** 개발자는 Sheet에서 열 정렬 기능을 사용할 수 있다
- **FR28:** 개발자는 Sheet에서 행 선택 기능을 사용할 수 있다
- **FR29:** 개발자는 Sheet에서 필터링 기능을 사용할 수 있다

### Overlay (오버레이)

- **FR30:** 개발자는 Modal 컴포넌트를 사용하여 모달 대화상자를 표시할 수 있다
- **FR31:** 개발자는 Toast 컴포넌트를 사용하여 알림 메시지를 표시할 수 있다
- **FR32:** 개발자는 Dropdown 컴포넌트를 사용하여 드롭다운 메뉴를 표시할 수 있다
- **FR33:** 개발자는 Busy 상태를 표시하여 로딩 중임을 나타낼 수 있다

### Visual Feedback (시각적 피드백)

- **FR34:** 개발자는 Progress 컴포넌트를 사용하여 진행 상태를 표시할 수 있다
- **FR35:** 개발자는 Note 컴포넌트를 사용하여 안내 메시지를 표시할 수 있다
- **FR36:** 개발자는 Label 컴포넌트를 사용하여 레이블을 표시할 수 있다

### Configuration (설정)

- **FR37:** 개발자는 ConfigProvider를 사용하여 앱 전역 설정을 제공할 수 있다
- **FR38:** 개발자는 ThemeProvider를 사용하여 테마(라이트/다크)를 설정할 수 있다
- **FR39:** 모든 컴포넌트는 vanilla-extract 기반 스타일 시스템과 일관되게 동작한다

### Accessibility (접근성)

- **FR40:** 모든 컴포넌트는 키보드 네비게이션을 지원한다

## Non-Functional Requirements

### Performance

- **NFR1:** 각 컴포넌트의 초기 렌더링은 16ms 이내에 완료되어야 한다 (60fps 기준)
- **NFR2:** Sheet 컴포넌트는 1,000행 이상의 데이터를 가상 스크롤로 처리할 수 있어야 한다

### Compatibility

- **NFR3:** 모든 컴포넌트는 SolidJS 1.9+ 버전과 호환되어야 한다
- **NFR4:** 모든 컴포넌트는 최신 Chrome, Firefox, Safari, Edge에서 동작해야 한다
- **NFR5:** 기존 @simplysm/solid 컴포넌트와 함께 사용 시 충돌이 없어야 한다

### Bundle Size

- **NFR6:** 개별 컴포넌트는 tree-shaking이 가능해야 한다
- **NFR7:** 사용하지 않는 컴포넌트는 최종 번들에 포함되지 않아야 한다

### Maintainability

- **NFR8:** 모든 컴포넌트는 TypeScript 타입이 완전히 정의되어야 한다
- **NFR9:** 각 컴포넌트는 독립적으로 테스트 가능해야 한다
- **NFR10:** 컴포넌트 API는 기존 solid 패키지의 패턴과 일관되어야 한다
