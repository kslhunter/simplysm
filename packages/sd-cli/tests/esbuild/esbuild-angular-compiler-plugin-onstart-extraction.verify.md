# onStart 서브함수 추출 — LLM 검증

## 검증 항목

- **handleIncrementalBuild 클로저 변수 접근**: `pluginOptions.sourceFileCache!` (314줄), `pluginOptions.templateUpdates` (316줄), `angularCompiler!` (322, 342, 345, 353줄), `referencedFileTracker` (332줄), `additionalResults` (339줄), `cwd` (359줄) — 모두 setup 스코프(248-289줄)에서 선언된 변수를 파라미터 없이 직접 접근. 원본에서 `errors`/`warnings`를 사용하지 않아 파라미터 불필요 (lint 에러로 확인, 제거)
- **handleFirstBuild 클로저 변수 접근**: `pluginOptions` (378, 387-390줄), `preserveSymlinks` (381줄), `angularCompiler` (394줄 대입), `shouldTsIgnoreJs` (398줄 대입), `useTypeScriptTranspilation` (399줄 대입) — 모두 setup 스코프 변수 직접 접근. 파라미터 없음
- **createWebWorkerProcessor 클로저 변수 접근**: `build` (410줄), `pluginOptions.sourcemap` (410줄), `cwd` (422, 437줄), `referencedFileTracker` (417, 435줄), `additionalResults` (424, 428줄) — 모두 setup 스코프 변수 직접 접근. `errors`/`warnings`만 파라미터로 전달
- **onStart 반환값 동일**: onStart 콜백(456-526줄)이 동일한 `result` 객체를 반환 (`errors`/`warnings` 할당 로직 523-525줄 유지). 추출 전과 동일한 `{errors, warnings}` 구조
- **내부 상태 변화 동일**: `handleIncrementalBuild`에서 `sourceFileCache.invalidate()` (328줄), `additionalResults.delete()` (332줄), `angularCompiler.update()` (335줄), `templateUpdates.set()/clear()` (366, 370줄) — 원본 코드(316-383줄)와 동일한 mutation 순서와 로직
- **handleFirstBuild 상태 설정**: `angularCompiler = compiler` (394줄), `shouldTsIgnoreJs = !co.allowJs` (398줄), `useTypeScriptTranspilation` (399-400줄) — 원본 코드(384-409줄)와 동일
- **HMR 실패 시 templateUpdates 초기화**: `updateText === null || updateText === undefined` 조건(364줄) → `pluginOptions.templateUpdates!.clear()` (366줄) + `break` (367줄) — 원본과 동일
- **Worker 빌드 성공 경로**: `additionalResults.set(fullWorkerPath, {outputFiles, metafile})` (428-431줄) → `workerCodeFile` 찾기 (442-444줄) → 상대 경로 반환 (450-451줄) — 원본과 동일
- **Worker 빌드 실패 경로**: `errors.push(...workerResult.errors)` (415줄) → `referencedFileTracker.add()` (417-423줄) → `additionalResults.set()` (424줄) → `return workerFile` (425줄) — 원본과 동일
- **onStart 오케스트레이션 축소**: onStart 콜백이 456-526줄 = ~70줄로 축소됨. 구성: stylesheetErrors 리셋(4줄) + 분기 호출(5줄) + processWebWorker 생성(1줄) + emit(5줄) + diagnostics(8줄) + stylesheet 브릿징(12줄) + 에러 핸들링(13줄) + 결과 반환(3줄)
- **onLoad/onEnd/onDispose 미변경**: 528줄 이후의 onLoad(528-593줄), onEnd(615-625줄), onDispose(628-632줄) 핸들러가 변경되지 않음
- **기존 테스트 26개 통과**: vitest run 실행 결과 26 passed, 0 failed
