# 디버그: import_meta.resolve is not a function (Worker 경로 변환 미실행)

## 에러 증상

- **에러 메시지:** `TypeError: import_meta.resolve is not a function`
- **위치:** `packages/sd-service-client/src/protocol/SdServiceClientProtocolWrapper.ts:34`
- **재현:** Angular 앱에서 WebSocket으로 30KB 이상 응답 수신 시 발생. 30KB 미만에서는 메인 스레드 처리로 정상 동작.

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: 에러가 `import_meta` (underscore form) | E2: 플러그인 line 76 출력이 `import.meta.resolve()` | E3: `createSdNgPlugin` onLoad가 .ts 선점 | E4: target=Chrome>=61 | E5: >30KB만 발생 |
|----|-------------------------------------------|-----------------------------------------------------|------------------------------------------|-----------------------|-----------------|
| H1: createSdNgPlugin이 .ts 선점하여 SdWorkerPathPlugin 미실행 | C | N | C | C | C |
| H2: SdWorkerPathPlugin 변환 결과에 import.meta.resolve 유지 | C | C | I -> 폐기 | C | C |
| H3: 브라우저가 import.meta.resolve API 미지원 | I -> 폐기 | N | N | N | C |

### 결과: 확정 -- H1

**근본 원인 메커니즘:**

1. `createSdNgPlugin`이 플러그인 배열에서 `SdWorkerPathPlugin`보다 앞에 등록됨 (`SdNgBundler.ts:564` vs `568`)
2. `createSdNgPlugin`의 `onLoad({ filter: /\.ts$/ })`가 모든 `.ts` 파일에 대해 결과를 반환 (`createSdNgPlugin.ts:85-106` -- `null` 반환 경로 없음)
3. esbuild는 첫 번째 `onLoad` 결과를 채택하므로, `SdWorkerPathPlugin`의 `onLoad`는 `.ts` 파일에 대해 절대 호출되지 않음
4. 결과: 워커 파일이 별도 빌드되지 않고, `import.meta.resolve()` 경로가 변환되지 않음
5. esbuild target이 `Chrome >= 61`이므로 `import.meta`를 `import_meta` plain object로 polyfill -- `resolve` 메서드 없음 -> TypeError

**잠재적 2차 버그:** H2는 현재 에러의 직접 원인은 아니지만, H1 해결 후에도 `SdWorkerPathPlugin.ts:76`의 변환 결과가 `import.meta.resolve()`를 유지하므로 동일 에러가 재발함. H1과 함께 수정 필요.

## 해결 방안

### 방안 A: 워커 변환 함수 추출 + createSdNgPlugin 통합

- **설명:** `SdWorkerPathPlugin`의 텍스트 변환 로직을 순수 함수로 추출하고, `createSdNgPlugin`의 `onLoad` 내에서 TypeScript 컴파일 후 이 함수를 호출한다. 변환 시 `import.meta.resolve("path")` -> `"path"` string literal로 출력하여 런타임 `import.meta.resolve()` 의존성을 제거한다.
- **장점:** Angular 파이프라인 내 자연스러운 통합, 서버/클라이언트 빌드 모두 동일 함수 사용 가능
- **반론:** `createSdNgPlugin`이 워커 변환 의존성을 가지게 되어 결합도 증가
- **점수:** 안정성 8, 정확성 9, 일관성 9 -> **평균 8.7/10**

### 방안 B: 워커 사용 제거

- **설명:** `SdServiceClientProtocolWrapper`에서 워커 분기 로직을 제거하고, 모든 크기의 메시지를 메인 스레드에서 decode
- **장점:** 빌드 파이프라인 변경 불필요, 즉시 에러 해결, 코드 단순화
- **반론:** 30KB 이상 응답 시 메인 스레드 블로킹으로 UI 프리징 가능. 워커 도입의 원래 목적을 포기하는 성능 퇴행
- **점수:** 안정성 5, 정확성 7, 일관성 4 -> **평균 5.3/10**

### 방안 C: 수행 안 함

- **설명:** 현재 상태 유지
- **장점:** 변경 없으므로 새로운 위험 없음
- **반론:** 30KB 이상 응답에서 TypeError가 계속 발생하여 서비스 장애
- **점수:** 안정성 10, 정확성 0, 일관성 0 -> **평균 3.3/10**

## 선택 결과

**방안 A** (평균 8.7/10)

워커 변환 함수를 추출하여 `createSdNgPlugin` 내부에서 호출하고, 변환 시 `import.meta.resolve()` 대신 string literal을 출력한다.

### 수정 대상 파일

- `packages/sd-cli/src/pkg-builders/commons/SdWorkerPathPlugin.ts` -- 변환 함수 추출 + line 76 출력 변경
- `packages/sd-cli/src/pkg-builders/client/createSdNgPlugin.ts` -- onLoad에서 워커 변환 함수 호출
