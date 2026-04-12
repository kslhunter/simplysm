# WBS: MySQL clearSchema DROP TABLE에 데이터베이스 prefix 추가

## 프로젝트 개요

- **배경:** MySQL root 사용자로 `initialize({ force: true })` 실행 시 `No database selected` 에러 발생. root 연결은 기본 DB 없이 연결되는데, `clearSchema`가 생성하는 DROP TABLE에 DB 한정자가 없어 실패함.
- **환경:** simplysm 모노레포, `@simplysm/orm-common` 패키지
- **전제조건:** 없음
- **기술적 제약:** SQL 인젝션 방지를 위해 `def.database`는 이미 `/^[a-zA-Z0-9_]+$/` regex로 검증됨
- **참조 자료:**
  - `.tasks/260410152036_debug-mysql-no-db-selected/debug.md` — 디버그 근본 원인 분석 결과
  - GitHub 이슈 kslhunter/simplysm#22 — 원본 버그 리포트

## Impact Mapping

- **Goal:** MySQL root 사용자로 ORM 초기화 시 에러 없이 `initialize({ force: true })`가 동작한다
  - **Actor:** ORM 사용 개발자
    - **Impact:** root 계정으로도 안전하게 DB 초기화를 수행할 수 있다
      - **Deliverable:** MySQL `clearSchema` SQL의 DROP TABLE에 데이터베이스 prefix 추가

## Feature Breakdown

### Epic 1. MySQL clearSchema 버그 수정

#### [x] Feature 1.1 DROP TABLE에 데이터베이스 prefix 추가

**의존성:** 없음

**범위:**

- `clearSchema` SQL의 `GROUP_CONCAT`에서 테이블명을 `` `database`.`table` `` 형태의 fully qualified name으로 생성
- 기존 테스트가 있다면 업데이트, 없다면 테스트 추가

**경계:**

- MSSQL, PostgreSQL의 clearSchema는 수정하지 않음 (MSSQL은 이미 정상, PostgreSQL은 구조적 차이)
- `initialize` 로직 자체는 수정하지 않음

**근거:**

- GitHub 이슈 #22: root 사용자로 `initialize({ force: true })` 시 "No database selected" 에러
- 디버그 분석: `mysql-query-builder.ts:734`에서 `table_name`만 사용, DB prefix 누락 확인
- MSSQL 구현은 `${db}.sys.tables`로 이미 DB 한정자를 포함하여 일관성 확보 필요

## 제외 사항

- PostgreSQL 크로스 DB 지원: PostgreSQL은 아키텍처적으로 크로스 DB 쿼리를 지원하지 않으므로 별도 이슈 (사용자 결정)
- `USE` 구문 추가 방식: 우회 해결이므로 채택하지 않음 (디버그 분석에서 방안 B로 탈락)
