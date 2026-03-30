# WBS

## Impact Mapping

- **Goal:** @simplysm/angular 패키지의 리뷰 이슈 38건 해결로 런타임 안정성 확보
  - **Actor:** @simplysm/angular 소비 개발자
    - **Impact:** 버그·비일관성 없이 UI 컴포넌트를 신뢰하고 사용한다
      - **Deliverable:** 영역별 코드 수정 (core / form / layout+nav / data+overlay+visual)

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. 코드 리뷰 이슈 수정

- [x] Feature 1.1 Core 영역 수정 (13건: Critical 3, Medium 4, Low 6)
  - 네비게이션 수식키 표준 동작 구현
  - 비동기 에러 처리 누락 보완
  - 리소스 누수 방지 (가드 누적, RAF 미취소, DOM 미제거)
  - 가드 및 권한 로직 경계값 처리
  - 네이밍 일관성 및 구현 안정성 개선

- [x] Feature 1.2a TipTap Editor 수정 (3건: Critical 1, Medium 1, Low 1)
  - Underline 확장 미등록 수정
  - disabled/readonly effect의 editor 생성 추적 개선
  - 에디터 툴바 active states signal 변환

- [x] Feature 1.2b Textfield/Input 수정 (5건: Medium 3, Low 2)
  - 날짜 범위 to 계산 정규화
  - onInputPaste preventDefault 누락 수정
  - DateTime/Time min/max 검증 추가
  - String 핸들러 minlength/maxlength/pattern 타입 확장
  - format 핸들러 regex 이스케이프 보강

- [x] Feature 1.3 Layout + Navigation 영역 수정 (5건: Medium 3, Low 2)
  - 칸반 선택 로직의 selectable 플래그 반영
  - 페이지네이션 경계값 처리
  - 사이드바 백드롭 의도 명확화

- [x] Feature 1.4 Data + Overlay + Visual 영역 수정 (12건: Critical 1, Medium 6, Low 5)
  - 시트 리사이즈 타이밍 처리 개선
  - 시트 헤더 머지·클립보드 로직 수정
  - 모달 z-index 및 이벤트 리스너 관리
  - 토스트 생명주기 관리 개선
  - 시트 성능 최적화

## 참조 자료

### 리뷰 리포트
- `.tasks/260330131327_review-angular/review.md` — 38건 이슈의 상세 설명, severity, location, suggestion 확인

### 이슈 → Feature 매핑

#### Feature 1.1 Core
| 이슈 ID | Severity | 파일 |
|---------|----------|------|
| LOGIC-001 | Critical | `sd-router-link.directive.ts`, `sd-navigate-window.provider.ts` |
| LOGIC-002 | Critical | `setupModelHook.ts` |
| LOGIC-003 | Critical | `setupCanDeactivate.ts` |
| LOGIC-006 | Medium | `sd-resize-event.plugin.ts` |
| LOGIC-007 | Medium | `sd-app-structure.provider.ts` |
| LOGIC-008 | Medium | `useSdSystemConfigResource.ts` |
| LOGIC-009 | Medium | `setupInvalid.ts` |
| LOGIC-020 | Low | `sd-navigate-window.provider.ts` |
| LOGIC-021 | Low | `sd-app-structure.provider.ts` |
| CONSIST-003 | Low | `sd-modal.provider.ts`, `setupCanDeactivate.ts`, `sd-modal.control.ts` |
| DESIGN-002 | Low | `sd-global-error-handler.plugin.ts` |
| DESIGN-003 | Low | `setupRipple.ts` |
| PERF-001 | Low | `useExpandingManager.ts` |

#### Feature 1.2a TipTap Editor
| 이슈 ID | Severity | 파일 |
|---------|----------|------|
| LOGIC-004 | Critical | `sd-tiptap-editor.control.ts` |
| LOGIC-012 | Medium | `sd-tiptap-editor.control.ts` |
| DESIGN-005 | Low | `sd-tiptap-editor.control.ts` |

#### Feature 1.2b Textfield/Input
| 이슈 ID | Severity | 파일 |
|---------|----------|------|
| LOGIC-010 | Medium | `sd-date-range.picker.ts` |
| LOGIC-011 | Medium | `sd-textfield.control.ts` |
| CONSIST-001 | Medium | `sd-textfield-type-handlers.ts` |
| CONSIST-004 | Low | `sd-textfield-type-handlers.ts` |
| LOGIC-023 | Low | `sd-textfield-type-handlers.ts` |

#### Feature 1.3 Layout + Navigation
| 이슈 ID | Severity | 파일 |
|---------|----------|------|
| LOGIC-013 | Medium | `sd-kanban-lane.control.ts` |
| LOGIC-014 | Medium | `sd-pagination.control.ts` |
| CONSIST-002 | Medium | `sd-sidebar-container.control.ts` |
| LOGIC-022 | Low | `sd-pagination.control.ts` |
| DESIGN-004 | Low | `sd-dock.control.ts` |

#### Feature 1.4 Data + Overlay + Visual
| 이슈 ID | Severity | 파일 |
|---------|----------|------|
| LOGIC-005 | Critical | `sd-sheet.control.ts` |
| LOGIC-015 | Medium | `useSheetLayoutEngine.ts` |
| LOGIC-016 | Medium | `useSheetCellAgent.ts` |
| LOGIC-017 | Medium | `sd-modal.control.ts` |
| LOGIC-018 | Medium | `sd-toast.provider.ts` |
| LOGIC-019 | Medium | `sd-toast.provider.ts` |
| DESIGN-001 | Medium | `sd-modal.control.ts` |
| PERF-002 | Low | `sd-sheet.control.ts` |
| PERF-003 | Low | `sd-sheet.control.ts` |
| LOGIC-024 | Low | `sd-progress.control.ts` |
| CONSIST-005 | Low | `sd-dropdown-popup.control.ts` |
| DESIGN-006 | Low | `sd-list-item.control.ts` |

### 참조 파일
- `packages/angular/src/core/` — Feature 1.1 대상. plugins, providers, directives, utils 하위 파일
- `packages/angular/src/ui/form/editor/` — Feature 1.2a 대상. sd-tiptap-editor.control.ts
- `packages/angular/src/ui/form/input/` — Feature 1.2b 대상. sd-textfield.control.ts, sd-textfield-type-handlers.ts, sd-date-range.picker.ts
- `packages/angular/src/ui/layout/`, `packages/angular/src/ui/navigation/` — Feature 1.3 대상
- `packages/angular/src/ui/data/`, `packages/angular/src/ui/overlay/`, `packages/angular/src/ui/visual/` — Feature 1.4 대상

### 의존성
- Feature 1.1의 CONSIST-003(canDeactivefn → canDeactiveFn 리네임)이 Feature 1.4의 `sd-modal.provider.ts`, `sd-modal.control.ts`에도 영향. Feature 1.1에서 일괄 처리
- Feature 1.1의 PERF-001(useExpandingManager)이 Feature 1.4의 `sd-sheet.control.ts`에서 사용됨. Feature 1.1이 선행되어야 함

## 제외 사항

- 없음 (리뷰 38건 전수 수정)
