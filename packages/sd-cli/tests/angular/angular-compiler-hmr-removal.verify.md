# AngularCompiler HMR dead code 제거 — LLM 검증

## 검증 항목

- [x] enableHmr 프로퍼티가 AngularCompilerOptions에서 제거됨: `angular-compiler.ts` 인터페이스에 `enableHmr` 없음 확인
- [x] HMR_MODIFIED_FILE_LIMIT 상수가 제거됨: `angular-compiler.ts`에서 해당 상수 없음 확인
- [x] collectHmrCandidates import가 제거됨: `angular-compiler.ts`에서 `hmr-candidates` import 없음 확인
- [x] stale source file 수집 로직이 제거됨: `angular-compiler.ts`에서 `staleSourceFiles`, `useHmr` 변수 없음 확인
- [x] enableHmr 프로퍼티가 AngularBuildPipelineOptions에서 제거됨: `angular-build-pipeline.ts` 인터페이스에 `enableHmr` 없음 확인
- [x] templateUpdates 프로퍼티가 PipelineResult에서 제거됨: `angular-build-pipeline.ts` 인터페이스에 `templateUpdates` 없음 확인
- [x] vite-angular-plugin.ts의 `enableHmr: false` 제거됨: Pipeline 생성 시 `enableHmr` 옵션 없음 확인
- [x] hmr-candidates.ts 파일 삭제됨: `src/utils/hmr-candidates.ts` 파일 존재하지 않음
- [x] angular-compiler-hmr.spec.ts 삭제됨: `tests/angular/angular-compiler-hmr.spec.ts` 파일 존재하지 않음
- [x] hmr-candidates.spec.ts 삭제됨: `tests/angular/hmr-candidates.spec.ts` 파일 존재하지 않음
- [x] client.worker.ts 변경 없음: `client.worker.ts`는 `createCompilerPlugin` 경로를 사용하며 AngularCompiler를 직접 참조하지 않음
- [x] hmr-service.ts, hmr-client-script.ts, esbuild-client-config.ts 변경 없음: client.worker.ts 경로의 HMR 인프라는 그대로 유지됨
