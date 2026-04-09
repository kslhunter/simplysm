# WBS: sd-cli 코드 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** sd-cli 코드 리뷰에서 발견된 7건의 이슈(Medium 3, Low 4) 수정
- **환경:** simplysm 모노레포, sd-cli 패키지 (74개 TypeScript 소스 파일)
- **전제조건:** 없음
- **기술적 제약:** 기존 동작 유지, 사이드이펙트 없는 수정
- **참조 자료:** `.tasks/260407111551_review-sd-cli/review.md` — 이슈 상세 내용

## Impact Mapping

- **Goal:** sd-cli의 잠재적 버그 및 리소스 누수를 제거하여 안정성 향상
  - **Actor:** sd-cli 사용자 (개발자)
    - **Impact:** 빌드/배포 중 예기치 않은 동작 감소
      - **Deliverable:** 7건의 리뷰 이슈 수정

## Feature Breakdown

### Epic 1. 리뷰 이슈 수정

#### [x] Feature 1.1 sd-cli 리뷰 이슈 8건 수정

**의존성:** 없음

**범위:**

- LOGIC-001: `capacitor-android.ts` versionCode 공식을 `major*1000000 + minor*1000 + patch`로 변경
- DESIGN-001: `DevWatchOrchestrator.ts` 디버그 dist 삭제 감지 watcher를 모든 라이브러리 패키지로 일반화 + 클래스 필드 저장 + shutdown() 정리
- DESIGN-002: `server-build.worker.ts` esbuild context 재생성 시 try-finally로 이전 context 안전하게 dispose
- LOGIC-002: `vite-postcss-inline-plugin.ts` PostCSS 인라인 처리 시 원본 인용부호(`, ', ") 보존
- DESIGN-003: `sd-cli.ts` replaceDeps catch-all에서 예상 가능한 에러만 무시, 나머지는 경고 로그
- DESIGN-004: `electron.ts` `_canCreateSymlink()` finally 블록으로 임시 파일 정리
- DESIGN-005: `capacitor-android.ts` AndroidManifest.xml 수정을 XML 파서(fast-xml-parser) 기반으로 전환
- PERF-001: `publish.ts` 실패 패키지 검색에 Set 사용

**경계:**

- 기능 추가나 리팩토링 없음. 리뷰에서 발견된 이슈만 수정
- DESIGN-005에서 XML 파서 도입은 `configureAndroidManifest` 함수에만 적용. 다른 파일의 regex 수정은 대상 아님

**근거:**

- `.tasks/260407111551_review-sd-cli/review.md` — 코드 리뷰 결과
- 사용자 답변: DESIGN-001은 모든 라이브러리 패키지로 일반화, DESIGN-005는 XML 파서 도입

## 제외 사항

- 없음
