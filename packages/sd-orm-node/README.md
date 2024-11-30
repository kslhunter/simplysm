# @simplysm/sd-orm-node

NodeJS에서 사용 가능한 ORM 모듈입니다.

## 소개

이 모듈은 NodeJS 환경에서 데이터베이스를 쉽게 조작할 수 있도록 도와주는 ORM(Object-Relational Mapping) 도구입니다.

## 주요 기능

- MSSQL, MySQL, SQLite 데이터베이스 지원
- 타입스크립트 기반의 강력한 타입 지원
- 간편한 데이터베이스 쿼리 작성
- 트랜잭션 지원
- 비동기 작업 지원

## 설치 방법

```bash
yarn install @simplysm/sd-orm-node
```

## 사용 방법

데이터베이스 연결:

- MSSQL, MySQL, SQLite 중 원하는 데이터베이스 타입 선택
- 연결 설정 구성
- DbContext 클래스를 상속받아 사용

쿼리 작성:

- select, insert, update, delete 등의 기본 쿼리 지원
- 복잡한 조인 쿼리도 쉽게 작성 가능
- 타입 안정성이 보장된 쿼리 빌더 제공

## 라이선스

MIT

## 문의사항

이슈나 문의사항은 GitHub 저장소를 통해 등록해주시기 바랍니다.
