# 디버그: MySQL INSERT OUTPUT 시 service-server 경로에서 `results[0]`이 빈 배열로 반환

## 출처

- **origin:** `direct`

## 문제 증상

- **유형:** 동작 이상
- **기대:** `db.boaUpload().insert([{...}], ["id"])` 호출 후 반환 배열에 삽입된 레코드의 `id`가 들어있어야 함 (`uploadResult[0].id`로 접근 가능).
- **실제:** `uploadResult[0]`이 `undefined`. 반환 배열이 빈 배열(`[]`). INSERT 자체는 DB에 정상 반영됨.
- **위치:**
  - 버그 지점: `packages/service-server/src/services/orm-service.ts:141-168` (`OrmService.executeDefs`)
  - 관련: `packages/orm-node/src/node-db-context-executor.ts:148-149` (`resultSetStride` 미구현 — 배치 insert에 영향)
- **재현 절차:** adtek `AppOrmProvider.connectAsync` 내부에서 `BoaUpload` 테이블에 1행 insert + `["id"]` 출력 요청.

## 근본 원인

MySQL은 `OUTPUT`/`RETURNING`을 미지원하므로 `mysql-query-builder`는 `INSERT...;\nSELECT ... WHERE id = LAST_INSERT_ID()` multi-statement SQL을 생성하고, `QueryBuildResult`에 `resultSetIndex: 1, resultSetStride: 2`를 함께 반환한다 (`packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts:206-210`).

이 메타데이터는 "실제 원하는 결과는 rawResults[1]부터 stride=2로 수집"하라는 신호인데, 두 executor 모두 이를 완전히/부분적으로 무시한다:

1. **서버 경로** (`service-server/src/services/orm-service.ts:155-168`): `queryBuilder.build(def).sql`만 꺼내고 `resultSetIndex`/`resultSetStride`를 버린다. `conn.execute(queries)`의 반환값인 `[[], [{id:N}]]`을 순서대로 보존해 리턴하고, 클라이언트의 `queryable.insert()`는 `results[0]`(= INSERT의 빈 result set)을 취함 → 항상 빈 배열.

2. **orm-node 경로** (`orm-node/src/node-db-context-executor.ts:148-149`): `resultSetIndex`는 쓰지만 `resultSetStride`를 무시한다. 단일 레코드 insert는 정상 동작하지만, 배치(N≥2) insert 시 `rawResults[1]`만 뽑아 첫 레코드의 id만 반환된다.

사용자는 `OrmClientDbContextExecutor` → `OrmService` → `conn.execute` 경로를 타므로 (1)번 버그가 직접 원인. (2)번은 동일 루트 원인에서 파생된 별도 버그로 함께 수정 대상.

## 해결 방안

- **방안:** 두 executor의 `executeDefs`에 공통 헬퍼로 `resultSetIndex` + `resultSetStride` 처리를 구현한다.
- **설명:**
  - `packages/orm-common/src/utils/` 또는 적절한 위치에 `pickResultSets(rawResults, buildResult)` 유틸 추가 (또는 각 executor에 인라인).
  - `resultSetIndex == null`이면 `rawResults[0]` 사용.
  - `resultSetIndex != null && resultSetStride == null`이면 `rawResults[resultSetIndex]` 단일 사용.
  - `resultSetIndex != null && resultSetStride != null`이면 `resultSetIndex`부터 `stride` 간격으로 result set을 모두 수집해 flat concat.
  - `service-server/src/services/orm-service.ts:executeDefs`를 `node-db-context-executor`와 동일한 패턴(def마다 개별 `conn.execute([sql])`, buildResult 메타 기반 pick)으로 재작성한다.
- **선택 사유:** 사용자가 "버그 완벽 수정" 요청 — 사용자 경로(service-client)의 단일/배치 둘 다와 orm-node 직접 사용자의 배치 insert까지 한 번에 해결.
