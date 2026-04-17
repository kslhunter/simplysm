# 디버그: onMessage decode 실패 시 pendingRequest 미해결로 hang

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 없음

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: `queryable.execute()` 호출 시 서버 응답 또는 에러가 반환됨 / 실제: Promise가 resolve/reject 되지 않고 영원히 대기 후 "Worker 작업 시간 초과" 오류 발생
- **위치:** `packages/service-client/src/transport/service-transport.ts:94-95`
- **재현 절차:** Angular 소비앱에서 ORM 쿼리 실행 → 서버 응답이 30KB 초과 시 Worker decode 경로 진입 → Worker 타임아웃(60초) 발생 → onMessage async 함수가 throw하지만 EventEmitter가 catch하지 않음 → pendingRequest 미해결 → hang

## 근본 원인

2가지 문제가 복합적으로 작용:

1. **Worker 에러 미처리 (주 원인):** `client-protocol-wrapper.ts`의 `getWorker()`에서 `worker.onerror`를 설정하지 않아, Worker 스크립트 로드 실패/초기화 에러 시 모든 `runWorker()` 호출이 60초 타임아웃까지 대기. Worker가 아예 응답을 안 하므로 encode 단계에서 60초 hang 발생.

2. **decode 에러 미전달 (부 원인):** `service-transport.ts:94`에서 `protocol.decode()` 호출이 try-catch 밖에 위치하여, decode 실패 시 해당 요청의 pendingRequest가 미해결.

## 해결 방안

### 수정 1: Worker 에러 핸들링 + fallback
- **파일:** `client-protocol-wrapper.ts`, `browser-compat.ts`
- **설명:** `WorkerLike` 인터페이스에 `onerror` 추가. `getWorker()`에서 `worker.onerror` 핸들러 설정 — Worker 실패 시 대기 중인 모든 요청 즉시 reject + `workerAvailable = false`로 이후 메인 스레드 fallback.

### 수정 2: decode 에러 시 해당 요청에 즉시 에러 전달
- **파일:** `service-transport.ts`
- **설명:** 바이너리 헤더(0-16바이트)에서 uuid를 선추출한 뒤, `protocol.decode()`를 try-catch로 감싸서 실패 시 해당 uuid의 pendingRequest를 즉시 reject.
