# SD ORM Common

SD ORM에서 사용되는 공통 유틸리티 및 인터페이스 패키지입니다.

## 주요 기능

- 데이터베이스 연결 인터페이스
- 쿼리 빌더 유틸리티
- 엔티티 매핑 도구
- 공통 데코레이터
- 타입 정의

## 설치 방법

```bash
yarn install @simplysm/sd-orm-common
```

## 주요 컴포넌트

### DbContext

데이터베이스 컨텍스트의 기본 클래스를 제공합니다.

### QueryBuilder

SQL 쿼리 생성을 위한 빌더 클래스입니다.

### DbDefinition

데이터베이스 스키마 정의를 위한 인터페이스입니다.

### 데코레이터

- @Table: 테이블 매핑
- @Column: 컬럼 매핑
- @ForeignKey: 외래키 관계 설정

## 사용 예시

데이터베이스 연결 및 쿼리 실행, 엔티티 매핑 등 ORM의 기본적인 기능을 제공합니다.

## 라이선스

MIT
