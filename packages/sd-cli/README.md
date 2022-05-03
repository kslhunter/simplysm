## 심플리즘 패키지 - CLI

## Requirements

* node@16.x

## Usage

``` bat
:: [필수] 폴더생성
mkdir sample 
cd sample

:: sd-cli 설치 
npm install sd-cli@~7.0.0

:: 프로젝트 초기화
:: sd-cli init --help 참고
sd-cli init --name sample --description 샘플프로젝트 --author 홍길동 --gitUrl https://github.com/my/sample.git

::::::::::::::::::::::::::::::::::::::::
:: 아래 중 필요한 패키지 추가
::::::::::::::::::::::::::::::::::::::::

:: 라이브러리 패키지 추가
:: sd-cli add ts-lib --help 참고
sd-cli add ts-lib common 공통모듈

:: 클라이언트용 라이브러리 패키지 추가
:: sd-cli add ts-lib --help 참고
sd-cli add ts-lib client-common "클라이언트 공통" --useDom

:: DB 라이브러리 패키지 추가
:: sd-cli add db-lib --help 참고
sd-cli add db-lib main

:: DB 라이브러리 패키지에 모델 추가 (DB 라이브러리 추가가 먼저 되어야 함)
:: sd-cli add db-model --help 참고
sd-cli add db-model main base Employee 직원

:: 서버 패키지 추가
:: sd-cli add server --help 참고
sd-cli add server

:: 클라이언트 패키지 추가
:: sd-cli add client --help 참고
sd-cli add client admin 관리자 server
```
