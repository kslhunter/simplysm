# WBS: Electron device 명령 서버 포트 참조 수정

## 프로젝트 개요

- **배경:** `sd-cli device`로 Electron 앱 실행 시, Vite dev server 포트(HMR 전용)로 열리는 버그. `server: string`일 때 Fastify 서버 포트를 사용해야 함.
- **환경:** sd-cli 빌드 도구 (`packages/sd-cli`)
- **전제조건:** 없음
- **기술적 제약:** 기존 `.dev-port` 파일 패턴과 일관성 유지
- **참조 자료:**
  - `.tasks/260406184533_debug-electron-device-port/debug.md` — 근본 원인 분석 결과

## Impact Mapping

- **Goal:** `sd-cli device`로 Electron 앱이 올바른 서버 포트로 접속하도록 수정
  - **Actor:** sd-cli 사용 개발자
    - **Impact:** Electron device 실행 시 별도 `--url` 지정 없이 정상 동작
      - **Deliverable:** server-runtime.worker.ts에 `.dev-port` 기록 + device.ts 서버 포트 참조

## Feature Breakdown

### Epic 1. device 명령 서버 포트 수정

#### [x] Feature 1.1 서버 런타임 `.dev-port` 기록 및 device 포트 참조 수정

**의존성:** 없음

**범위:**

- `server-runtime.worker.ts`에서 서버 listen 완료 후 `path.dirname(mainJsPath)`에 `.dev-port` 기록
- `server-runtime.worker.ts`의 cleanup에서 `.dev-port` 삭제
- `device.ts`에서 `server: string`일 때 `packages/{서버패키지명}/dist/.dev-port` 참조로 변경

**경계:**

- 클라이언트 `.dev-port` 기록 로직(`client.worker.ts`)은 수정하지 않음
- Capacitor 흐름은 변경 없음 (동일 URL 결정 로직 공유)

**근거:**

- debug.md 분석 결과: device.ts:68이 클라이언트 Vite 포트를 읽는 버그 확인
- server-runtime.worker.ts가 .dev-port를 기록하지 않는 결함 확인

## 제외 사항

- 없음
