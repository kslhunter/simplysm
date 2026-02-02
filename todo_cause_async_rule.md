# Async 접미사 제거 작업 목록

> 컨벤션: 함수명 끝에 `Async` 접미사 사용 금지 → 비동기 함수가 기본
> 동기/비동기 버전이 모두 존재할 때는 동기 함수에 `Sync` 접미사 사용

## 작업 순서 (의존성 하위 → 상위)

### Phase 1: core-common (최하위 레이어)

- [x] **1. packages/core-common/src/extensions/arr-ext.ts** ⚠️ 예외
  - 함수: `filterAsync`, `mapAsync`, `mapManyAsync`, `toMapAsync`
  - 사유: JavaScript Array 기본 메서드(`filter`, `map`)와 충돌로 예외 처리
  - 영향: core-node/fs.ts, orm-common/result-parser.ts

- [x] **2. packages/core-common/src/extensions/arr-ext.types.ts** ⚠️ 예외
  - 타입 정의 파일 (arr-ext.ts와 함께 예외 처리)

- [x] **3. packages/core-common/src/features/serial-queue.ts** ✅
  - 함수: `_processAsync` → `_process` (private)
  - 영향: 없음 (내부 사용)

- [x] **4. packages/core-common/src/zip/sd-zip.ts** ✅
  - 함수: `extractAllAsync` → `extractAll`, `getAsync` → `get`, `existsAsync` → `exists`, `compressAsync` → `compress`, `closeAsync` → `close`
  - 영향: excel/zip-cache.ts ✅, tests/zip/sd-zip.spec.ts ✅

### Phase 2: core-node, core-browser (환경별 확장)

- [x] **5. packages/core-node/src/utils/fs.ts** ✅
  - 함수: 동기 버전에 `Sync` 접미사 추가, 비동기 버전에서 `Async` 접미사 제거
  - 영향: cli/* ✅, service-server/*
  - 테스트: packages/core-node/tests/utils/fs.spec.ts ✅

- [ ] **6. packages/core-node/src/features/fs-watcher.ts**
  - 함수: `watchAsync`
  - 영향: service-server/config-manager.ts, cli/watch.ts
  - 테스트: packages/core-node/tests/utils/fs-watcher.spec.ts

- [ ] **7. packages/core-browser/src/extensions/element-ext.ts**
  - 함수: `getBoundsAsync`
  - 영향: 없음
  - 테스트: packages/core-browser/tests/extensions/element-ext.spec.ts

### Phase 3: orm-common, service-common (도메인별 공통)

- [ ] **8. packages/orm-common/src/types/db.ts**
  - 인터페이스 타입 정의 (DbContextExecutor)
  - 영향: orm-node/*, service-client/orm-client-*

- [ ] **9. packages/orm-common/src/utils/result-parser.ts**
  - 함수: `parseQueryResultAsync`
  - 영향: orm-node/node-db-context-executor.ts, service-server/orm-service.ts

- [ ] **10. packages/orm-common/src/exec/queryable.ts**
  - 함수: `resultAsync`, `singleAsync`, `firstAsync`, `countAsync`, `existsAsync`, `insertAsync`, `insertIfNotExistsAsync`, `insertIntoAsync`, `updateAsync`, `deleteAsync`, `upsertAsync`, `switchFkAsync`
  - 영향: tests/orm/*, 사용자 코드
  - 테스트: packages/orm-common/tests/errors/queryable-errors.spec.ts

- [ ] **11. packages/orm-common/src/exec/executable.ts**
  - 함수: `executeAsync`
  - 영향: 사용자 코드

- [ ] **12. packages/orm-common/src/db-context.ts**
  - 함수: `connectAsync`, `connectWithoutTransactionAsync`, `transAsync`, `initializeAsync`, `createTableAsync`, `dropTableAsync`, `renameTableAsync`, `createViewAsync`, `dropViewAsync`, `createProcAsync`, `dropProcAsync`, `addColumnAsync`, `dropColumnAsync`, `modifyColumnAsync`, `renameColumnAsync`, `addPkAsync`, `dropPkAsync`, `addFkAsync`, `addIdxAsync`, `dropFkAsync`, `dropIdxAsync`, `clearSchemaAsync`, `schemaExistsAsync`, `truncateAsync`, `switchFkAsync`
  - 영향: orm-node/sd-orm.ts, service-client/orm-client-connector.ts

- [ ] **13. packages/orm-common/src/schema/procedure-builder.ts**
  - 주석/문서 내 Async 참조 수정

- [ ] **14. packages/orm-common/src/errors/db-transaction-error.ts**
  - 주석/문서 내 Async 참조 수정

- [ ] **15. packages/service-common/src/types.ts**
  - 타입 정의 확인 (SmtpService, OrmService 등)

### Phase 4: orm-node (DB 연결 구현체)

- [ ] **16. packages/orm-node/src/types/db-conn.ts**
  - 인터페이스: DbConn의 메서드 정의
  - 함수: `connectAsync`, `closeAsync`, `beginTransactionAsync`, `commitTransactionAsync`, `rollbackTransactionAsync`, `executeAsync`, `executeParametrizedAsync`, `bulkInsertAsync`

- [ ] **17. packages/orm-node/src/connections/mysql-db-conn.ts**
  - 함수: `connectAsync`, `closeAsync`, `beginTransactionAsync`, `commitTransactionAsync`, `rollbackTransactionAsync`, `executeAsync`, `executeParametrizedAsync`, `bulkInsertAsync`
  - 테스트: tests/orm/src/db-conn/mysql-db-conn.spec.ts

- [ ] **18. packages/orm-node/src/connections/mssql-db-conn.ts**
  - 함수: `connectAsync`, `closeAsync`, `beginTransactionAsync`, `commitTransactionAsync`, `rollbackTransactionAsync`, `executeAsync`, `executeParametrizedAsync`, `bulkInsertAsync`
  - 테스트: tests/orm/src/db-conn/mssql-db-conn.spec.ts

- [ ] **19. packages/orm-node/src/connections/postgresql-db-conn.ts**
  - 함수: `connectAsync`, `closeAsync`, `beginTransactionAsync`, `commitTransactionAsync`, `rollbackTransactionAsync`, `executeAsync`, `executeParametrizedAsync`, `bulkInsertAsync`
  - 테스트: tests/orm/src/db-conn/postgresql-db-conn.spec.ts

- [ ] **20. packages/orm-node/src/pooled-db-conn.ts**
  - 함수: `connectAsync`, `closeAsync`, `beginTransactionAsync`, `commitTransactionAsync`, `rollbackTransactionAsync`, `executeAsync`, `executeParametrizedAsync`, `bulkInsertAsync`

- [ ] **21. packages/orm-node/src/db-conn-factory.ts**
  - 함수: `_createRawConnectionAsync`, `_ensureModuleAsync`

- [ ] **22. packages/orm-node/src/node-db-context-executor.ts**
  - 함수: `connectAsync`, `closeAsync`, `beginTransactionAsync`, `commitTransactionAsync`, `rollbackTransactionAsync`, `executeParametrizedAsync`, `bulkInsertAsync`, `executeDefsAsync`

- [ ] **23. packages/orm-node/src/sd-orm.ts**
  - 함수: `connectAsync`, `connectWithoutTransactionAsync`
  - 테스트: tests/orm/src/db-context/*.spec.ts

### Phase 5: service-client (클라이언트 구현체)

- [ ] **24. packages/service-client/src/transport/socket-provider.ts**
  - 함수: `connectAsync`, `closeAsync`, `sendAsync`, `_createSocketAsync`, `_tryReconnectAsync`

- [ ] **25. packages/service-client/src/protocol/client-protocol-wrapper.ts**
  - 함수: `_runWorkerAsync`, `encodeAsync`, `decodeAsync`

- [ ] **26. packages/service-client/src/transport/service-transport.ts**
  - 함수: `sendAsync`

- [ ] **27. packages/service-client/src/features/event-client.ts**
  - 함수: `addListenerAsync`, `removeListenerAsync`, `emitAsync`, `reRegisterAllAsync`, `_executeByKeyAsync`

- [ ] **28. packages/service-client/src/features/file-client.ts**
  - 함수: `downloadAsync`, `uploadAsync`

- [ ] **29. packages/service-client/src/features/orm/orm-client-db-context-executor.ts**
  - 함수: `getInfoAsync`, `connectAsync`, `beginTransactionAsync`, `commitTransactionAsync`, `rollbackTransactionAsync`, `closeAsync`, `executeDefsAsync`, `executeParametrizedAsync`, `bulkInsertAsync`

- [ ] **30. packages/service-client/src/features/orm/orm-client-connector.ts**
  - 함수: `connectAsync`, `connectWithoutTransactionAsync`

- [ ] **31. packages/service-client/src/service-client.ts**
  - 함수: `connectAsync`, `closeAsync`, `sendAsync`, `authAsync`, `addEventListenerAsync`, `removeEventListenerAsync`, `emitAsync`, `uploadFileAsync`, `downloadFileBufferAsync`
  - 테스트: tests/service/src/service-client.spec.ts

### Phase 6: service-server (서버 구현체)

- [ ] **32. packages/service-server/src/auth/jwt-manager.ts**
  - 함수: `signAsync`, `verifyAsync`

- [ ] **33. packages/service-server/src/core/service-executor.ts**
  - 함수: `runMethodAsync`

- [ ] **34. packages/service-server/src/protocol/protocol-wrapper.ts**
  - 함수: `encodeAsync`, `decodeAsync`

- [ ] **35. packages/service-server/src/transport/socket/service-socket.ts**
  - 함수: `sendAsync`, `_sendAsync`

- [ ] **36. packages/service-server/src/transport/socket/websocket-handler.ts**
  - 함수: `broadcastReloadAsync`, `emitAsync`, `_processRequestAsync`

- [ ] **37. packages/service-server/src/transport/http/static-file-handler.ts**
  - 함수: `handleAsync`

- [ ] **38. packages/service-server/src/transport/http/http-request-handler.ts**
  - 함수: `handleAsync`

- [ ] **39. packages/service-server/src/transport/http/upload-handler.ts**
  - 함수: `handleAsync`

- [ ] **40. packages/service-server/src/utils/config-manager.ts**
  - 함수: `getConfigAsync`

- [ ] **41. packages/service-server/src/services/orm-service.ts**
  - 호출하는 Async 함수들 업데이트

- [ ] **42. packages/service-server/src/core/service-base.ts**
  - 함수: `getConfigAsync`

- [ ] **43. packages/service-server/src/service-server.ts**
  - 함수: `listenAsync`, `closeAsync`, `broadcastReloadAsync`, `generateAuthTokenAsync`, `verifyAuthTokenAsync`

### Phase 7: cli, excel (최상위 레이어)

- [x] **44. packages/cli/src/utils/spawn.ts** ✅
  - 함수: `spawnAsync` → `spawn`, `SpawnAsyncOptions` → `SpawnOptions`

- [x] **45. packages/cli/src/capacitor/capacitor.ts** ✅
  - 함수: 모든 Async 접미사 제거 (initialize, build, runOnDevice 등)
  - fs 함수 호출 업데이트 완료

- [x] **46. packages/cli/src/commands/publish.ts** ✅
  - fsCopy 함수 호출 업데이트

- [x] **47. packages/cli/src/commands/build.ts** ✅
  - fsRm, cap.initialize(), cap.build() 호출 업데이트

- [x] **48. packages/cli/src/commands/watch.ts** ✅
  - cap.initialize() 호출 업데이트

- [x] **49. packages/cli/src/commands/device.ts** ✅
  - fsExists, cap.runOnDevice() 호출 업데이트

- [x] **50. packages/cli/src/commands/lint.ts** ✅
  - fsGlob 함수 호출 업데이트

- [x] **51. packages/excel/src/utils/zip-cache.ts** ✅ (Phase 1에서 이미 완료)
  - ZipArchive 메서드 호출 업데이트

### Phase 8: 테스트 파일 및 통합 테스트

- [ ] **52. packages/orm-common/tests/setup/MockExecutor.ts**
  - Mock 함수명 업데이트

- [ ] **53. packages/orm-common/tests/utils/result-parser.spec.ts**
  - 테스트 코드 업데이트

- [ ] **54. packages/core-common/tests/extensions/array-extension.spec.ts**
  - 테스트 코드 업데이트

- [ ] **55. packages/core-common/tests/utils/serial-queue.spec.ts**
  - 테스트 코드 업데이트

- [x] **56. packages/core-common/tests/zip/sd-zip.spec.ts** ✅ (Phase 1에서 완료)
  - 테스트 코드 업데이트

- [ ] **57. packages/core-common/tests/types/lazy-gc-map.spec.ts**
  - 테스트 코드 업데이트

- [x] **58. packages/core-node/tests/utils/fs.spec.ts** ✅
  - 테스트 코드 업데이트

- [ ] **59. packages/core-node/tests/utils/fs-watcher.spec.ts**
  - 테스트 코드 업데이트

- [ ] **60. packages/core-browser/tests/extensions/element-ext.spec.ts**
  - 테스트 코드 업데이트

- [ ] **61. tests/orm/src/db-context/mysql-db-context.spec.ts**
  - 테스트 코드 업데이트

- [ ] **62. tests/orm/src/db-context/mssql-db-context.spec.ts**
  - 테스트 코드 업데이트

- [ ] **63. tests/orm/src/db-context/postgresql-db-context.spec.ts**
  - 테스트 코드 업데이트

- [ ] **64. tests/orm/src/db-conn/mysql-db-conn.spec.ts**
  - 테스트 코드 업데이트

- [ ] **65. tests/orm/src/db-conn/mssql-db-conn.spec.ts**
  - 테스트 코드 업데이트

- [ ] **66. tests/orm/src/db-conn/postgresql-db-conn.spec.ts**
  - 테스트 코드 업데이트

- [ ] **67. tests/service/src/service-client.spec.ts**
  - 테스트 코드 업데이트

- [ ] **68. tests/service/vitest.setup.ts**
  - 테스트 코드 업데이트

---

## 명명 규칙 변환 가이드

| Before | After |
|--------|-------|
| `connectAsync()` | `connect()` |
| `closeAsync()` | `close()` |
| `resultAsync()` | `result()` |
| `filterAsync()` | `filter()` (이미 동기 버전 존재 시 주의) |

### 주의사항
- 동기 버전이 이미 존재하는 경우:
  - 동기 버전에 `Sync` 접미사 추가: `filter()` → `filterSync()`
  - 비동기 버전에서 `Async` 제거: `filterAsync()` → `filter()`
