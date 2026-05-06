# CLAUDE.md — `@simplysm/orm-node`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

`orm-common` 의 추상에 **실제 DB 드라이버**를 붙이는 어댑터. mssql / mysql / postgresql 지원. 빌드 타겟 `node`.

## 구조

| 경로                                     | 내용                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `create-db-conn.ts`                      | config(`type` 분기) → `IDbConn` 생성 진입.                            |
| `create-orm.ts`                          | `DbContext` 인스턴스화 + 커넥션 바인딩 + 마이그레이션 부트스트랩.     |
| `node-db-context-executor.ts`            | `DbContext` 의 실행자(트랜잭션·쿼리 실행·결과 파싱).                  |
| `connections/mssql-db-conn.ts`           | `tedious` 어댑터.                                                     |
| `connections/mysql-db-conn.ts`           | `mysql2` 어댑터.                                                      |
| `connections/postgresql-db-conn.ts`      | `pg` + `pg-copy-streams` 어댑터(대량 INSERT 시 COPY 사용).            |
| `types/`                                 | 커넥션 옵션 타입.                                                     |

워크스페이스 의존: `@simplysm/core-common`, `@simplysm/orm-common`.
**peerDependency(전부 optional)**: `tedious`, `mysql2`, `pg`, `pg-copy-streams`. 사용자는 자기가 쓰는 DB 드라이버만 설치.

## 작업 시 주의

- 새 DB 지원: ① `connections/<dialect>-db-conn.ts` 어댑터 ② `orm-common/query-builder/<dialect>/` 방언 빌더 ③ `create-db-conn.ts` 분기 ④ peerDep optional 등록.
- 드라이버 import 는 항상 동적(`await import(...)`) 으로 — peerDep 가 optional 이라 미설치 환경에서 `import` 가 실패하지 않게.
- 통합 테스트는 `tests/orm` 에서 Docker DB(mysql 23306, postgres 25432, mssql 21433) 띄워서 실행. 새 SQL 동작은 3 DB 모두에서 검증.
- 트랜잭션·격리 수준은 `node-db-context-executor` 가 일관되게 관리. 개별 connection 어댑터에서 직접 트랜잭션 SQL 을 보내지 마라.
