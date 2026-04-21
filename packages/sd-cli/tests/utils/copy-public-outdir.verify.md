# copyPublicFiles/writeConfigJson outDir 지원 — LLM 검증

## 검증 항목

- `client.worker.ts:164`에서 `writeConfigJson(outdir, ...)` 사용 확인 — `writeConfigJson(outdir, info.configs)` (기존 `path.join(info.pkgDir, "dist")` 제거됨)
- `client.worker.ts:102`에서 `copyPublicFiles(info.pkgDir, false, outdir)` 전달 확인 — `outdir` 변수는 line 99에서 `info.outDir ?? path.join(info.pkgDir, "dist")`로 계산됨
- `server-build.worker.ts`의 호출이 변경되지 않음 확인 — line 225: `copyPublicFiles(info.pkgDir, false)`, line 374: `watchPublicFiles(info.pkgDir, true)` (2인자 호출 유지)
- `copy-public.ts`의 `watchPublicFiles` 내부 `copyPublicFiles` 호출에 `outDir` 전달 확인 — line 67: `await copyPublicFiles(pkgDir, includeDev, outDir)`
