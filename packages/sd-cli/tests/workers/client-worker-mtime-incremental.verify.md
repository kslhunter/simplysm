# client.worker mtime 증분 추적 — LLM 검증

## 검증 항목

- [x] createSourceFileCachePlugin이 IncrementalMtimeTracker를 사용하는지 확인: `client.worker.ts:198` — `const mtimeTracker = new IncrementalMtimeTracker();` 확인됨
- [x] onStart에서 detectChanges 결과로 invalidate가 호출되는지 확인: `client.worker.ts:210-213` — `mtimeTracker.detectChanges(watchTargets)` 결과를 `sourceFileCache.invalidate(changedFiles)`에 전달. 기존 로직과 동작 동일
- [x] onEnd에서 updateMtimes가 호출되는지 확인: `client.worker.ts:228` — `mtimeTracker.updateMtimes(watchTargets)` 호출 확인. `prevMtimes.clear()` + 전체 순회 제거됨
- [x] esbuildResult == null 가드가 유지되는지 확인: onStart의 `if (esbuildResult != null)` (라인 202), onEnd의 `if (esbuildResult == null) return;` (라인 222) 모두 유지됨
- [x] isInitialBuild 가드와 sender.send("buildStart")가 유지되는지 확인: `client.worker.ts:216-218` — `if (!isInitialBuild) { sender.send("buildStart", {}); }` 유지됨
- [x] import 경로에 .js 확장자가 없는지 확인: `client.worker.ts:20` — `from "./incremental-mtime-tracker"` (확장자 없음)
