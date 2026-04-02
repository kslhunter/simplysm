# 디버그: legacy HTTP 서버에서 .wasm 파일 MIME 타입 누락

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 없음

## 에러 증상

- **에러 메시지:** `wasm streaming compile failed: TypeError: Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type. Expected 'application/wasm'.`
- **위치:** `packages/sd-cli/src/workers/client.worker.ts:85-104` (MIME_TYPES 맵)
- **재현:** `legacyModule: true` 설정으로 dev 모드 실행 시 `.wasm` 파일 로드

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: 에러 메시지 "Incorrect response MIME type" | E2: legacy-dev-mode 태스크 영향 | E3: MIME_TYPES에 .wasm 없음 | E4: fallback이 octet-stream |
|----|---------------------------------------------|-------------------------------|---------------------------|---------------------------|
| H1: legacy HTTP 서버 MIME_TYPES 누락 | C(code) | C(code) | C(code) | C(code) |
| H2: service-server MIME 미설정 | C(infer) | I → 폐기 | N | N |

### 결과: 확정 — H1

legacy HTTP 서버 `MIME_TYPES` 맵(`client.worker.ts:85-104`)에 `.wasm` 확장자가 없어서 fallback `"application/octet-stream"`으로 서빙됨. `WebAssembly.compile()`은 `application/wasm`을 요구.

## 해결 방안

### 방안 A: MIME_TYPES에 .wasm 추가

- **설명:** `".wasm": "application/wasm"` 한 줄 추가
- **장점:** 최소 변경, 정확한 원인 위치 수정
- **반론:** 향후 다른 확장자 누락 시 같은 문제 반복 가능
- **점수:** 안정성 9, 정확성 10, 근본성 8 → **평균 9.0/10**

### 방안 B: mime 라이브러리 도입

- **설명:** 수동 MIME_TYPES 매핑을 제거하고 `mime` 라이브러리로 동적 Content-Type 결정
- **장점:** 모든 확장자 자동 커버, 향후 누락 걱정 없음
- **반론:** 새 의존성 추가
- **점수:** 안정성 8, 정확성 10, 근본성 10 → **평균 9.3/10**

### 방안 C: 수행 안 함

- **설명:** fallback이 동작하므로 현 상태 유지
- **장점:** 변경 없음
- **반론:** 콘솔 경고 지속, streaming compile 성능 손해
- **점수:** 안정성 10, 정확성 5, 근본성 3 → **평균 6.0/10**

## 선택 결과

**방안 B: mime 라이브러리 도입** (평균 9.3/10)

사용자가 `mime` 라이브러리 사용을 선택. 수동 매핑 대신 라이브러리로 전환하여 향후 확장자 누락 문제를 근본적으로 방지.
