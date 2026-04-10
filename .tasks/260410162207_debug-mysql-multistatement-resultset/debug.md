# 디버그: MySQL executeParametrized가 multi-statement 결과를 단일 result set으로 병합하여 INSERT with OUTPUT 실패

## 출처

- **origin:** `direct` — 사용자 직접 입력 (adtek 프로젝트 DevModal DB 초기화 시 에러)
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 에러
- **증상:** `TypeError: Cannot read properties of undefined (reading 'length')` at `parseQueryResult` (`result-parser.ts:182`)
- **위치:** `packages/orm-node/src/connections/mysql-db-conn.ts:156-171` (근본 원인), `packages/orm-node/src/node-db-context-executor.ts:148-152` (에러 발현)
- **재현 절차:** MySQL 방언에서 `Queryable.insert(records, outputColumns)` 호출 시 발생 (adtek의 DevModal → DB 초기화 → `applyCustomerPo`)

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|  | E1: `rawResults` `undefined` 전달 (`result-parser.ts:182`) | E2: MySQL `executeParametrized`가 `[result]` 반환 (단일 요소) (`mysql-db-conn.ts:171`) | E3: MySQL 빌더가 `resultSetIndex: 1` 설정 (`mysql-query-builder.ts:208`) | E4: `getInsertQueryDef`가 `output` 정상 설정 (`queryable.ts:1402-1408`) |
|---|---|---|---|---|
| H1: MySQL `executeParametrized`가 multi-statement 결과를 단일 result set으로 병합 | C(code) | C(code) | C(code) | N |
| H2: INSERT 호출 시 `output` 설정 누락 | C(code) | N | I(code) | I(code) |

- **H2 폐기:** `queryable.ts:1402-1408`에서 `outputColumns`이 있으면 `output`을 정상 설정하고, `mysql-query-builder.ts:176`에서 `output != null`일 때만 `resultSetIndex: 1` 설정됨. 코드에서 직접 확인한 불일치.

### 결과: 확정 — H1

MySQL `MysqlDbConn.executeParametrized` (`mysql-db-conn.ts:156-171`)가 mysql2의 multi-statement 반환값(`[ResultSetHeader, [Row1, Row2]]`)에서 `ResultSetHeader`만 필터링하고 나머지를 **하나의** `result` 배열에 push하여 `return [result]`로 반환. `executeDefs`에서 `rawResults[1]`이 `undefined`가 됨.

## 해결 방안

### 방안 A: `MysqlDbConn.executeParametrized` multi-statement 결과 분리

- **설명:** mysql2의 multi-statement 반환 형식을 감지하여 각 statement의 결과를 별도 result set으로 분리. 감지 방법: 배열 첫 요소가 `Array`이거나 `ResultSetHeader`(affectedRows + fieldCount 보유)이면 multi-statement로 판단.
- **장점:** 근본 원인 직접 해결, `resultSetIndex`/`resultSetStride` 지원 자연스럽게 동작
- **반론:** multi-statement 감지 로직이 mysql2 내부 반환 형식에 의존. `fieldCount` 동시 검사로 오탐 위험 낮음
- **점수:** 근본 해결 9/10, 변경 리스크 7/10, 호환성 8/10 → **평균 8.0/10**

### 방안 B: `NodeDbContextExecutor.executeDefs` bounds check 추가

- **설명:** `rawResults[resultSetIndex]`가 `undefined`일 때 명확한 에러 메시지를 던지도록 방어 코드 추가
- **장점:** TypeError 대신 의미 있는 에러 메시지 제공
- **반론:** 근본 원인을 해결하지 않음. INSERT with OUTPUT이 여전히 실패
- **점수:** 근본 해결 2/10, 변경 리스크 9/10, 호환성 9/10 → **평균 6.7/10**

### 방안 C: 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** MySQL INSERT with outputColumns 사용 시 항상 에러 발생
- **점수:** 근본 해결 0/10, 변경 리스크 10/10, 호환성 10/10 → **평균 6.7/10**

## 선택 결과

**방안 A** (평균 8.0/10)

근본 원인을 직접 해결하는 유일한 방안. `MysqlDbConn.executeParametrized`에서 multi-statement 결과를 올바르게 분리하여 `resultSetIndex`가 정상 동작하도록 수정.
