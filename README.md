# 심플리즘 패키지

## 요구사항
1. MSSQL 2012이상, MYSQL 8.0.27이상
2. Volta

## 패키지

| Package | Description |
| --- | --- |
| `@simplysm/cordova-plugin-auto-update` | Cordova 플러그인으로, Android 애플리케이션의 자동 업데이트 기능을 제공합니다. 새로운 버전의 APK 파일을 감지하고 설치를 진행합니다. |
| `@simplysm/cordova-plugin-file-system` | Cordova 플러그인으로, 디바이스의 파일 시스템에 접근하여 파일을 읽고 쓰는 기능을 제공합니다. |
| `@simplysm/cordova-plugin-usb-storage` | Cordova 플러그인으로, USB 저장 장치에 접근하여 데이터를 읽고 쓰는 기능을 제공합니다. |
| `@simplysm/eslint-plugin` | simplysm 프로젝트를 위한 사용자 정의 ESLint 플러그인입니다. 프로젝트 고유의 코드 스타일과 규칙을 강제하기 위한 다양한 린트 규칙을 포함합니다. |
| `@simplysm/sd-angular` | simplysm 프로젝트의 Angular 애플리케이션을 위한 포괄적인 UI 컴포넌트 라이브러리 및 유틸리티 모음입니다. 데이터 그리드, 모달, 프린트, 다양한 입력 컨트롤 등 풍부한 UI/UX 기능을 제공합니다. |
| `@simplysm/sd-cli` | simplysm 프로젝트 관리를 위한 CLI(Command-Line Interface) 도구입니다. Angular 클라이언트, 서버, Cordova, Electron 애플리케이션의 빌드, 번들링, 실행 및 코드 리팩토링과 마이그레이션 작업을 자동화합니다. |
| `@simplysm/sd-core-browser` | 브라우저 환경을 위한 핵심 유틸리티 및 확장 기능을 제공합니다. DOM 조작, Blob 처리, IndexedDB 추상화 등 브라우저 전용 기능들을 포함합니다. |
| `@simplysm/sd-core-common` | 브라우저와 Node.js 환경 모두에서 사용 가능한 공통 핵심 유틸리티, 타입, 확장 기능을 제공하는 패키지입니다. 날짜/시간, 오류 처리, 직렬화, 압축 등 기본적인 기능을 포함합니다. |
| `@simplysm/sd-core-node` | Node.js 환경을 위한 핵심 유틸리티를 제공합니다. 파일 시스템 접근, 해시 생성, 로깅, 워커 스레드 관리 등 서버 측 개발에 필요한 기능들을 포함합니다. |
| `@simplysm/sd-excel` | Excel (.xlsx) 파일을 생성하고, 읽고, 수정하기 위한 모듈입니다. 워크북, 워크시트, 셀 단위의 조작을 지원합니다. |
| `@simplysm/sd-orm-common` | ORM(Object-Relational Mapping) 프레임워크의 공통 기반을 제공합니다. DbContext, 쿼리 빌더, 모델 정의를 위한 데코레이터 등 환경에 독립적인 ORM 핵심 기능을 포함합니다. |
| `@simplysm/sd-orm-common-ext` | `sd-orm-common` 패키지의 확장 모듈로, 사용자 인증, 로그 기록 등 일반적인 시나리오를 위한 사전 정의된 데이터 모델과 확장 기능을 제공합니다. |
| `@simplysm/sd-orm-node` | simplysm ORM 프레임워크의 Node.js 구현체입니다. 서버 환경에서 데이터베이스 연결 및 쿼리 실행을 담당하며, 특정 데이터베이스 드라이버(MSSQL, MySQL, SQLite)와 ORM 코어를 연결합니다. |
| `@simplysm/sd-orm-node-mssql` | `sd-orm-node`가 Microsoft SQL Server 데이터베이스에 연결할 수 있도록 지원하는 드라이버입니다. |
| `@simplysm/sd-orm-node-mysql` | `sd-orm-node`가 MySQL 데이터베이스에 연결할 수 있도록 지원하는 드라이버입니다. |
| `@simplysm/sd-orm-node-sqlite` | `sd-orm-node`가 SQLite 데이터베이스에 연결할 수 있도록 지원하는 드라이버입니다. |
| `@simplysm/sd-pop3` | POP3 프로토콜을 사용하여 이메일 서버와 상호작용하기 위한 클라이언트 라이브러리입니다. |
| `@simplysm/sd-service-client` | `sd-service-server`와 통신하기 위한 클라이언트 모듈입니다. WebSocket을 통해 백엔드 서비스에 원격 프로시저 호출(RPC)을 수행합니다. |
| `@simplysm/sd-service-common` | 서비스 클라이언트와 서버 간에 공유되는 공통 인터페이스와 데이터 전송 객체(DTO)를 정의합니다. 네트워크 통신에서 타입 안전성을 보장합니다. |
| `@simplysm/sd-service-server` | `sd-service-client`에서 소비할 수 있는 서비스를 생성하기 위한 백엔드 프레임워크입니다. WebSocket 연결을 처리하고, 요청을 라우팅하며, 서버에서 비즈니스 로직을 실행합니다. |
| `@simplysm/sd-storage` | FTP, SFTP 등 다양한 원격 스토리지 시스템과 상호작용하기 위한 통합 인터페이스를 제공하는 모듈입니다. |
| `@simplysm/ts-transformer-keys` | TypeScript 사용자 정의 트랜스포머로, 컴파일 타임에 타입 정보(예: 인터페이스의 키 목록)를 추출하여 런타임에서 사용할 수 있게 해줍니다. |
| `@simplysm/types-cordova-plugin-ionic-webview` | `cordova-plugin-ionic-webview` Cordova 플러그인을 위한 TypeScript 타입 정의를 제공합니다. |
