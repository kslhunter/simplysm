## 심플리즘 패키지 - CLI

## Requirements

* node@16.x

## Usage

### 1. 폴더생성

``` bat
mkdir sample 
cd sample
```

### 2. sd-cli 설치

``` bat
npm install @simplysm/sd-cli@~7.0.0
```

### 3. 프로젝트 초기화

``` bat
:: sd-cli init --help 참고
sd-cli init sample 샘플프로젝트 홍길동 https://github.com/my/sample.git
```

필요시 아래 작업 수행
* package.json 버전 변경 (초기값: 1.0.0)
* [라이브러리 패키지 로컬업데이트 설정](docs/lib-local-update.md) 

### 4. 각종 패키지 추가

#### 서버 패키지 추가

``` bat
:: sd-cli add server --help 참고
sd-cli add server
```

#### 클라이언트 패키지 추가

``` bat
:: sd-cli add client --help 참고
sd-cli add client admin 관리자 server
```

#### 일반 라이브러리 패키지 추가

``` bat
:: sd-cli add ts-lib --help 참고
sd-cli add ts-lib common 공통모듈
```

#### 브라우저용 라이브러리 패키지 추가

``` bat
:: sd-cli add client-lib --help 참고
sd-cli add ts-lib common-browser "브라우저 공통" --useDom
```

#### Angular용 라이브러리 패키지 추가

``` bat
:: sd-cli add ts-lib --help 참고
sd-cli add ts-lib client-common "클라이언트 공통" --isForAngular
```

#### DB 라이브러리 패키지 추가

``` bat
:: sd-cli add db-lib --help 참고
sd-cli add db-lib main
```

추가 작업
* [각 패키지에 orm 설정](docs/conf-orm.md)
* [DB 라이브러리 패키지에 모델 추가](#DB-라이브러리-패키지에-모델-추가)

### 패키지별 세부기능 추가

#### DB 라이브러리 패키지에 모델 추가

``` bat
:: sd-cli add db-model --help 참고
sd-cli add db-model main base Employee 직원
```

주의사항
* DB 라이브러리 추가가 먼저 되어야 함
