# WBS: Capacitor 빌드 시 copyPublicFiles/writeConfigJson outDir 미적용 버그 수정

## 프로젝트 개요

- **배경:** Capacitor 빌드 시 `outDir`이 `.capacitor/www`로 설정되지만, `copyPublicFiles()`와 `writeConfigJson()`이 `dist/`에 하드코딩되어 public 에셋과 `.config.json`이 잘못된 위치에 기록됨
- **환경:** @simplysm/sd-cli@14.0.42, Node.js 20, Angular 21, Capacitor (Android)
- **전제조건:** 없음
- **기술적 제약:** 기존 `copyPublicFiles`/`watchPublicFiles` 호출부(outDir 미지정)의 동작을 유지해야 함
- **참조 자료:**
  - `.tasks/260414184716_debug-capacitor-outdir/debug.md` — 근본 원인 분석 결과
  - `packages/sd-cli/src/utils/copy-public.ts` — 하드코딩된 `dist/` 경로 (line 16, 62)
  - `packages/sd-cli/src/workers/client.worker.ts` — `copyPublicFiles` 호출 (line 102), `writeConfigJson` 하드코딩 호출 (line 164)
  - GitHub 이슈: kslhunter/simplysm#25

## Impact Mapping

- **Goal:** Capacitor 빌드 산출물이 `.capacitor/www/`에 완전하게 출력되어 네이티브 앱이 정상 동작
  - **Actor:** sd-cli 사용자 (Capacitor 클라이언트 빌드)
    - **Impact:** 빌드 후 수동으로 파일을 복사하지 않고도 Capacitor 앱이 정상 실행됨
      - **Deliverable:** `copyPublicFiles`/`watchPublicFiles`/`writeConfigJson`이 `outDir`을 존중하도록 수정

## Feature Breakdown

### Epic 1. outDir 경로 수정

#### [x] Feature 1.1 copyPublicFiles/watchPublicFiles outDir 매개변수 추가 및 writeConfigJson 호출 수정

**의존성:** 없음

**범위:**

- `copyPublicFiles(pkgDir, includeDev, outDir?)`: 세 번째 옵셔널 매개변수 `outDir` 추가. 미지정 시 기존 `path.join(pkgDir, "dist")` 폴백
- `watchPublicFiles(pkgDir, includeDev, outDir?)`: 동일하게 `outDir` 옵셔널 매개변수 추가. 내부의 `distDir` 및 `onChange` 핸들러 모두 적용
- `client.worker.ts` `build()` 함수: `copyPublicFiles(info.pkgDir, false)` → `copyPublicFiles(info.pkgDir, false, outdir)` (line 102)
- `client.worker.ts` `build()` 함수: `writeConfigJson(path.join(info.pkgDir, "dist"), ...)` → `writeConfigJson(outdir, ...)` (line 164)

**경계:**

- dev watch 모드(`startWatch`)의 `outDir` 처리는 이 Feature에서 다루지 않음 (dev 모드는 항상 `dist/` 사용이 정상)
- `watchPublicFiles`는 현재 dev watch에서만 호출되나, API 일관성을 위해 `outDir` 매개변수를 추가함

**근거:**

- debug.md 분석 결과: `BuildOrchestrator.ts:380-381`에서 `outDir`을 `.capacitor/www`로 정상 설정하여 전달하지만, 하류 함수들이 이를 무시
- GitHub 이슈 kslhunter/simplysm#25

## 제외 사항

- dev watch 모드의 outDir 동적 지정 — 사유: dev 모드는 항상 로컬 `dist/`를 사용하며 Capacitor dev 빌드와 무관
