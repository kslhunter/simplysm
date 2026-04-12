# WBS: MySQL executeParametrized multi-statement 결과 분리 버그 수정

## 프로젝트 개요

- **배경:** MySQL에서 `Queryable.insert(records, outputColumns)` 호출 시 `TypeError: Cannot read properties of undefined (reading 'length')` 에러 발생. `MysqlDbConn.executeParametrized`가 multi-statement 결과를 단일 result set으로 병합하여 `resultSetIndex >= 1` 접근 시 `undefined` 반환.
- **환경:** `@simplysm/orm-node` 패키지, MySQL 방언, mysql2 드라이버 (multipleStatements: true)
- **전제조건:** 없음
- **기술적 제약:** mysql2의 multi-statement 반환 형식(`[ResultSetHeader | RowDataPacket[], ...]`)에 의존하여 single/multi-statement 구분 필요
- **참조 자료:**
  - `.tasks/260410162207_debug-mysql-multistatement-resultset/debug.md` — 근본 원인 분석 결과
  - `packages/orm-node/src/connections/mysql-db-conn.ts:136-181` — 수정 대상 코드
  - `packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts` — `resultSetIndex` 설정 확인용

## Impact Mapping

- **Goal:** MySQL INSERT with OUTPUT 정상 동작 복구
  - **Actor:** @simplysm/orm-node 사용 프로젝트 (adtek 등)
    - **Impact:** DB 초기화 및 INSERT with outputColumns 기능이 정상 작동한다
      - **Deliverable:** `MysqlDbConn.executeParametrized` multi-statement 결과 분리

## Feature Breakdown

### Epic 1. MySQL multi-statement 결과 처리

#### [ ] Feature 1.1 executeParametrized multi-statement 결과 분리

**의존성:** 없음

**범위:**

- mysql2의 multi-statement 반환 형식 감지 (첫 요소가 Array 또는 ResultSetHeader인 경우)
- multi-statement일 때 각 statement 결과를 별도 result set으로 분리 (ResultSetHeader → `[]`, RowDataPacket[] → 해당 배열)
- single-statement일 때 기존 동작 유지

**경계:**

- `executeDefs`의 `resultSetStride` 처리는 이 Feature에서 다루지 않음 (별도 이슈)
- `executeDefs`의 bounds check 방어 코드 추가는 이 Feature에서 다루지 않음
- MSSQL/PostgreSQL 코드는 변경하지 않음

**근거:**

- debug.md 분석: H1 확정 — MySQL `executeParametrized`가 multi-statement 결과를 단일 result set으로 병합하는 것이 근본 원인
- 사용자 선택: 방안 A (multi-statement 결과 분리)

## 제외 사항

- `executeDefs`의 `resultSetStride` 지원 — 현재 이슈와 별개의 기능 확장
- `executeDefs`의 bounds check 방어 코드 — 방안 B에 해당, 사용자 미선택
