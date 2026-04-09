# WBS: Electron main process CJS→ESM 전환

## 프로젝트 개요

- **배경:** sd-cli의 Electron main process 번들링이 `format: "cjs"`로 설정되어, ESM-only 또는 top-level await를 사용하는 의존성을 번들링하지 못함. lru-cache 11.3.0이 `diagnostics_channel` 계측을 위해 top-level await를 도입하면서 소비앱의 Electron 실행이 실패함.
- **환경:** sd-cli 패키지 (`packages/sd-cli`), Electron 41+, esbuild, Node 20+
- **전제조건:** Electron 28+에서 ESM main process 지원
- **기술적 제약:** 소비앱의 `electron-main.ts`가 CJS 패턴(`__dirname`, `require()` 등)을 사용할 수 있음 → `createRequire` 배너로 해결
- **참조 자료:**
  - `.tasks/260406163130_debug-electron-tla-cjs/debug.md` — 근본 원인 분석 및 해결 방안 선택 결과
  - `packages/sd-cli/src/electron/electron.ts` — 수정 대상 파일
  - `packages/sd-cli/src/utils/esbuild-config.ts` — 서버 패키지의 ESM 번들링 패턴 참조

## Impact Mapping

- **Goal:** Electron main process가 ESM 의존성을 정상 번들링하여 소비앱의 Electron 실행 성공
  - **Actor:** sd-cli 사용자 (소비앱 개발자)
    - **Impact:** `pnpm sd-cli device`로 Electron 앱을 정상 실행/빌드할 수 있다
      - **Deliverable:** Electron esbuild 설정 ESM 전환

## Feature Breakdown

### Epic 1. Electron ESM 전환

#### [x] Feature 1.1 esbuild format CJS→ESM 전환

**의존성:** 없음

**범위:**

- `run()` 메서드의 esbuild context 설정에서 `format: "cjs"` → `format: "esm"` 변경
- `_bundleMainProcess()` 메서드의 esbuild build 설정에서 `format: "cjs"` → `format: "esm"` 변경
- ESM 배너 추가 (`createRequire` 등 CJS 호환 코드)
- `_setupNpmConf()`에서 생성하는 `.electron/src/package.json`에 `"type": "module"` 추가

**경계:**

- 소비앱의 `electron-main.ts` 소스 코드 수정은 이 Feature에서 다루지 않음
- Electron builder 설정 변경은 이 Feature에서 다루지 않음

**근거:**

- 디버그 분석: `.tasks/260406163130_debug-electron-tla-cjs/debug.md` — 방안 A 선택
- 서버 패키지 ESM 패턴: `esbuild-config.ts:77-96` — 동일한 ESM 배너 패턴 사용 중

## 제외 사항

- Electron builder 설정 변경 — ESM 전환과 무관 (사유: 범위 초과)
- esbuild conditions/mainFields 우회 방안 — 근본 해결이 아님 (사유: 디버그 분석에서 방안 B로 탈락)
