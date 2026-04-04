# Slice 1: glob 경로 수정 + exclude external 추가 — LLM 검증

## 검증 항목
- [x] glob 패턴이 절대 경로 사용: `fsx.glob(path.resolve(distPath, "*.exe"))` (line 337). `cwd` 옵션 제거됨. 코드베이스의 `copy` 함수(core-node fs.ts:190)와 동일한 패턴
- [x] exe 미존재 시 경고 로그 유지: `allExeFiles.length === 0` 체크와 `_logger.warn` 호출이 line 338-340에 그대로 존재
- [x] `_bundleMainProcess` esbuild external에 `this._exclude` 추가: line 250 `external: ["electron", ...builtinModules, ...reinstallDeps, ...this._exclude]`
- [x] `run()` esbuild external에 `this._exclude` 추가: line 124 `external: ["electron", ...builtinModules, ...reinstallDeps, ...this._exclude]`
