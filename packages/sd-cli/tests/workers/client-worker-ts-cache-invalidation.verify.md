# sd-build-start 플러그인 TypeScript 파일 감시 — LLM 검증

## 검증 항목

- onStart에서 `typeScriptFileCache.keys()`가 watchTargets에 포함: `client.worker.ts:266` — `...typeScriptFileCache.keys()`가 `watchTargets` 배열에 spread되어 포함됨
- onStart에서 `loadResultCache.watchFiles`도 여전히 watchTargets에 포함: `client.worker.ts:265` — `...loadResultCache.watchFiles`가 첫 번째로 spread됨 (기존 JS 동작 보존)
- onStart에서 watchTargets의 각 파일에 대해 mtime 비교 수행: `client.worker.ts:268-279` — `for (const file of watchTargets)` 루프에서 `fs.statSync(file).mtimeMs`와 `prevMtimes.get(file)` 비교
- 초기 빌드 직후 prevMtimes가 비어있으면 mtime 비교 스킵: `client.worker.ts:271-273` — `prev != null` 조건에 의해 `prevMtimes`에 없는 파일은 `changedFiles`에 추가되지 않음
- onEnd에서 `typeScriptFileCache.keys()`가 prevMtimes 기록 대상에 포함: `client.worker.ts:297` — `...esbuildResult.sourceFileCache.typeScriptFileCache.keys()`가 watchTargets에 spread됨
- onEnd에서 `loadResultCache.watchFiles`도 여전히 prevMtimes 기록 대상에 포함: `client.worker.ts:296` — `...esbuildResult.sourceFileCache.loadResultCache.watchFiles`가 첫 번째로 spread됨
- `typeScriptFileCache`가 `sourceFileCache`에서 destructuring으로 접근: `client.worker.ts:260` — `const { loadResultCache, typeScriptFileCache } = esbuildResult.sourceFileCache;` SourceFileCache의 public 속성 (`source-file-cache.js:52`)
- 삭제된 TS 파일에 대한 catch 처리: `client.worker.ts:275-279` — `catch` 블록에서 `prevMtimes.has(file)`인 경우 `changedFiles`에 추가 (기존 로직 동일)
