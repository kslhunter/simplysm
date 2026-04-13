# server-build.worker.ts 리팩토링 — LLM 검증

## 검증 항목

- [x] rebuildAll()이 startWatch() 내부 클로저로 정의: `server-build.worker.ts:272` — startWatch (`:259`) 내부에 `async function rebuildAll()` 정의 확인
- [x] lastBuilderProgram이 startWatch 로컬 변수: `server-build.worker.ts:264` — `let lastBuilderProgram` startWatch 함수 스코프 내 정의 확인
- [x] watchLintRunner가 startWatch 로컬 변수: `server-build.worker.ts:265` — `let watchLintRunner` startWatch 함수 스코프 내 정의 확인
- [x] watchInfo 모듈 스코프 변수 제거: 모듈 스코프에 `watchInfo` 선언 없음 확인, startWatch의 `info` 파라미터를 직접 사용
- [x] cleanup()에서 lastBuilderProgram 참조 제거: `server-build.worker.ts:108-123` — cleanup 함수에 lastBuilderProgram 참조 없음 확인
- [x] startWatch에서 createContext에 tsc 옵션 전달: `server-build.worker.ts:348-359` — `tsc: { cwd, output: { dts }, env, includeTests }` 옵션 포함 확인
- [x] build() js=true에서 createTscPlugin 로컬 생성: `server-build.worker.ts:153-159` — build 함수 내 `const tscPlugin = createTscPlugin({...})` 확인
- [x] build() js=false에서 runTscPackageBuild 직접 호출: `server-build.worker.ts:192-199` — `runTscPackageBuild({...})` 직접 호출 확인
- [x] 외부 인터페이스(ServerBuildInfo/WatchInfo/Result/WorkerEvents) 변경 없음: 타입 정의 `:33-96` 변경 없음 확인
- [x] runTscPackageBuild import 유지: `server-build.worker.ts:19` — import 존재 확인 (js=false fallback용)
