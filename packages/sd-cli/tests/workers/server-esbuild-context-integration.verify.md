# rebuildAll이 esbuild context 모듈의 rebuild 사용 — LLM 검증

## 검증 항목

- rebuildAll()이 esbuildCtx.rebuild()를 호출한다: `server-build.worker.ts` line 252에서 `const esbuildPromise = info.output.js ? esbuildCtx.rebuild() : null;` 확인. 기존 inline esbuild.rebuild() 호출이 모듈 함수로 대체됨.
- rebuild() 결과의 null 처리: line 301에서 `(await esbuildPromise) ?? { success: true, ... }` — esbuildCtx.rebuild()가 null 반환 시 (context 없음) 기본 성공 결과로 폴백.
- cleanup()이 esbuildCtx.dispose()를 호출한다: `server-build.worker.ts` line 104에서 `await esbuildCtx.dispose();` 확인. 기존 inline context dispose가 모듈 함수로 대체됨.
- startWatch()가 esbuildCtx.createContext()를 호출한다: line 345에서 `await esbuildCtx.createContext({...})` 확인. 기존 createEsbuildWatchContext 로컬 함수가 제거됨.
- onChange의 context 재생성이 esbuildCtx.recreateContext()를 사용한다: line 395에서 `await esbuildCtx.recreateContext({...})` 확인. LOGIC-001 패턴이 모듈 내부로 캡슐화됨.
- metafile 필터링이 esbuildCtx.getMetafile()/hasContext()를 사용한다: lines 408, 414에서 `esbuildCtx.hasContext()`, `esbuildCtx.getMetafile()` 확인.
