# sd-cli 리뷰 이슈 수정

## 참조 자료

- [review.md](../260329162645_review-sd-cli-tasks/review.md) — 원본 리뷰 리포트 (9건 이슈)
- 대상 패키지: `packages/sd-cli`

## Feature Breakdown

- [x] Feature 1: 로직 정확성
  - LOGIC-001: `angular-compiler.ts` `_findAffectedFiles`에서 `ts.Program` 반환 케이스 미처리
  - LOGIC-002: `ngtsc-build-core.ts` `runNgtscBuild`의 `js.success` 항상 true
  - LOGIC-003: `vite-angular-plugin.ts` dev 모드 초기 빌드 결과 미보고
- [x] Feature 2: 일관성/공통화
  - CONSIST-001: `vite-angular-plugin.ts` lintRunner 초기화 중복
  - CONSIST-002: 진단 필터링 구현 3곳 분산 → 공통 유틸 추출
  - CONSIST-003: 에러 포맷 불일치 → 공통 포맷 함수 추출
  - CONSIST-004: `runLint` 동명 함수 2개 → 이름 구분
  - DESIGN-001: `lint-with-program.ts` 캐시 경로 scoped 패키지명 처리
- [x] Feature 3: 성능 최적화
  - PERF-001: `ngtsc-build.worker.ts` watch 모드 side-effect SCSS 전체 재컴파일
