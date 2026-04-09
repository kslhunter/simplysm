# WBS: 모달 컴포넌트 템플릿 정리

## 프로젝트 개요

- **배경:** sd-prompt-modal, sd-confirm-modal이 불필요한 래퍼 div, 인라인 SCSS 스타일, raw `<input>` 직접 스타일링을 사용하고 있어 프로젝트의 유틸리티 클래스 기반 패턴과 불일치
- **환경:** `@simplysm/angular` 패키지, 유틸리티 클래스(`.flex-row`, `.main-align-end`, `.gap-sm`, `.p-default`, `.mb-default` 등)와 `sd-textfield` 컴포넌트가 이미 존재
- **전제조건:** 없음
- **기술적 제약:** 기존 ISdModal 인터페이스 계약 유지

## Impact Mapping

- **Goal:** 모달 컴포넌트의 코드 품질을 프로젝트 표준에 맞게 정상화
  - **Actor:** 라이브러리 소비 개발자
    - **Impact:** 일관된 패턴으로 모달 코드를 이해·수정할 수 있다
      - **Deliverable:** sd-prompt-modal, sd-confirm-modal 템플릿/스타일 정리

## Feature Breakdown

### Epic 1. 모달 컴포넌트 정리

#### [x] Feature 1.1 sd-prompt-modal / sd-confirm-modal 템플릿 정리

**의존성:** 없음

**범위:**

- 불필요한 래퍼 div (`._sd-prompt-modal`, `._sd-confirm-modal`) 제거 — 자식 요소를 호스트 바로 아래로 이동
- styles 블록 제거 — 레이아웃을 유틸리티 클래스로 대체 (`.p-default`, `.mb-default`, `.flex-row`, `.gap-sm`, `.main-align-end`)
- sd-prompt-modal의 raw `<input>` → `sd-textfield` 컴포넌트로 교체
- 호스트 `display: block` 설정 유지 (host 속성으로 이동)

**경계:**

- sd-sheet-config-modal 등 다른 모달 컴포넌트는 이 Feature에서 다루지 않음
- 기존 ISdModal 인터페이스 및 동작 변경 없음

**근거:**

- 사용자 지적: "스타일이 왜있는거지;;; 기본 스타일에 flex정렬및 padding등 class만 잘 먹인 template이면 되는거 아니냐"
- 사용자 지적: "sd-textfield를 써야지 뭐 엄한걸 직접 스타일링 하고있냐"
- 사용자 지적: "이런식으로 한번더 묶은것도 쓸데없는 짓거리네"
- 코드베이스 확인: 유틸리티 클래스 `.main-align-end`, `.flex-row`, `.gap-sm`, `.p-default`, `.mb-default` 등 존재 확인 (`packages/angular/scss/commons/_styles.scss`)

## 제외 사항

- sd-sheet-config-modal 등 동일 패턴의 다른 모달 정리 — 사용자가 명시적으로 요청하지 않음
