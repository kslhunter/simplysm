# @simplysm/service-server

Fastify + WebSocket 기반 서비스 서버. 클라이언트(`@simplysm/service-client`)와 짝으로 RPC·이벤트 푸시·파일 업로드·정적 서빙·JWT 인증을 단일 포트로 제공한다.

## 사용 트리거 인덱스

| 트리거 | 자료 |
| --- | --- |
| 서버 인스턴스 생성·기동·종료, 이벤트 emit, JWT 토큰 발급/검증, `ServiceServerOptions`(`rootPath`/`port`/`ssl`/`auth`/`services`/`legacyV1Handlers`) | [server.md](./server.md) |
| 사용자 서비스 정의(`defineService`), `ServiceContext`, `ServiceMethods` 타입 추출, `createServiceContext`, `getServiceAuthPermissions` | [define-service.md](./define-service.md) |
| 인증 래퍼 `auth()` (서비스/메서드 레벨, 역할 제한), `AuthTokenPayload`, `signJwt`/`verifyJwt`/`decodeJwt` | [auth.md](./auth.md) |
| 빌트인 서비스: `OrmService`, `AutoUpdateService`, `AppStructureService`, V1 레거시 자동 업데이트 핸들러 | [builtin-services.md](./builtin-services.md) |
| 내부 전송 계층(`/api/:service/:method`·`/upload`·정적 서빙, WebSocket 핸들러, 프로토콜 래퍼/워커, `ServiceSocket`, `getConfig`) — 직접 사용 시 | [internals.md](./internals.md) |
