# WBS: angular 패키지 코드 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** angular 패키지 코드 리뷰에서 설계 이슈 1건(Low), 일관성 이슈 1건(Low)이 발견됨. LOGIC-001(Critical)은 거짓양성으로 판정됨 — 기존 테스트(`setup-model-hook.spec.ts:101-131`)에서 의도적 설계임이 확인됨
- **환경:** `packages/angular` — Angular 21 UI 컴포넌트 라이브러리
- **전제조건:** 없음
- **기술적 제약:** 기존 API 시그니처 유지 (공개 패키지)
- **참조 자료:**
  - `.tasks/260412210215_review-angular/review.md` — 코드 리뷰 리포트 (수정 대상 이슈 상세)

## Impact Mapping

- **Goal:** 코드 리뷰에서 발견된 버그 및 품질 이슈를 해소하여 런타임 정합성을 확보한다
  - **Actor:** 라이브러리 소비 개발자
    - **Impact:** SdModal의 dead input으로 인한 혼란 없이 API를 신뢰할 수 있다
      - **Deliverable:** SdModal dead input 제거
    - **Impact:** 유사 컴포넌트 간 일관된 코드 패턴으로 유지보수가 용이하다
      - **Deliverable:** tabindex 바인딩 표현식 통일

## Feature Breakdown

### Epic 1. 리뷰 이슈 수정

#### [x] Feature 1.1 setupModelHook update 비동기 경로 canFn 우회 버그 수정 — 거짓양성

**상태:** 거짓양성으로 판정. `setup-model-hook.spec.ts:101-131` 테스트에서 `fn(model())` 재평가가 stale value 방지를 위한 의도적 설계임이 확인됨. `canFn`은 값 validator가 아닌 사용자 행동 가드이므로 현재 동작이 올바름.

#### [x] Feature 1.2 SdModal dead input 제거 및 tabindex 통일

**의존성:** 없음

**범위:**

- `sd-modal.ts`에서 `headerStyle` input 제거
- `sd-modal.ts`에서 `noFirstControlFocusing` input 제거
- `SdModalOptions` 타입에서 `headerStyle` 제거 (`sd-modal.provider.ts`)
- `SdModalOptions` 타입에서 `noFirstControlFocusing` 제거 불가 — provider가 직접 사용하므로 타입은 유지, input만 제거
- `sd-checkbox.ts`의 tabindex 바인딩을 `sd-switch.ts`와 동일한 `"'0'"` 형태로 통일 (또는 반대 방향)
- `index.ts`의 공개 API에 영향이 없는지 확인

**경계:**

- `headerStyle` 기능 자체(헤더에 스타일 적용)를 구현하지 않음 — dead input 제거만 수행
- `noFirstControlFocusing`은 provider 로직에서는 유지, modal component input에서만 제거

**근거:**

- 리뷰 DESIGN-001: `headerStyle`은 템플릿에서 바인딩되지 않아 효과 없음, `noFirstControlFocusing`은 provider가 `options`에서 직접 읽으므로 modal input 불필요
- 리뷰 CONSIST-001: 같은 디렉토리의 같은 성격 컴포넌트에서 tabindex 표현식이 불일치

## 제외 사항

- `headerStyle` 기능 구현 (헤더 스타일 적용) — 기존에 사용되지 않던 기능이므로 새로 구현하는 것은 범위 초과
