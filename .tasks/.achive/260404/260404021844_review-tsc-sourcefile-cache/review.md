# 코드 리뷰: TscEngine SourceFile 캐싱 (oldBuilderProgram 전달)

| 항목 | 값 |
|------|-----|
| 분석 대상 | `tsc-build.ts`, `library-build.worker.ts`, `server-build.worker.ts` |
| 일시 | 2026-04-04 02:18 |
| 파일 수 | 3 |
| 발견 이슈 | 0건 |

## 분석 결과

분석 결과 보고할 이슈가 없습니다.

## 검토 상세

### 로직 검증

- `oldBuilderProgram`이 `undefined`(첫 빌드)일 때: TypeScript API가 4번째 인자 `undefined`를 정상 처리 — 기존 동작과 동일
- 빌드 예외 시: catch 블록에서 `builderProgram` 미반환 → `?? lastBuilderProgram`으로 이전 값 유지 — 안전한 폴백
- 파일 추가/삭제 시: TypeScript가 oldProgram의 rootFiles와 새 rootFiles를 비교하여 자동 처리
- compilerOptions 변경 시(tsconfig 수정): TypeScript가 내부적으로 옵션 변경을 감지하여 전체 재빌드

### 일관성 검증

- `library-build.worker.ts`와 `server-build.worker.ts`에 동일한 패턴 적용
- `lastBuilderProgram` 네이밍이 기존 `lastSourceFilePaths`, `lastMetafile`과 일관
- cleanup에서의 해제 패턴이 기존 변수들과 일관

### 메모리 안전성

- `lastBuilderProgram` 재할당 시 이전 참조 해제 → GC 가능
- SourceFile 객체는 새 program에서 재사용될 수 있으나 old program 자체는 해제
- `cleanup()`에서 명시적 `undefined` 할당으로 watch 종료 시 완전 해제

### 설계 검증

- `TscPackageBuildResult`에 `program`(기존)과 `builderProgram`(신규) 공존 — `program`은 lint용, `builderProgram`은 캐싱용으로 역할 구분 명확. 기존 API 호환 유지하는 최소 변경
- one-time `build()` 함수에는 `oldBuilderProgram` 미전달 — 올바른 설계 (일회성 빌드에 캐싱 불필요)
