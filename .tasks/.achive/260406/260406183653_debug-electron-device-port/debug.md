# 디버그: Electron device 실행 시 Vite 내부 포트로 열리는 문제

## 출처

- **origin:** `direct`
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: Electron 앱이 Fastify 서버 포트로 접속 / 실제: Vite dev server 포트로 접속
- **위치:** `packages/sd-cli/src/commands/device.ts:68`
- **재현 절차:** `sd.config.ts`에서 client의 `server`를 서버 패키지명(string)으로 설정 후 `sd-cli device` 실행

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|     | 증거1: device.ts가 client .dev-port 읽음 | 증거2: .dev-port에 Vite 포트 기록 | 증거3: 서버는 .dev-port 미작성 | 증거4: 서버가 Vite를 프록시 |
|-----|---|---|---|---|
| H1: device.ts가 잘못된 포트 파일 참조 | C(code) | C(code) | C(code) | C(code) |
| H2: Vite dev server 서빙 설정 문제 | N | N | N | I |

### 결과: 확정 — H1

`device.ts`가 `server`가 string(서버 패키지명)일 때 **클라이언트** 패키지의 `.dev-port`(Vite dev server 포트)를 읽지만, **Fastify 서버** 포트를 읽어야 한다. 서버 런타임 워커는 포트를 파일로 기록하지 않아 참조할 서버 포트 파일이 없다.

## 해결 방안

### 방안 A: 서버 런타임에 .dev-port 기록 + device.ts에서 서버 포트 참조

- **설명:**
  1. `server-runtime.worker.ts` — 서버 listen 완료 시 `packages/{serverName}/dist/.dev-port` 기록
  2. `device.ts` — `server`가 string이면 해당 서버 패키지의 `.dev-port`에서 포트 읽기
- **장점:** 기존 `.dev-port` 패턴과 일관성 유지, 최소 변경량
- **반론:** 서버 런타임 워커에 파일 I/O 추가 필요 (클라이언트 워커에서 이미 동일 패턴 사용 중)
- **점수:** 안정성 9/10, 일관성 9/10, 유지보수성 9/10 → **평균 9/10**

### 방안 B: 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** Electron device 실행이 계속 동작하지 않음
- **점수:** 안정성 2/10, 일관성 5/10, 유지보수성 5/10 → **평균 4/10**

## 선택 결과

**방안 A** (평균 9/10)

서버 런타임 워커에서 listen 완료 시 `.dev-port` 기록, device.ts에서 `server`가 string이면 서버 패키지의 `.dev-port` 참조.
