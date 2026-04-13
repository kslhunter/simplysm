# server-esbuild-context tsc 통합 — LLM 검증

## 검증 항목

- [x] `EsbuildContextOptions.tsc`가 optional이므로 `server-watch-manager.ts:66-71`의 기존 `recreateContext()` 호출이 타입 에러 없이 동작: 확인 — `tsc` 미전달 시 기존 플러그인 재사용 로직 정상
- [x] `server-watch-manager.spec.ts` 8개 테스트 전부 통과: 확인 — 회귀 없음
- [x] `server-watch-manager.ts`에 코드 변경 없음: 확인 — 파일 미수정
