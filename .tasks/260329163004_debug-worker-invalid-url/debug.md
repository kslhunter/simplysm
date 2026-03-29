# 디버그: SdWorker 번들 환경에서 TypeError: Invalid URL 발생

## 출처

- **origin:** `kslhunter/simplysm#7`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 에러 증상

- **에러 메시지:** `TypeError: Invalid URL`
- **위치:** `SdWorker.ts:35` (`fileURLToPath(filePath)` 호출)
- **재현:** sd-cli로 서버를 번들 빌드한 뒤, 클라이언트에서 30KB 초과 바이너리 버퍼를 포함한 WebSocket 메시지를 전송하면 `SdServiceProtocolWrapper.decodeAsync`가 워커를 생성하려 할 때 발생

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: `TypeError: Invalid URL` at `fileURLToPath` | E2: 스택에서 prod 분기의 `fileURLToPath` 호출 | E3: Plugin이 상대 경로로 치환 확인 | E4: `SdServerBundler`에 Plugin 적용됨 |
|----|---|---|---|---|
| H1: SdWorkerPathPlugin이 `import.meta.resolve()`를 상대 경로 문자열로 치환하여 file:// URL 계약 위반 | C | C | C | C |
| H2: 번들에서 `import.meta.filename`이 잘못되어 SdWorker가 개발 모드로 진입 | I -> 폐기 | I -> 폐기 | N | N |

### 결과: 확정 -- H1

`SdWorkerPathPlugin`이 `import.meta.resolve()` (file:// URL 반환 API)를 상대 경로 문자열(`"./workers/..."`)로 치환하지만, `SdWorker` 생성자는 `fileURLToPath()`로 file:// URL만 처리할 수 있어 발생.

## 해결 방안

### 방안 A: SdWorkerPathPlugin의 치환 결과를 file:// URL로 유지

- **설명:** `SdWorkerPathPlugin.ts:56`의 치환 결과를 `new URL(..., import.meta.url).href`로 변경하여 `import.meta.resolve()`가 보장하는 file:// URL 계약을 유지
- **장점:** 원래 계약을 유지하므로 SdWorker 코드 변경 불필요, 변경 범위 1줄
- **반론:** 클라이언트 패턴에서 이중 `new URL()` 래핑 발생 (기능에는 무영향)
- **점수:** 안정성 9, 근본성 10, 부작용 8, 일관성 9 -> **평균 9.0/10**

### 방안 B: SdWorker에서 입력 형식 자동 감지

- **설명:** `SdWorker` 생성자에서 `file://` 여부 감지 후 일반 경로면 `import.meta.url` 기준 resolve
- **장점:** SdWorker가 다양한 입력 형식에 대응 가능
- **반론:** 원인(Plugin 출력)이 아닌 증상(SdWorker 입력 처리)을 수정하는 구조
- **점수:** 안정성 8, 근본성 7, 부작용 9, 일관성 7 -> **평균 7.75/10**

### 방안 C: 수행 안 함

- **설명:** 변경 없이 현재 상태 유지
- **장점:** 부작용 없음
- **반론:** 번들 환경에서 워커 생성 불가 버그가 그대로 남음
- **점수:** 안정성 3, 근본성 1, 부작용 10, 일관성 5 -> **평균 4.75/10**

## 선택 결과

**방안 A** (평균 9.0/10)

`SdWorkerPathPlugin.ts:56`에서 치환 결과를 `new URL(..., import.meta.url).href`로 변경하여 file:// URL 계약을 유지한다.
