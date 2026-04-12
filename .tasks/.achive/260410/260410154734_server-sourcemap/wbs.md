# WBS: sd-cli 서버 dev 모드 sourcemap 지원

## 프로젝트 개요

- **배경:** sd-cli로 소비앱 서버를 dev 모드로 실행할 때, 에러 스택 트레이스가 번들된 `main.js`의 라인으로 표시되어 디버깅이 어려움. esbuild sourcemap 미설정 + Node.js sourcemap 활성화 미설정이 원인.
- **환경:** simplysm 모노레포의 `packages/sd-cli` 패키지
- **전제조건:** 없음
- **기술적 제약:** Node.js 20 (process.setSourceMapsEnabled API 사용 가능), esbuild 번들러
- **참조 자료:**
  - `.tasks/260410154530_debug-server-sourcemap/debug.md` — 근본 원인 분석 결과

## Impact Mapping

- **Goal:** 서버 에러 발생 시 원본 소스 파일명과 라인 번호로 즉시 위치 파악 가능
  - **Actor:** sd-cli로 서버 개발하는 개발자
    - **Impact:** 에러 스택 트레이스를 보고 즉시 원본 소스 위치로 이동할 수 있다
      - **Deliverable:** dev 모드 서버 빌드에 sourcemap 생성 및 런타임 인식 활성화

## Feature Breakdown

### Epic 1. 서버 sourcemap 지원

#### [x] Feature 1.1 dev 모드 서버 sourcemap 활성화

**의존성:** 없음

**범위:**

- esbuild 서버 빌드 옵션에 dev 모드일 때 `sourcemap: "linked"` 추가 (별도 `.map` 파일 생성)
- 서버 런타임 워커에서 main.js import 전에 `process.setSourceMapsEnabled(true)` 호출

**경계:**

- 프로덕션 빌드(pub/build)의 sourcemap 설정은 이 Feature에서 다루지 않음
- PM2 배포 설정의 sourcemap 지원은 이 Feature에서 다루지 않음
- 클라이언트(Vite) 빌드의 sourcemap은 이미 활성화되어 있어 변경 불필요

**근거:**

- 디버그 분석: esbuild `sourcemap` 옵션 미설정 (기본 `false`) — `packages/sd-cli/src/utils/esbuild-config.ts:77-95`
- 디버그 분석: `process.setSourceMapsEnabled()` 미호출 — `packages/sd-cli/src/workers/server-runtime.worker.ts:140-143`
- 클라이언트 Vite watch 빌드에서는 `sourcemap: true` 설정 참조 — `packages/sd-cli/src/utils/vite-config.ts:332`

## 제외 사항

- 프로덕션 빌드 sourcemap — 보안/크기 고려 필요, 별도 Feature로 검토
- PM2 interpreter_args에 --enable-source-maps 추가 — 프로덕션 환경은 별도 검토
