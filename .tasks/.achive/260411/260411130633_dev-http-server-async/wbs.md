# WBS: dev HTTP 서버 비동기 전환 및 개선

## 프로젝트 개요

- **배경:** `dev-http-server.ts`의 HTTP 요청 핸들러가 동기 파일 I/O(`existsSync`, `statSync`, `readFileSync`)를 사용하여 이벤트 루프를 블로킹하고, TOCTOU race condition과 미처리 예외가 존재한다.
- **환경:** simplysm 모노레포, `packages/sd-cli` 패키지. Node.js 20.
- **전제조건:** 기존 dev-http-server의 기능(정적 파일 서빙, SPA fallback, basePath, onRequest 훅)이 정상 동작하는 상태.
- **기술적 제약:** 기존 인터페이스(`DevHttpServer`, `DevHttpServerOptions`) 유지. 기존 사용처(`client.worker.ts`)의 변경 불필요.
- **참조 자료:**
  - `packages/sd-cli/src/utils/dev-http-server.ts` — 수정 대상
  - `packages/sd-cli/tests/utils/dev-http-server.spec.ts` — 단위 테스트
  - `packages/sd-cli/tests/utils/dev-http-server.acc.spec.ts` — 수락 테스트
  - `packages/sd-cli/src/workers/client.worker.ts:297-303` — 사용처 확인

## Impact Mapping

- **Goal:** dev 서버의 파일 서빙 안정성 개선 (이벤트 루프 블로킹 제거, race condition 제거, 에러 내성 확보)
  - **Actor:** sd-cli를 사용하는 개발자
    - **Impact:** dev 서버가 비동기로 동작하여 파일 I/O 중에도 다른 요청(WebSocket HMR 등)을 처리할 수 있다
      - **Deliverable:** dev-http-server.ts 비동기 전환 + 스트리밍 응답 + 에러 핸들링

## Feature Breakdown

### Epic 1. dev HTTP 서버 개선

#### [x] Feature 1.1 비동기 전환 및 개선

**의존성:** 없음

**범위:**

- 동기 파일 I/O → 비동기 전환: `existsSync`/`statSync`/`readFileSync` → `fs.promises.stat`/`fs.createReadStream`
- TOCTOU race condition 제거: "존재 확인 → 읽기" 순서 대신 "stat 시도 → 성공 시 스트리밍, ENOENT 시 fallback" 패턴
- 스트리밍 응답: `readFileSync`(전체 버퍼링) → `fs.createReadStream` + `stream.pipeline`(스트리밍)
- I/O 에러 핸들링: stat/스트림 에러 시 500 응답 반환 (프로세스 크래시 방지)

**경계:**

- `DevHttpServer`/`DevHttpServerOptions` 인터페이스 변경 없음
- `client.worker.ts` 등 사용처 변경 없음
- HTTP/2, gzip 압축, ETag 등은 이 Feature에서 다루지 않음

**근거:**

- 사용자 요청: "비동기 전환 + 추가 개선"
- `dev-http-server.ts:65-74` — 동기 I/O 5곳 (existsSync x2, statSync x1, readFileSync x2)
- TOCTOU: `existsSync(filePath)` true 후 `readFileSync(filePath)` 전에 파일 삭제 시 예외 발생 가능
- 에러 핸들링: 현재 HTTP 핸들러에 try-catch 없어 I/O 예외 시 uncaught exception

## 제외 사항

- **HTTP/2 지원**: dev 서버 특성상 불필요 (사유: 단일 사용자 localhost)
- **gzip 압축**: dev 서버 특성상 불필요 (사유: localhost 대역폭 제한 없음)
- **ETag/조건부 요청**: 이미 `Cache-Control: no-cache` 적용 (사유: dev 모드에서 항상 최신 파일 필요)
