# client.worker.ts startWatch 서브함수 추출 — LLM 검증

## 검증 항목

- [x] createSourceFileCachePlugin이 모듈 스코프에 존재하고 esbuild.Plugin을 반환한다: lines 192-250, `function createSourceFileCachePlugin(): esbuild.Plugin` 반환 타입 명시, `name: "sd-build-start"` 유지
- [x] createDevBuildEndHandler가 모듈 스코프에 존재하고 onEnd 콜백을 반환한다: lines 255-322, 반환 타입 `(result: esbuild.BuildResult) => Promise<void>`
- [x] startWatch에서 추출 함수를 호출한다: line 385 `plugins: [createSourceFileCachePlugin()]`, line 386 `onEnd: createDevBuildEndHandler(basePath, actualPort, outdir, entryNames, info.pkgDir)`
- [x] 파일 변경 감지 로직이 동일하다: createSourceFileCachePlugin onStart (lines 198-230) — watchFiles + typeScriptFileCache 순회, mtime 비교, invalidate 호출, buildStart 이벤트 전송 모두 원본과 동일
- [x] mtime 기록 로직이 동일하다: createSourceFileCachePlugin onEnd (lines 232-247) — prevMtimes.clear() + mtime 기록 원본과 동일
- [x] index.html 재생성 로직이 동일하다: createDevBuildEndHandler (lines 264-279) — lastMetafile 보관 + generateIndexHtml + writeFileSync 원본과 동일
- [x] HMR 디스패치 로직이 동일하다: lines 281-284, `hmrService.onBuildEnd(result.metafile)` 조건부 호출 원본과 동일
- [x] build 이벤트 전송 로직이 동일하다: lines 286-300, `sender.send("build", ...)` 조건부 호출 원본과 동일
- [x] 초기 빌드 resolve 로직이 동일하다: lines 302-312, `isInitialBuild = false` + `initialBuildResolve?.()` 원본과 동일
- [x] 에러 핸들링 로직이 동일하다: lines 313-320, catch 블록 원본과 동일
- [x] 외부 인터페이스가 변경되지 않았다: export는 `export default sender`만 존재 (line 501), ClientBuildInfo/ClientBuildResult/ClientWorkerEvents 타입 변경 없음
- [x] build 함수가 변경되지 않았다: lines 96-187, 원본과 동일
- [x] stopWatch에 리셋 로직이 추가되었다: lines 472-475, `lastMetafile = undefined`, `isInitialBuild = true`, `initialBuildResolve = undefined`
- [x] stopWatch 기존 정리 로직이 변경되지 않았다: lines 439-470, 5단계 정리(esbuild dispose, HMR 종료, HTTP 종료, public 감시 종료, index.html 감시 종료) 원본과 동일
- [x] 모듈 스코프 변수가 올바르게 선언되었다: lines 67-69, 기존 변수(62-66) 바로 아래 배치
- [x] startWatch가 ~110줄로 축소되었다: lines 327-434 = 107줄 (목표 ~110줄 달성)
- [x] index.html watcher에서 lastMetafile 접근이 정상 동작한다: line 400, `if (lastMetafile == null) return;` — 모듈 스코프 변수로 접근
- [x] 기존 테스트 6개 전부 통과: client-worker.spec.ts (3), client-worker.acc.spec.ts (3) — 회귀 없음
