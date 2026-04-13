# WBS: angular 패키지 코드 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** `@simplysm/angular` 패키지에 대한 코드 리뷰에서 Critical 1건, Medium 5건, Low 8건의 이슈가 발견됨
- **환경:** simplysm 모노레포, `packages/angular` 패키지 (Angular 21, TypeScript 5.9, signal 기반 컴포넌트)
- **전제조건:** 없음
- **기술적 제약:** Chrome 61+ 브라우저 호환성, `import type` 필수, `console.*` 금지
- **참조 자료:**
  - `.tasks/260412194155_review-angular/review.md` — 코드 리뷰 원본 리포트 (이슈 상세 설명 및 개선 방향)

## Impact Mapping

- **Goal:** angular 패키지의 런타임 에러 1건 제거 및 잠재적 버그 5건 해소
  - **Actor:** @simplysm/angular 라이브러리 사용 개발자 및 최종 사용자
    - **Impact:** TipTap 에디터의 Underline 기능이 정상 동작하고, 입력 컨트롤·데이터 시트·에러 처리 등에서 잠재적 오동작이 해소됨
      - **Deliverable:** Critical/Medium 이슈 6건 코드 수정
  - **Actor:** @simplysm/angular 라이브러리 유지보수 개발자
    - **Impact:** 코드 품질 개선으로 디버깅·유지보수가 용이해짐
      - **Deliverable:** Low 이슈 8건 코드 개선

## Feature Breakdown

### Epic 1. Critical/Medium 이슈 수정

#### [x] Feature 1.1 Critical/Medium 로직 버그 및 설계 이슈 수정

**의존성:** 없음

**범위:**

- LOGIC-001 [Critical]: TipTap Underline 확장 미등록 수정 — `@tiptap/extension-underline` 의존성 추가 및 `DEFAULT_EXTENSIONS`에 포함
- LOGIC-002 [Medium]: `useSheetCellAgent`에서 `td.textContent` null 방어 추가
- LOGIC-003 [Medium]: `SdTextfield.onInput` 파싱 실패 시 input 요소를 이전 유효 값으로 복원
- LOGIC-004 [Medium]: `SdBaseContainer.modalOrPageTitle` computed의 빈 catch 블록에 에러 로깅 추가
- DESIGN-001 [Medium]: `SdGlobalErrorHandlerPlugin` catch 블록의 이중 `appRef.destroy()` 방어
- DESIGN-002 [Medium]: `SdSharedDataProvider.register`에서 리스너 교체 시 경합 방지

**경계:**

- Low severity 이슈는 이 Feature에서 다루지 않음 (Feature 1.2에서 처리)

**근거:**

- 코드 리뷰 리포트: `.tasks/260412194155_review-angular/review.md`의 LOGIC-001 ~ LOGIC-004, DESIGN-001 ~ DESIGN-002

### Epic 2. Low 이슈 개선

#### [x] Feature 1.2 Low 로직/일관성/성능/설계 이슈 개선

**의존성:** Feature 1.1

**범위:**

- LOGIC-005 [Low]: `setupModelHook`에서 async canFn + model.update 시 stale value 방지
- LOGIC-006 [Low]: `SdNavigateWindowProvider.open`에서 params 미지정 시 불필요한 세미콜론 제거
- CONSIST-001 [Low]: `SdCheckbox` vs `SdSwitch` 이벤트 전파 및 `canChangeFn` 지원 통일
- CONSIST-002 [Low]: `_getOrmDataEditToastErrorMessage` 중복 메서드를 공통 유틸 함수로 추출
- ~~PERF-001 [Low]: `SdSelect` contentHTML effect에서 선택된 아이템만 tracked로 읽도록 최적화~~ → 이미 `untracked()` + 선택 아이템만 `contentHTML()` 읽기로 해결됨 (sd-select.ts:336,354 확인). 구현 대상에서 제외.
- DESIGN-003 [Low]: `SdModal._restoreConfig`/`_saveConfig`에서 void async 에러에 `.catch()` 추가
- DESIGN-004 [Low]: `SdDataDetailBase` effect 내 `queueMicrotask` async 패턴에 에러 처리 추가
- DESIGN-005 [Low]: `SdPermissionTable.collapsedItems`를 문자열 키 기반 Set으로 변경

**경계:**

- 기존 공개 API 시그니처는 변경하지 않음 (내부 구현만 수정)

**근거:**

- 코드 리뷰 리포트: `.tasks/260412194155_review-angular/review.md`의 LOGIC-005 ~ LOGIC-006, CONSIST-001 ~ CONSIST-002, PERF-001, DESIGN-003 ~ DESIGN-005

## 제외 사항

- 없음 (모든 이슈가 코드 리뷰에서 검증된 실질적 이슈)
