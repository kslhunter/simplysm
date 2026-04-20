# Worker 초기화 수정 — LLM 검증

## 검증 항목

- [x] `client-protocol-wrapper.ts`에서 `createBrowserWorker` import가 제거됨: `isWorkerSupported`만 value import로 유지, `BrowserWorker`는 type import로 유지 확인 (`:8`)
- [x] Worker 생성이 `new Worker(new URL(...)) as unknown as BrowserWorker` 직접 패턴으로 변경됨: `:48-51` 확인
- [x] esbuild 플러그인 인식 제약 주석이 추가됨: `:45-47` CRITICAL 주석 확인
- [x] `browser-compat.ts`에서 `createBrowserWorker` 함수가 삭제됨: 파일에 `BlobInput`, `FileCollection`, `BrowserWorker`, `isWorkerSupported`만 남음 확인
- [x] `browser-compat.ts`의 나머지 export(`BlobInput`, `FileCollection`, `BrowserWorker`, `isWorkerSupported`)가 유지됨: 각각 `:8`, `:14-19`, `:22-27`, `:30-32` 확인
- [x] 참조 문서 `.claude/references/sd-simplysm14/service-client/docs/protocol.md`에 Worker 생성 패턴 제약이 문서화됨: "CRITICAL — Worker 생성 패턴 제약" 섹션 추가 확인
