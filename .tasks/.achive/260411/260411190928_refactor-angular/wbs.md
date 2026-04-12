# WBS: packages/angular 디렉토리 카테고리화 + core/ 기능별 재구조화

## 프로젝트 개요

- **배경:** src/ top-level에 35개 디렉토리가 flat으로 존재하여 아키텍처 계층이 불명확. core/는 종류별(providers/, utils/, directives/) 구조로 Angular 스타일 가이드 권고에 반함. 인프라 디렉토리(modal/, toast/ 등)가 feature와 같은 레벨에 혼재.
- **환경:** @simplysm/angular v14, Angular 21, TypeScript ESM 모노레포. 146 소스 파일, 35 디렉토리.
- **전제조건:** 순환 의존성 없음 확인 완료. 기존 테스트 143개 spec 파일 존재.
- **기술적 제���:** 파일 이동 + import 경로 변경만 수행. 코드 로직 변경 없음. public API(index.ts re-export) 유지.
- **참조 자료:**
  - `.tasks/260411190928_refactor-angular/refactor.md` — 리팩토링 분석 리포트 (STRUCT-001)
  - Angular 스타일 가이드 https://angular.dev/style-guide — "Organize by feature areas", "Avoid type-based directories", "Group closely related files together"

## Impact Mapping

- **Goal:** 디렉토리 구조가 아키텍처 계층을 반영하여, top-level 35개 → 5개 카테고리로 정리하고 관련 파일의 co-location을 확보한다
  - **Actor:** 라이브러리 개발자
    - **Impact:** 코드 탐색 시 계층과 기능 경계를 디렉토리 구조만으로 파악할 수 있다
      - **Deliverable 1:** 5개 카테고리 디렉토리 구조 (core, controls, layout, data, features)
      - **Deliverable 2:** core/ 내부 기능별 재구조화

## Feature Breakdown

의존 방향: `core → controls → layout → data`, `features`는 다양한 계층에 의존.
Feature 순서도 이 의존 방향을 따른다.

### Epic 1. 디렉토리 카테고리화 + core/ 재구조화

#### [x] Feature 1.1 core/ 기능별 재구조화 및 인프라 통합

**의존성:** 없음

**범위:**

- src/modal/, src/toast/, src/busy/, src/print/, src/navigation/ 을 core/ 하위로 이동
- core/ 내부를 종류별 → 기능별로 재구조화:
  - core/routing/ ← sd-router-link, sd-navigate-window.provider, inject*PageCode, injectViewType/Title, setupCanDeactivate, menu-utils
  - core/config/ ← sd-angular-config, sd-local-storage, sd-system-config, sd-system-log, injectSdSystemConfigResource
  - core/app-structure/ ← sd-app-structure.provider, .types, .utils
  - core/selection/ ← useSelectionManager, useSortingManager, useExpandingManager, setupCumulateSelectedKeys
  - core/validation/ ← sd-invalid, setupInvalid
  - core/ripple/ ← sd-ripple, setupRipple
  - core/show-effect/ ← sd-show-effect, setupRevealOnShow
  - core/events/ ← sd-events, sd-resize/intersection/option-event.plugin
  - core/commands/ ← sd-save/refresh/insert-command-event.plugin, findTopOpenModalEl
  - core/error-handler/ ← sd-global-error-handler.plugin
  - core/service-client/ ← sd-service-client-factory.provider
  - core/shared-data/ ← sd-shared-data.provider
  - core/file-dialog/ ← sd-file-dialog.provider
  - core/template/ ← sd-typed-template, sd-item-of-template
  - core/ 루트에 loose file: mark, setSafeStyle, withBusy, setupModelHook, setupBgTheme, injectParent, directive-input-signals, select-modal-output-result, format.pipe, commons, provideSdAngular
- 기존 종류별 디렉토리(providers/, utils/, setups/, directives/, plugins/, pipes/, types/) 삭제
- 모든 import 경로 수정 + index.ts re-export 경로 수정
- 테스트 파일 import 경로 수정 및 디렉토리 구조 변경 (설계 결정 D1: tests/도 src/와 동일하게 기능별 재구조화)

**경계:**

- feature 디렉토리(button/, sheet/ 등)의 내부 구조는 변경하지 않음
- 코드 로직 변경 없음

**근거:**

- Angular 스타일 가이드: "Organize by feature areas", "Avoid type-based directories"
- import 의존성 분석으로 식별된 기능 클러스터 (refactor.md)

#### [x] Feature 1.2 controls/ 카테고리 생성

**의존성:** Feature 1.1

**범위:**

- controls/ 디렉토리 생성
- 다음 디렉토리를 controls/ 하위로 이동:
  - button/, checkbox/, select/, dropdown/, input/, collapse/, form/, tab/, list/, gap/, pagination/
- 이동된 디렉토리의 내부 import 경로 수정 (core/ 참조: `../core/` → `../../core/`)
- controls/ 내 상호 참조는 같은 depth 이동이므로 변경 불필요 (설계 결정 D2)
- 이동된 디렉토리를 참조하는 외부 파일(core/modal/, data-detail/, data-sheet/, sheet/, sidebar/, topbar/, theme/, kanban/, permission-table/, shared-data/, state-preset/, data-select-button/)의 import 경로 수정
- index.ts re-export 경로 수정
- tests/ 디렉토리 이동 + import 경로 수정 (설계 결정 D1 계승)

**경계:**

- 각 디렉토리 내부 파일 구조는 변경하지 않음
- 코드 로직 변경 없음

**설계 결정:**

- D2: controls/ 내 상호 참조 경로 변경 불필요 (같은 depth 이동)
- D3: 11개 디렉토리 일괄 이동 전략 (D2에 의해 중간 단계 불필요)

**근거:**

- 의존성 분석: 이 디렉토리들은 core/만 의존하는 UI 기본요소 계층
- 내부 상호 의존: select→dropdown/button/gap/checkbox, input→button/select, list→collapse, pagination→button

#### [x] Feature 1.3 layout/ 카테고리 생성

**의존성:** Feature 1.2

**범위:**

- layout/ 디렉토리 생성
- 다음 디렉토리를 layout/ 하위로 이동:
  - dock/, sidebar/, topbar/, base-container/
- 모든 import 경로 수정 + index.ts re-export 경로 수정

**경계:**

- 각 디렉토리 내부 파일 구조는 변경하지 않음
- 코드 로직 변경 없음

**근거:**

- 의존성 분석: core/ + controls/ 의존하는 페이지 구조 계층
- sidebar↔topbar 상호 참조, base-container→topbar

#### [x] Feature 1.4 data/ 카테고리 생성

**의존성:** Feature 1.3

**범위:**

- data/ 디렉토리 생성
- 다음 디렉토리를 data/ 하위로 이동:
  - sheet/, data-sheet/, data-detail/, data-select-button/, shared-data/, kanban/, permission-table/, state-preset/
- 모든 import 경로 수정 + index.ts re-export 경로 수정

**경계:**

- 각 디렉토리 내부 파일 구조는 변경하지 않음
- 코드 로직 변경 없음

**근거:**

- 의존성 분석: core/ + controls/ + layout/ 의존하는 비즈니스 CRUD 추상화 계층
- data-sheet→sheet, shared-data→data-select-button 등 내부 의존

#### [x] Feature 1.5 features/ 카테고리 생성

**의존성:** Feature 1.4

**범위:**

- features/ 디렉토리 생성
- 다음 디렉토리를 features/ 하위로 이동:
  - visual/, editor/, address/, theme/
- 모든 import 경로 수정 + index.ts re-export 경로 수정
- packages/angular/CLAUDE.md 구조 문서 업데이트

**경계:**

- 각 디렉토리 내부 파일 구조는 변경하지 않음
- 코드 로직 변경 없음

**근거:**

- 의존성 분석: 다양한 계층에 의존하는 독립 기능 컴포넌트
- visual→core, editor→core, address→core(busy/modal), theme→core+controls(dropdown/button/checkbox)

## 제외 사항

- 각 feature 디렉토리 내부 구조 변경 — 현재 기능별로 잘 되어 있음. (사유: 불필요)
- 코드 로직 리팩토링 — 파일 이동과 경로 수정만 수행. (사유: 범위 한정)
- scss/ 디렉토리 이동 — 빌드 설정에 영향. 별도 검토 필요. (사유: 빌드 파이프라인 영향)
