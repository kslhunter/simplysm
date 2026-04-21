# ngtsc-build, server-build watchPaths 적용 — LLM 검증

## 검증 항목

- ngtsc-build watchPaths 동일성: `srcGlobs: ["*.{ts,scss,css}"]`, `extraDirs: [{ dir: "scss", globs: ["*.{scss,css}"] }]` — 기존 코드의 `src/**/*.{ts,scss,css}` + `scss/**/*.{scss,css}` + deps 동일 패턴과 매칭 확인
- ngtsc-build SCSS 역방향 탐색 유지: `hasFileAddOrRemove` → `hasFileAddOrRemoveFn`으로 변경 후에도 `modifiedFiles` 구성 로직(pipeline.findAffectedByScss)이 그대로 유지됨
- ngtsc-build `shouldSkipRebuild(modifiedFiles, addOrRemove, ...)`: SCSS 역방향 탐색 결과가 포함된 `modifiedFiles` Set을 Iterable로 전달하여 정확한 필터링 수행
- server-build watchPaths 동일성: `srcGlobs: ["*"]` — 기존 `src/**/*` 패턴과 동일
- server-build metafile 기반 필터링 유지: `hasFileAddOrRemoveFn(changes)` → `addOrRemove` 변수명으로 변경 외에 metafile 기반 로직(L444-470) 무변경
- server-build esbuild context 재생성 로직 유지: `if (addOrRemove)` 블록 내 context 재생성 로직이 기존과 동일
- collectDeps import 제거: ngtsc-build, server-build 모두에서 collectDeps 직접 import 제거됨 — buildWatchPaths가 내부에서 호출
- 기존 테스트 94건 모두 통과 확인
