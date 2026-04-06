# WBS: sd-modal data-sd-init 마이그레이션 포팅

## 프로젝트 개요

- **배경:** sd-modal 마이그레이션(workspaces-12 → workspaces-14) 시 `data-sd-init` 속성과 CSS transition이 누락됨
- **환경:** @simplysm/angular 패키지
- **전제조건:** 스타일 포팅(260406192951) 완료
- **기술적 제약:** provider.ts의 닫힘 애니메이션(transitionend 대기)은 별도 scope

## Impact Mapping

- **Goal:** 원본과 동일한 열림 애니메이션 동작 복원
  - **Actor:** 소비 프로젝트 사용자
    - **Impact:** 모달이 부드럽게 열리는 시각적 피드백을 받는다
      - **Deliverable:** data-sd-init 속성 + CSS transition 포팅

## Feature Breakdown

### Epic 1. data-sd-init 포팅

#### [x] Feature 1.1 data-sd-init 마이그레이션 포팅

**의존성:** 스타일 포팅 완료

**범위:**

- control.ts: effect에서 data-sd-init 속성 설정
- CSS: host opacity transition + dialog transform transition
- CSS: 열림 셀렉터를 [data-sd-open][data-sd-init]로 변경
- CSS (float): dialog opacity 0/1 처리

**경계:**

- provider.ts의 닫힘 애니메이션(transitionend 대기) 포팅은 별도 scope

**근거:**

- 원본 파일 `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\overlay\modal\sd-modal.control.ts` 105~318행, 375행

## 제외 사항

- provider.ts 닫힘 애니메이션 — 별도 scope (provider 구조가 크게 변경됨)
