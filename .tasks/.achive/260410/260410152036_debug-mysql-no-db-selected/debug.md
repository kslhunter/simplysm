# 디버그: MySQL clearSchema에서 DROP TABLE에 데이터베이스 prefix 누락

## 출처

- **origin:** `kslhunter/simplysm#22` — GitHub 이슈에서 시작
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 문제 증상

- **유형:** 에러
- **증상:** `No database selected` — MySQL root 사용자로 `initialize({ force: true })` 시 `clearSchema`의 DROP TABLE 구문에서 데이터베이스명이 빠져있어 발생
- **위치:** `packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts:734`
- **재현 절차:**
  1. ORM 설정에서 `username: "root"`로 연결 설정 (config에 `database` 미포함)
  2. `createOrm(MyDbContext, config, { database: "MYDB" })`으로 ORM 인스턴스 생성
  3. `orm.connectWithoutTransaction(async (db) => { await db.initialize({ force: true }); })` 실행

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|                                          | 증거1: DROP TABLE에 DB prefix 없음 (code) | 증거2: config에 database 미포함 (code) | 증거3: "No database selected" 에러 (code) | 증거4: MSSQL은 DB 한정자 사용 (code) | 증거5: executor에 USE 없음 (code) |
| ---------------------------------------- | ----------------------------------------- | -------------------------------------- | ----------------------------------------- | ------------------------------------ | --------------------------------- |
| H1: DROP TABLE에 DB prefix 누락          | C(code)                                   | C(code)                                | C(code)                                   | C(code)                              | C(code)                           |
| ~~H2: USE 구문 누락~~ (H1의 부분 원인)   | N                                         | C(infer)                               | C(infer)                                  | N                                    | C(code)                           |

### 결과: 확정 — H1

`clearSchema` MySQL 구현에서 `GROUP_CONCAT`이 `` `table_name` ``만 생성하고 `` `database`.`table_name` ``을 생성하지 않아, 기본 DB가 없는 연결에서 `No database selected` 에러 발생.

- MySQL root 사용자 연결 시 `database: undefined`로 연결 (`mysql-db-conn.ts:61`)
- MSSQL은 `${db}.sys.tables`로 DB 한정자를 이미 포함하여 정상 동작
- PostgreSQL은 크로스 DB 쿼리를 지원하지 않아 아키텍처적으로 다른 문제 (이 이슈 범위 밖)

## 해결 방안

### 방안 A: DROP TABLE에 데이터베이스 prefix 추가 (추천)

- **설명:** `GROUP_CONCAT`의 CONCAT에 `def.database`를 포함하여 `` `MYDB`.`table1` `` 형태로 fully qualified table name 생성

  현재 코드 (`mysql-query-builder.ts:734`):
  ```sql
  SELECT GROUP_CONCAT(CONCAT('`', REPLACE(table_name, '`', '``'), '`')) INTO @tables
    FROM information_schema.tables WHERE table_schema = '${dbName}';
  ```

  변경 후:
  ```sql
  SELECT GROUP_CONCAT(CONCAT('`${def.database}`.`', REPLACE(table_name, '`', '``'), '`')) INTO @tables
    FROM information_schema.tables WHERE table_schema = '${dbName}';
  ```

- **장점:** SQL이 자기 완결적. MSSQL 구현과 일관성. 연결 상태(기본 DB 유무)에 무관하게 동작
- **반론:** `def.database`는 이미 regex `/^[a-zA-Z0-9_]+$/`로 검증되어 SQL 인젝션 위험 없음. 기존에 기본 DB가 있는 연결에서도 정상 동작 (fully qualified name은 항상 유효)
- **점수:** 정확성 10/10, 일관성 9/10, 변경 리스크 9/10 → **평균 9.3/10**

### 방안 B: DROP TABLE 전에 USE 구문 추가

- **설명:** `clearSchema` SQL 앞에 `` USE `${def.database}` `` 추가
- **장점:** 한 줄 추가로 간단
- **반론:** 우회 해결에 해당. DROP TABLE 자체는 여전히 DB를 명시하지 않음. USE 실행 후 다른 쿼리에 영향
- **점수:** 정확성 7/10, 일관성 5/10, 변경 리스크 6/10 → **평균 6.0/10**

### 방안 C: 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** 버그가 그대로 남아 root 사용자 시나리오에서 `initialize({ force: true })` 사용 불가
- **점수:** 정확성 0/10, 일관성 0/10, 변경 리스크 10/10 → **평균 3.3/10**

## 선택 결과

**방안 A: DROP TABLE에 데이터베이스 prefix 추가** (평균 9.3/10)

사용자 선택. MySQL clearSchema만 수정. MSSQL은 이미 정상, PostgreSQL은 구조적 차이로 별도 이슈.
