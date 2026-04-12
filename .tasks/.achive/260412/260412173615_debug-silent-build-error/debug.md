# 디버그: sd-cli dev 클라이언트 빌드 에러가 무음으로 실패하여 404 발생

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: `http://localhost:40180/client-admin/` 접속 시 Angular 앱 로드 / 실제: 404 Not Found (plain text)
- **위치:** `packages/sd-cli/src/workers/client.worker.ts:267-286`, `packages/sd-cli/src/engines/EsbuildClientEngine.ts:124`
- **재현 절차:** 소비앱(adtek)에서 `pnpm dev` → 브라우저에서 `http://localhost:40180/client-admin/` 접속

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|                              | E1: 404 응답이 plain "Not Found" | E2: dist/에 JS/CSS/index.html 없음 | E3: .config.json, .dev-port 존재 | E4: 프록시 정상 등록 (port 61342) | E5: 터미널에 에러 미표시 |
| ---------------------------- | -------------------------------- | ----------------------------------- | -------------------------------- | --------------------------------- | ------------------------ |
| H1: 빌드 에러 무음 실패      | C(code): dev HTTP server 응답    | C(code): esbuild 출력 없음          | C(code): 빌드 후 단계 실행됨     | C(code): serverReady 전송됨       | C(code): 3단계 블랙홀     |
| ~~H2: basePath 불일치~~      | C(code)                          | I: 빌드 성공 시 파일 존재해야 함     | N                                | N                                 | N                        |
| ~~H3: wildcard 우선 매칭~~   | I: handleStaticFile은 HTML 반환  | N                                   | N                                | N                                 | N                        |

### 결과: 확정 — H1

에러가 숨겨지는 3단계 블랙홀:
1. **esbuild `logLevel: "silent"`** (`esbuild-client-config.ts:169`) — esbuild 에러 출력 억제
2. **초기 빌드 에러 미보고** (`client.worker.ts:268`) — `!isInitialBuild` 조건으로 초기 빌드 에러가 "build" 이벤트로 전송되지 않음. `initialBuildResolve`에 errors 필드 미포함
3. **Engine 반환값 무시** (`EsbuildClientEngine.ts:124`) — `startWatch`가 `Promise<void>`이므로 워커 반환값(success/errors) 무시

## 해결 방안

### 방안 C: A + B 결합 (선택됨)

**A: 초기 빌드 에러 보고 수정**
- `client.worker.ts` onEnd에서 초기 빌드 시에도 errors 필드 포함
- `EsbuildClientEngine.startWatch`에서 반환값 확인 후 에러 로깅

**B: esbuild logLevel을 dev 모드에서 "warning"으로 변경**
- `esbuild-client-config.ts`의 logLevel을 dev 모드에서 "warning"으로 설정

- **장점:** 에러가 두 경로(esbuild 직접 + sd-cli 이벤트)로 표면화
- **반론:** 에러 중복 표시 가능
- **점수:** 정확성 9/10, 완전성 9/10, 변경 리스크 3/10 → **평균 7.0/10**

## 선택 결과

**방안 C** (평균 7.0/10)

사용자가 방안 C를 선택함. 에러 보고 구조 수정 + esbuild logLevel 변경을 함께 적용하여 숨겨진 빌드 에러를 표면화한다.
