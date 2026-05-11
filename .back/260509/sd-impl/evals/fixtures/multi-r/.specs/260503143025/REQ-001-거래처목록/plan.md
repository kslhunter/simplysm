# REQ-001-거래처목록 / Plan

## 메타
- 상태: planned
- 결과: proceed

## 결과 사유
proceed — 모두 미구현, 신규 페이지 + 데이터 + 로직 추가 필요.

## R 단위 계획
- [ ] R1: 거래처 목록 표시 (이름/사업자번호/담당자/연락처)
  - **현황**: 미구현
  - **변경 위치**:
    - `src/pages/CustomerList.tsx` (신설) - `CustomerList` 컴포넌트
    - `src/data/customers.ts` (신설) - 샘플 데이터
  - **변경 방식**: Table 컴포넌트로 4개 컬럼 표시
  - **테스트**: 사후 (UI 변경)

- [ ] R2: 거래처명 검색
  - **현황**: 미구현
  - **변경 위치**:
    - `src/pages/CustomerList.tsx` - `CustomerList` 검색 로직 추가
    - `src/lib/customer-filter.ts` (신설) - 필터 함수
  - **변경 방식**: Input으로 검색어 받고, 부분 일치 필터링
  - **테스트**: TDD (필터 함수 단위 테스트)

- [ ] R3: 페이지네이션 (한 페이지 20건)
  - **현황**: 미구현
  - **변경 위치**:
    - `src/pages/CustomerList.tsx` - 페이지네이션 로직
    - `src/lib/paginate.ts` (신설) - 페이지 분할 함수
  - **변경 방식**: 20건씩 슬라이스, Pagination 컴포넌트 사용
  - **테스트**: TDD (페이지 함수 단위 테스트)

## 작업 순서
- 의존: R3는 R2(필터 결과)에 의존
- 권장 순서: R1 → R2 → R3

## 통합/E2E 테스트
- 목록 진입 → 검색 → 결과 페이지네이션 동작 확인
