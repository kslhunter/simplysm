# ngtsc watch rootNames 갱신 — LLM 검증

## 검증 항목

- [x] onChange에서 addOrRemove === true일 때 parseTsconfig + getPackageSourceFiles + pipeline.updateRootNames 호출: `ngtsc-build.worker.ts:299-306` — `if (addOrRemove)` 블록 내에서 `parseTsconfig(watchInfo!.pkgDir)` → `getPackageSourceFiles()` 또는 `getPackageFiles()` → `pipeline.updateRootNames(newSourceFiles)` 호출 체인이 정확히 구현됨
- [x] includeTests 분기가 초기 설정(line 233-235)과 동일 패턴: 초기 설정 `watchInfo.output.includeTests === true ? getPackageFiles(...) : getPackageSourceFiles(...)` (line 233-235)와 onChange 내 분기 `watchInfo!.output.includeTests === true ? getPackageFiles(...) : getPackageSourceFiles(...)` (line 302-304)가 동일한 패턴을 사용
- [x] addOrRemove === false일 때 rootNames 미갱신: `if (addOrRemove)` 블록(line 300-306) 내부에서만 rootNames 재스캔이 수행되므로, addOrRemove가 false일 때는 `pipeline.updateRootNames()`가 호출되지 않음. `shouldSkipRebuild`(line 293)에서 `hasAddOrRemove`가 false이고 변경 파일이 lastSourceFilePaths에 있으면 정상적으로 `pipeline.update(modifiedFiles)`만 실행됨
- [x] rootNames 재스캔이 shouldSkipRebuild 이후 + pipeline.update() 이전에 위치: line 293에서 shouldSkipRebuild 체크 → line 299에서 rootNames 재스캔 → line 310에서 pipeline.update(). 올바른 순서
