# node_modules 내 파일 변경은 무시된다 — LLM 검증

## 검증 항목

- [x] `FsWatcher.watch`에 `ignored` 옵션이 전달된다: `vite-scope-watch-plugin.ts:64-66`에서 `{ ignored: ["**/node_modules", "**/.cache", "**/tests"] }` 옵션이 2번째 인자로 전달됨을 확인
- [x] `FsWatcher.watch`가 `chokidar.ChokidarOptions`를 받는다: `core-node/src/features/fs-watcher.ts:87`에서 `static async watch(paths: string[], options?: chokidar.ChokidarOptions)` 시그니처 확인. chokidar의 `ignored` 옵션은 glob 패턴 배열을 지원
- [x] watch 경로가 `dist/`가 아닌 패키지 루트: `vite-scope-watch-plugin.ts:47-51`에서 `path.join(options.pkgDir, "node_modules", ...dep.packageName.split("/"))` 확인 — `dist` suffix 없음
