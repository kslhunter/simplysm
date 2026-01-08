# service-server 마이그레이션 워크플로우

> `sd-service-server` → `service-server` 완전 재구축
>
> **의존성**: `service-common` (완료), `core-common`, `core-node`, `orm-common`, `orm-node`

---

## 개요

### 마이그레이션 방향

```
레거시 (27 파일)
    ↓ V1 제거 + 미들웨어 대체
    ↓ Sd 접두사 제거
    ↓ 케밥케이스 파일명
    ↓ pino 로깅
신규 (25 파일)
```

### 의존성 구조

```
service-server
    ├── @simplysm/service-common   (프로토콜, 타입)
    ├── @simplysm/core-common      (Uuid, JsonConvert, LazyGcMap, DateTime)
    ├── @simplysm/core-node        (FsUtils, SdFsWatcher, SdWorker)
    ├── @simplysm/orm-common       (타입만)
    ├── @simplysm/orm-node         (DbConnFactory)
    └── pino                       (로깅)
```

---

## 결정 사항

| 항목 | 결정 | 비고 |
|------|------|------|
| 네이밍 | `Sd` 접두사 제거 | `SdServiceServer` → `ServiceServer` |
| 로깅 | `pino` 직접 사용 | `SdLogger` 제거 |
| reflect-metadata | ❌ 사용 안함 | WeakMap 패턴으로 대체 |
| OrmService HTTP | ❌ WebSocket 전용 | HTTP 호출 시 에러 |
| bulkUpsert | ❌ 제거 | bulkInsert만 유지 |
| V1 레거시 명령어 | `"SdAutoUpdateService.getLastVersion"` | 레거시 명칭 유지 |
| 파일명 | 케밥케이스 | `service-server.ts` |

---

## Phase 1: 프로젝트 구조 설정 ✅ 완료

- [x] `packages/service-server/package.json`
- [x] `packages/service-server/tsconfig.json`
- [x] `packages/service-server/CLAUDE.md`
- [x] `packages/service-server/src/index.ts`

---

## Phase 2: 핵심 모듈 마이그레이션 ✅ 완료

- [x] `types/server-options.ts` - IServiceServerOptions
- [x] `auth/auth-token-payload.ts` - IAuthTokenPayload
- [x] `auth/auth.decorators.ts` - @Authorize (WeakMap 패턴)
- [x] `auth/jwt-manager.ts` - JwtManager
- [x] `core/service-base.ts` - ServiceBase
- [x] `core/service-executor.ts` - ServiceExecutor

---

## Phase 3: 전송 계층 마이그레이션 ✅ 완료

- [x] `transport/socket/websocket-handler.ts` - WebSocketHandler
- [x] `transport/socket/service-socket.ts` - ServiceSocket
- [x] `transport/http/http-request-handler.ts` - HttpRequestHandler
- [x] `transport/http/upload-handler.ts` - UploadHandler
- [x] `transport/http/static-file-handler.ts` - StaticFileHandler

---

## Phase 4: 빌트인 서비스 마이그레이션 ✅ 완료

- [x] `services/orm-service.ts` - OrmService (WebSocket 전용)
- [x] `services/crypto-service.ts` - CryptoService
- [x] `services/smtp-service.ts` - SmtpService
- [x] `services/auto-update-service.ts` - AutoUpdateService

---

## Phase 5: 유틸리티 및 프로토콜 ✅ 완료

- [x] `utils/config-manager.ts` - ConfigManager
- [x] `protocol/protocol-wrapper.ts` - ProtocolWrapper
- [x] `protocol/protocol.worker-types.ts`
- [x] `workers/service-protocol.worker.ts`

---

## Phase 6: V1 레거시 미들웨어 ✅ 완료

- [x] `legacy/v1-auto-update-handler.ts` - auto-update만 지원

---

## Phase 7: 메인 서버 클래스 ✅ 완료

- [x] `service-server.ts` - ServiceServer

---

## Phase 8: index.ts 및 내보내기 ✅ 완료

- [x] 모든 모듈 export 구성

---

## 검증 ✅ 완료

```bash
# 타입체크 - 에러 없음
npx tsc --noEmit -p packages/service-server/tsconfig.json

# ESLint - 에러 없음
npx eslint "packages/service-server/**/*.ts"
```

---

## 파일 매핑 요약

| 레거시 파일 | 신규 파일 | 상태 |
|------------|----------|------|
| `SdServiceServer.ts` | `service-server.ts` | ✅ |
| `types/ISdServiceServerOptions.ts` | `types/server-options.ts` | ✅ |
| `auth/auth.decorators.ts` | `auth/auth.decorators.ts` | ✅ |
| `auth/IAuthTokenPayload.ts` | `auth/auth-token-payload.ts` | ✅ |
| `auth/SdServiceJwtManager.ts` | `auth/jwt-manager.ts` | ✅ |
| `core/SdServiceBase.ts` | `core/service-base.ts` | ✅ |
| `core/SdServiceExecutor.ts` | `core/service-executor.ts` | ✅ |
| `transport/socket/SdWebSocketHandler.ts` | `transport/socket/websocket-handler.ts` | ✅ |
| `transport/socket/SdServiceSocket.ts` | `transport/socket/service-socket.ts` | ✅ |
| `transport/http/SdHttpRequestHandler.ts` | `transport/http/http-request-handler.ts` | ✅ |
| `transport/http/SdUploadHandler.ts` | `transport/http/upload-handler.ts` | ✅ |
| `transport/http/SdStaticFileHandler.ts` | `transport/http/static-file-handler.ts` | ✅ |
| `protocol/SdServiceProtocolWrapper.ts` | `protocol/protocol-wrapper.ts` | ✅ |
| `services/SdOrmService.ts` | `services/orm-service.ts` | ✅ |
| `services/SdCryptoService.ts` | `services/crypto-service.ts` | ✅ |
| `services/SdSmtpClientService.ts` | `services/smtp-service.ts` | ✅ |
| `services/SdAutoUpdateService.ts` | `services/auto-update-service.ts` | ✅ |
| `utils/SdConfigManager.ts` | `utils/config-manager.ts` | ✅ |
| `legacy/*` (6 파일) | `legacy/v1-auto-update-handler.ts` | ✅ (통합) |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-08 | 마이그레이션 워크플로우 계획 수립 |
| 2026-01-08 | **마이그레이션 완료**: 전체 Phase 1-8 완료 |
| 2026-01-08 | **bulkUpsert 제거**: IOrmService에서 bulkUpsert 메서드 삭제 |
