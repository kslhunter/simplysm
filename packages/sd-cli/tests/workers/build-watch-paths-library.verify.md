# library-build watchPaths 동일성 — LLM 검증

## 검증 항목

- buildWatchPaths 호출 인자가 기존 코드와 동등: `srcGlobs: ["*.ts"]`, `replaceDeps: info.replaceDeps` — 기존 `pathx.posixResolve(info.pkgDir, "src", "**", "*.ts")` 패턴과 동일한 경로 생성 확인
- workspace deps 경로 생성이 동일: 기존 `workspaceDeps.map((d) => pathx.posixResolve(info.cwd, "packages", d, "src", "**", "*.ts"))` → buildWatchPaths 내부에서 동일하게 `pathx.posixResolve(cwd, "packages", d)` + `src/**/*.ts` 생성
- replaceDeps dist 경로가 cwd와 pkgDir 양쪽에서 생성됨: buildWatchPaths 내부에서 `pathx.posixResolve(cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}")` 및 pkgDir 경로 동일하게 생성
- collectDeps import 제거됨: library-build.worker.ts에서 collectDeps가 더 이상 직접 import되지 않음 — buildWatchPaths가 내부에서 호출
- 변경 필터링 동작 동일: 기존 `hasFileAddOrRemove` 인라인 로직 + `lastSourceFilePaths` 교차가 `shouldSkipRebuild(changes.map(c => c.path), hasFileAddOrRemove(changes), lastSourceFilePaths, logger)`로 동일하게 대체됨
- 기존 테스트(library-build-worker.spec.ts) 16건 모두 통과 확인
