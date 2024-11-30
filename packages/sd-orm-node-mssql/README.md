# @simplysm/sd-orm-node-mssql

MSSQL 데이터베이스를 위한 ORM 모듈입니다.

## 소개

이 모듈은 NodeJS 환경에서 MSSQL 데이터베이스를 쉽게 조작할 수 있도록 도와주는 ORM(Object-Relational Mapping) 도구입니다.

## 주요 기능

- MSSQL 데이터베이스 연결 및 관리
- 타입스크립트 기반의 강력한 타입 지원
- 간편한 데이터베이스 쿼리 작성
- 트랜잭션 지원
- 비동기 작업 지원
- 스토어드 프로시저 실행 지원
- 대용량 데이터 처리 최적화

## 설치 방법

```bash
yarn install @simplysm/sd-orm-node-mssql
```

## 사용 방법

데이터베이스 연결:
- 연결 설정 구성 (서버, 데이터베이스, 인증 정보 등)
- DbContext 클래스를 상속받아 사용
- 연결 풀링 지원으로 효율적인 리소스 관리

쿼리 작성:
- select, insert, update, delete 등의 기본 쿼리 지원
- 복잡한 조인 쿼리도 쉽게 작성 가능
- 타입 안정성이 보장된 쿼리 빌더 제공
- MSSQL 특화 기능 지원 (TOP, OUTPUT 등)

## 라이선스

MIT