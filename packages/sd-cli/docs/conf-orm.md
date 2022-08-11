# 각 패키지에 orm 설정

orm(DB)를 사용하는 모든 클라이언트 및 서버 패키지에 ORM 설정 추가

## simplysm.json 각 패키지 설정

아래 설정을 추천 예시 설정입니다.

(클라이언트/서버 패키지에만 추가, 라이브러리에는 추가하지 않음)

``` json
{
  "packages": {
    "client": {
      ...,
      "configs": {
        "orm": {
          "MAIN": {
            "dialect": "mysql",
            "host": "localhost",
            "port": 3306,
            "username": "username",
            "password": "password",
            "defaultIsolationLevel": "READ_UNCOMMITTED"
          }
        }
      }
    },
    ...
  }
}
```
* [simplysm.json 사용법](conf-usage.md)

위의 옵션은, 심플리즘 라이브러리를 통해 "MAIN"이라는 이름으로 접속시, 하위 접속정보에 해당하는 DB로 접속하는 옵션입니다. 

옵션값 각각의 의미는 다음과 같습니다.

* **dialect**: *[필수]* DB 컨테이너 구분 (mysql, mssql, mssql-azure, sqlite), 각각에 맞는 패키지가 서버에 설치되어 있어야 합니다. (sd-orm-node-mssql...)
* **host**: *[필수]* 접속 HOST (or IP)
* **port**: *[옵션]* 접속 PORT번호 (기본값: mssql=3306, mssql=1433, mssql-azure=1433)
* **username**: *[필수]* 인증 아이디
* **password**: *[필수]* 인증 비밀번호
* **defaultIsolationLevel**: *[옵션]* ISOLATION LEVEL, DIALECT에 따라 입력가능 정보가 다릅니다. 
  * MSSQL: REPEATABLE_READ, READ_COMMITTED(*기본값*), READ_UNCOMMITTED, SERIALIZABLE, SNAPSHOT
  * MYSQL: REPEATABLE_READ(*기본값*), READ_COMMITTED, READ_UNCOMMITTED, SERIALIZABLE
  * 자세한 사항은 각 Dialect 공식문서를 참고하세요.

## ORM 사용 패키지의 package.json 의존성 추가

ORM 라이브러리 의존성 추가

``` json
{
  ...,
  "dependencies": {
    ...,
    "@simplysm/sd-orm-common": "~7.1.0"
  }
}
```

DB 라이브러리 의존성 추가 예제

``` json
{
  ...,
  "dependencies": {
    ...,
    "@simplysm-ts/db-main": "1.0.0"
  }
}
```

위 의존성은 아래 상황을 가정하여 입력된 예제입니다.
* 프로젝트명: simplysm-ts
* DB패키지명: main
* 프로젝트버전: 1.0.0

DB 라이브러리 의존성을 추가했다면, 해당 라이브러리를 tsconfig.json에도 경로를 추가해야함
* [내부 라이브러리에 대한 tsconfig.json에 경로 추가](lib-ts-paths.md)
