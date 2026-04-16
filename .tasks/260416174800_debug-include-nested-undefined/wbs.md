# WBS: 다단계 include 후 select() 중첩 접근 시 undefined 수정

## 프로젝트 개요

- **배경:** GitHub 이슈 kslhunter/simplysm#26. `include()`로 1:N 하위의 N:1 관계를 포함한 후 `select()` 콜백에서 중첩 접근 시 `undefined` 발생
- **환경:** `@simplysm/orm-common@14.0.42`, 브라우저 (Angular 21 SPA)
- **전제조건:** 없음
- **기술적 제약:** downstream 전체 체인(`_buildSelectDef`, `getResultMeta`, `transformColumnsAlias`, `result-parser`)과의 호환성 유지 필수
- **참조 자료:**
  - `.tasks/260416174800_debug-include-nested-undefined/debug.md` — 근본 원인 분석 및 해결 방안
  - `packages/orm-common/src/exec/queryable.ts` — 수정 대상 파일

## Impact Mapping

- **Goal:** 다단계 include 후 select/where 콜백에서 중첩 관계 접근이 정상 동작
  - **Actor:** ORM 사용자 (서비스 개발자)
    - **Impact:** 1:N → N:1 등 다단계 관계를 include + select/where로 자유롭게 조합 가능
      - **Deliverable:** `_include()` columns 구조를 nested로 근본 수정

## Feature Breakdown

### Epic 1. _include() columns 구조 수정

#### [x] Feature 1.1 _include() 근본 수정

**의존성:** 없음

**범위:**

- `parentCols[parentChain]` flat dotted key 접근을 nested path traversal로 변경 (라인 815, 857)
- 각 join/joinSingle 호출 후 flat dotted key를 부모 관계 내부로 이동 및 flat key 제거
- 기존 테스트 통과 확인
- 이슈 재현 시나리오에 대한 테스트 추가 (FKT→FK 다단계 include + select)
- 3단계 include (FK→FKT→FK) 테스트 추가

**경계:**

- `join()`/`joinSingle()` 메서드 자체는 수정하지 않음 (다른 곳에서도 직접 사용)
- `_buildSelectDef`, `getResultMeta`, `transformColumnsAlias`, `result-parser`는 수정하지 않음 (이미 재귀적으로 nested 처리)

**근거:**

- debug.md 분석: flat dotted key 구조가 nested access와 불일치
- 대화에서 전체 체인 검토 완료: downstream 모두 재귀 처리하므로 안전

**설계 결정:**

- D1: C안(근본 수정) 선택 — flat key를 부모 내부로 이동 후 삭제
- D2: 기존 테스트 모델(User/Post/Company)로 충분, 새 모델 불필요

## 제외 사항

- 없음

