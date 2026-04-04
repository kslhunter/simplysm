# WBS

## Impact Mapping

- **Goal:** @simplysm/angular 패키지의 코드 리뷰에서 발견된 로직 버그, 설계 결함, 일관성 문제를 수정하여 런타임 안정성 향상
  - **Actor:** @simplysm/angular 소비 프로젝트 개발자 및 최종 사용자
    - **Impact:** 간헐적 데이터 불일치, Promise 누수, UI 입력 소실 등 재현 어려운 버그가 제거되어 안정적으로 동작
      - **Deliverable:** 리뷰 이슈 17건 수정 (Critical 4, Medium 11, Low 2)

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. Core Infrastructure 수정

- [ ] Feature 1.1 Core Provider 소규모 버그 수정
  - 글로벌 에러 핸들러에서 UI 표시와 로깅을 분리하여 첫 에러 이후에도 로깅 수행
  - SdNavigateWindowProvider에서 params가 빈 경우 URL에 불필요한 구분자 추가 방지
  - SdSharedDataProvider에서 리스너 재등록 시 이전 리스너 제거 완료 후 새 리스너 등록

- [ ] Feature 1.2 커맨드 플러그인 단일 리스너 + 핸들러 스택
  - 3개 커맨드 플러그인(save/insert/refresh)이 각각 document에 리스너를 등록하는 구조를 단일 리스너 + 핸들러 스택으로 리팩토링
  - 가장 나중에 등록된 핸들러만 실행하여 복수 바인딩 시 중복 실행 방지
  - 기존 findTopOpenModalEl 기반 모달 필터링 동작 유지

### Epic 2. Toast Provider 수정

- [ ] Feature 2.1 Toast Provider Promise 누수 및 에러 처리
  - overlap 모드에서 기존 토스트 제거 시 연관된 notify Promise를 resolve하여 Promise 누수 방지
  - try 메서드에서 Error 인스턴스가 아닌 예외도 toast 메시지로 표시

### Epic 3. Data View 수정

- [ ] Feature 3.1 sd-data-sheet/select-button 비동기 race condition 방지
  - effect 내 비동기 작업(refresh/load) 완료 후 cancelled 플래그 재확인
  - stale 결과가 최신 시그널 상태를 덮어쓰지 않도록 방어

- [ ] Feature 3.2 sd-data-detail 초기화 에러 처리 개선
  - refresh 실패 시 에러 상태를 관리하여 빈 폼 표시 방지 또는 재시도 제공

- [ ] Feature 3.3 sd-data-sheet/detail 코드 일관성 수정
  - 두 클래스에 중복된 private 메서드를 공통 유틸리티로 추출
  - 삭제/복구 성공 메시지의 공백 불일치 통일
  - doToggleDeleteItem에서 아이템 객체 불변성 유지 (clone 후 배열 갱신)

### Epic 4. Sheet 컴포넌트 수정

- [ ] Feature 4.1 Sheet 셀 복사 null 방어
  - useSheetCellAgent에서 td.textContent가 null일 때 빈 문자열로 대체

- [ ] Feature 4.2 Sheet 헤더 병합 로직 수정
  - useSheetLayoutEngine에서 spanStartHeaders를 span 시작 column 기준으로 유지하여 잘못된 병합 방지

### Epic 5. Form 입력 컴포넌트 수정

- [ ] Feature 5.1 numpad 부분 입력 보존
  - text→value, value→text 양방향 effect의 순환 트리거를 해소하여 마이너스/소수점 부분 입력이 소실되지 않도록 수정

- [ ] Feature 5.2 select/textfield 입력 동기화 수정
  - sd-select multi 모드에서 untracked 영향으로 contentHTML 변경 감지가 누락되는 문제 수정
  - sd-textfield number 타입에서 파싱 실패 시 input 요소의 display value를 현재 value 기반으로 갱신

### Epic 6. Features 수정

- [ ] Feature 6.1 Daum 주소 스크립트 싱글톤 로딩
  - 모듈 레벨 Promise로 스크립트 로딩을 한 번만 수행하고 후속 호출은 동일 Promise를 await

## 참조 자료

### 리뷰 리포트
- `.tasks/260401231320_review-angular/review.md` — 전체 이슈 목록과 상세 설명. 각 Feature 구현 시 해당 이슈의 description/suggestion을 참조

### 커맨드 플러그인 현재 구조
- `packages/angular/src/core/plugins/commands/sd-save-command-event.plugin.ts` — 현재 document 리스너 등록 방식과 findTopOpenModalEl 로직 확인
- `packages/angular/src/core/plugins/commands/sd-insert-command-event.plugin.ts` — 동일 구조
- `packages/angular/src/core/plugins/commands/sd-refresh-command-event.plugin.ts` — 동일 구조
- `packages/angular/src/core/plugins/commands/findTopOpenModalEl.ts` — 모달 필터링 로직. 리팩토링 시 유지 필요

### Toast Provider 현재 구조
- `packages/angular/src/ui/overlay/toast/sd-toast.provider.ts` — `notify`, `_removeAllToasts`, `_destroyToast`, `_setupAutoDismiss`, `try` 메서드의 현재 구현 확인

### Data View 비동기 패턴
- `packages/angular/src/features/data-view/sd-data-sheet.control.ts:204-230` — effect + queueMicrotask + withBusy + refresh 체인과 onCleanup cancelled 패턴 확인
- `packages/angular/src/features/data-view/sd-data-select-button.control.ts:75-92` — 동일 패턴
- `packages/angular/src/features/data-view/sd-data-detail.control.ts:91-108` — 초기화 effect와 _sdToast.try 에러 삼킴 패턴 확인

### Sheet 헤더 병합
- `packages/angular/src/ui/data/sheet/useSheetLayoutEngine.ts:113-115` — spanStartHeaders 업데이트 로직. span 시작점 기준으로 변경 필요

### 설계 결정
- 커맨드 플러그인: "가장 나중에 등록된 핸들러만 실행" (사용자 결정)
- 모달 canDeactivate 건너뜀: 의도된 설계로 수정하지 않음 (사용자 확인)
- sd-collapse offsetHeight: ResizeObserver가 보완하므로 수정하지 않음 (사용자 결정)

### 참조 파일
- `packages/angular/src/core/utils/withBusy.ts` — withBusy 유틸리티. race condition 수정 시 cancelled 체크 삽입 위치 확인
- `packages/angular/src/core/utils/setups/setupModelHook.ts` — model hook 패턴 참조 (직접 수정 대상은 아님)
- `packages/angular/src/ui/form/input/sd-numpad.control.ts` — numpad 양방향 effect 구조 확인
- `packages/angular/src/ui/form/select/sd-select.control.ts:325-370` — untracked 블록 내 contentHTML 호출 위치 확인
- `packages/angular/src/ui/form/input/sd-textfield-type-handlers.ts:143-151` — number 타입 parse 로직 확인
- `packages/angular/src/features/address/sd-address-search.modal.ts:68-84` — Daum 스크립트 로딩 현재 구현 확인

## 제외 사항

- LOGIC-006 (모달 canDeactivate 건너뜀) — 의도된 설계. 모달은 라우트 가드가 아닌 SdActivatedModalProvider로 닫힘
- LOGIC-011 (sd-collapse offsetHeight 0) — ResizeObserver가 보완하고 있으며 문제 보고 없음
- 기능 변경 없는 이슈 17건 (일관성, 성능, 리소스 정리) — 별도 리뷰 리포트에 기록됨. 필요 시 후속 작업으로 진행
