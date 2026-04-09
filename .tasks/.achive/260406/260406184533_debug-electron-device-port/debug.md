# 디버그: Electron device 실행 시 Vite 내부 포트로 열리는 문제

## 출처

- **origin:** `direct`
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: Electron 앱이 Fastify 서버 포트로 접속 / 실제: Vite dev server 포트로 접속
- **위치:** `packages/sd-cli/src/commands/device.ts:68`, `packages/sd-cli/src/workers/server-runtime.worker.ts`
- **재현 절차:** `sd.config.ts`에서 `server: "서버패키지명"` 설정 후 `pnpm dev` → 별도 터미널에서 `sd-cli device`

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|     | E1: device.ts:68이 pkgDir(클라이언트) 경로 사용 | E2: .dev-port에 Vite 포트 기록 | E3: 서버 런타임이 .dev-port 미작성 | E4: printServers()가 서버포트/{client}/ 출력 |
|-----|---|---|---|---|
| H1: 잘못된 포트 파일 참조 | C(code) | C(code) | C(code) | C(code) |
| H2: Vite 서빙 설정 문제 | N | N | N | I |

### 결과: 확정 — H1

두 가지 결함:
1. `device.ts:68` — `server: string`일 때 `packages/{client}/dist/.dev-port`(Vite HMR 전용 포트)를 읽지만, `packages/{server}/dist/.dev-port`(Fastify 서버 포트)를 읽어야 함
2. `server-runtime.worker.ts` — 서버 listen 완료 후 `.dev-port`를 기록하지 않아 참조할 파일 자체가 없음

## 해결 방안

### 방안 A: 서버 런타임에서 .dev-port 기록 + device.ts에서 서버 포트 참조

- **설명:**
  1. `server-runtime.worker.ts` — `fs`, `path` import 추가. 모듈 레벨 `mainJsDir` 변수 추가. `start()` 내 listen 완료 후 `path.dirname(info.mainJsPath)`에 `.dev-port` 기록. `cleanup()`에서 `.dev-port` 삭제.
  2. `device.ts:66-78` — `server`가 string일 때 `pathx.posixResolve(cwd, "packages", clientConfig.server)`의 `dist/.dev-port` 참조.
- **장점:** 기존 `.dev-port` 패턴과 완전히 일관. 서버 재시작 시 cleanup→재기록으로 포트 갱신 자동 처리.
- **반론:** `fs`, `path` import 추가 (2줄). 미미한 변경.
- **점수:** 안정성 9/10, 일관성 10/10, 정확성 9/10 → **평균 9.3/10**

### 방안 B: 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** Electron device 실행이 계속 동작하지 않음
- **점수:** 안정성 2/10, 일관성 5/10, 정확성 2/10 → **평균 3/10**

## 선택 결과

**방안 A** (평균 9.3/10)

서버 런타임 워커에서 listen 완료 시 .dev-port 기록, device.ts에서 server가 string이면 서버 패키지의 .dev-port 참조.
