# 디버그: sd-cli device에서 server가 패키지명(string)일 때 URL 자동 탐지 실패

## 출처

- **origin:** `#18`
- **완료 시 참고:** 수정 완료 후 이슈 close 및 comment 필요

## 에러 증상

- **에러 메시지:** `SdError: --url 옵션이 필요합니다. server가 패키지명으로 설정되어 있습니다: server`
- **위치:** `packages/sd-cli/src/commands/device.ts:64`
- **재현:** sd.config.ts에서 client 패키지의 `server`를 패키지명(string)으로 설정 후 `sd-cli device client-devtool` 실행

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: device.ts:61 number만 분기 | E2: DevWatchOrchestrator에서 ViteEngine.port로 접근 가능 | E3: --url help에 "auto-detected" 명시 |
|----|---|---|---|
| H1: URL resolve 로직 누락 | C(code) | C(code) | C(doc) |
| H2: 미지원 의도 | I -> 폐기 | I -> 폐기 | I -> 폐기 |

### 결과: 확정 -- H1

`device.ts:60-68`에서 `typeof clientConfig.server === "number"`만 처리하고, string(패키지명)인 경우 URL resolve 없이 에러를 던짐. ViteEngine이 포트를 메모리(`this.port`)에만 저장하고 프로세스 경계를 넘어 공유하는 메커니즘이 없어, 별도 프로세스인 device 명령어에서 접근 불가.

## 해결 방안

### 방안 A: 포트 파일 자동 탐지

- **설명:** client.worker에서 Vite dev server 포트 확정 시 `packages/{name}/dist/.dev-port` 파일에 기록. device.ts에서 server가 string일 때 해당 파일을 읽어 URL 자동 생성. ViteEngine.stop() 시 파일 삭제.
- **장점:** 기존 `dist/.config.json` 기록 패턴과 일관, 변경 범위 최소 (3파일)
- **반론:** dev 서버 비정상 종료 시 stale 포트 파일 잔존 가능
- **점수:** 안정성 8 / 근본성 9 / 일관성 9 -> **평균 8.7/10**

### 방안 B: Orchestrator 상태 JSON

- **설명:** DevWatchOrchestrator가 `.dev-state.json`에 전체 포트 맵 기록
- **장점:** 한 파일에서 모든 포트 관리
- **반론:** 새로운 패턴 도입, lock 관리 복잡
- **점수:** 안정성 7 / 근본성 9 / 일관성 6 -> **평균 7.3/10**

### 방안 C: 수행 안 함

- **설명:** 현상 유지, --url 수동 지정
- **장점:** 코드 변경 없음
- **반론:** 이슈 미해결, help 문서와 불일치
- **점수:** 안정성 10 / 근본성 0 / 일관성 3 -> **평균 4.3/10**

## 선택 결과

**방안 A: 포트 파일 자동 탐지** (평균 8.7/10)

변경 지점:
1. `packages/sd-cli/src/workers/client.worker.ts` -- serverReady 시 `dist/.dev-port` 파일에 포트 기록
2. `packages/sd-cli/src/engines/ViteEngine.ts` -- stop() 시 `.dev-port` 파일 삭제
3. `packages/sd-cli/src/commands/device.ts` -- server가 string일 때 포트 파일 읽어 URL 생성
