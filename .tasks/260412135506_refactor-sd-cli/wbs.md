# WBS: sd-cli Electron esbuild 설정 중복 제거

## 프로젝트 개요

- **배경:** sd-cli 리팩토링 분석(STRUCT-001)에서 `electron.ts` 내 esbuild 번들링 설정이 `run()`과 `_bundleMainProcess()`에서 중복 구성되는 이슈가 발견됨
- **환경:** Simplysm pnpm 모노레포, `packages/sd-cli` 패키지
- **전제조건:** 기존 Electron 빌드/실행 동작이 변경 없이 유지되어야 함
- **기술적 제약:** TypeScript ESM, esbuild API 사용
- **참조 자료:**
  - `.tasks/260412135506_refactor-sd-cli/refactor.md` — 리팩토링 분석 리포트 (STRUCT-001 상세)
  - `packages/sd-cli/src/electron/electron.ts` — 수정 대상 파일

## Impact Mapping

- **Goal:** esbuild 설정 변경 시 한 곳만 수정하면 되도록 하여 불일치 위험 제거
  - **Actor:** sd-cli 개발자
    - **Impact:** Electron 빌드 설정 변경 시 동기화 실수 없이 빠르게 수정
      - **Deliverable:** `run()`과 `_bundleMainProcess()` 공통 esbuild 옵션을 private 메서드로 추출

## Feature Breakdown

### Epic 1. Electron esbuild 설정 리팩토링

#### [x] Feature 1.1 esbuild 공통 옵션 추출

**의존성:** 없음

**범위:**

- `run()`과 `_bundleMainProcess()`에서 공유하는 esbuild 옵션(entryPoint 해석, builtinModules, reinstallDeps, envBanner, bannerJs, esbuild 옵션 객체)을 private 메서드로 추출
- `run()`이 추출된 메서드를 호출하고 watch용 plugins와 `ELECTRON_DEV_URL` env만 추가
- `_bundleMainProcess()`가 추출된 메서드를 호출하고 one-shot `esbuild.build()`로 실행

**경계:**

- `run()` 메서드의 Electron 프로세스 스폰/재시작 로직은 변경하지 않음
- `build()` 메서드의 웹 에셋 복사, electron-builder 실행 등은 변경하지 않음
- 기존 테스트가 있다면 동작 유지

**근거:**

- 리팩토링 분석 리포트 STRUCT-001: "공통 설정이 동기화되지 않으면 한쪽만 수정되는 불일치가 발생할 수 있다"
- `electron.ts:96-141` (run의 esbuild 설정)과 `electron.ts:288-313` (_bundleMainProcess의 esbuild 설정)에서 동일한 8개 키가 중복

## 제외 사항

- 없음
