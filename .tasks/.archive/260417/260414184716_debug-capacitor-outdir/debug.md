# 디버그: Capacitor 빌드 시 copyPublicFiles()와 writeConfigJson()이 outDir을 무시하고 dist/에 기록됨

## 출처

- **origin:** `kslhunter/simplysm#25`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: `.capacitor/www/`에 .config.json, favicon, public 에셋 기록 / 실제: `dist/`에 기록됨
- **위치:** `packages/sd-cli/src/utils/copy-public.ts:16`, `packages/sd-cli/src/workers/client.worker.ts:102,164`
- **재현 절차:** `sd.config.ts`에 `target: "client"` + `capacitor` 설정이 있는 패키지에서 `pnpm build` 실행

## 근본 원인

두 가지 독립된 하드코딩 버그:

1. **`copyPublicFiles()`** (`copy-public.ts:16`): 출력 디렉토리를 매개변수로 받지 않고 `path.join(pkgDir, "dist")`로 하드코딩. `BuildOrchestrator`가 `outDir`을 `.capacitor/www`로 설정하여 엔진에 전달하지만, `copyPublicFiles()`는 이를 무시.

2. **`writeConfigJson()` 호출** (`client.worker.ts:164`): `build()` 함수 내에서 이미 `const outdir = info.outDir ?? path.join(info.pkgDir, "dist")`로 올바르게 계산된 변수가 있음에도, `writeConfigJson(path.join(info.pkgDir, "dist"), ...)`로 하드코딩하여 호출.

참고: dev watch의 `writeConfigJson(outdir, ...)` (line 403)은 정상.

## 해결 방안

- **방안:** `copyPublicFiles`/`watchPublicFiles`에 `outDir` 옵셔널 매개변수 추가 + `writeConfigJson` 호출 수정
- **설명:**
  - `copy-public.ts`: `copyPublicFiles(pkgDir, includeDev, outDir?)` — `outDir ?? path.join(pkgDir, "dist")` 사용
  - `copy-public.ts`: `watchPublicFiles(pkgDir, includeDev, outDir?)` — 동일 패턴
  - `client.worker.ts:102`: `copyPublicFiles(info.pkgDir, false)` → `copyPublicFiles(info.pkgDir, false, outdir)`
  - `client.worker.ts:164`: `writeConfigJson(path.join(info.pkgDir, "dist"), ...)` → `writeConfigJson(outdir, ...)`
- **선택 사유:** 기존 호출부(outDir 미지정) 호환 유지, 최소 변경으로 근본 원인 해결
