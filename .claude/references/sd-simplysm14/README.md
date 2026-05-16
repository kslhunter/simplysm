# @simplysm/* v14 행동 지침

Claude 에이전트가 반드시 지켜야 할 행동 지침이다. (@simplysm/\* v14 포함시)

## 코드 위치 원칙

기본 위치는 **클라이언트**. 서버(`service-server`)는 다음 두 경우에만 둔다:

- **보안**: 클라이언트에 노출 불가한 자격증명/키, 권한 우회 위험, 외부에 직접 노출하면 안 되는 연산.
- **클라이언트 미지원**: 브라우저/모바일 런타임에서 실행 불가한 기능(특정 네이티브 API, 서버 측 자원 접근 등).

ORM 호출, 파일 변환, 비즈니스 로직 등은 위 두 사유에 해당하지 않는 한 클라이언트 코드에 직접 둔다. "서버에 두는 게 관행"이라는 이유로 service 로 이관하지 않는다.

## CLAUDE.md 명령어 표기

`CLAUDE.md` 작성 시, 검증 명령은 다음 역할로 표기한다.

- **기본 검증 (평소 사용)**: `pnpm check --fix` — typecheck + lint 일괄, 자동 수정 포함.
- **보조**: `pnpm typecheck`, `pnpm lint` — `pnpm check` 에서 문제 났을 때 각각 따로 보기 위함. 단독 사용은 회피.

## 개발 매뉴얼

- **클라이언트 기본 지침** — [client-rules.md](./client-rules.md)
- **클라이언트 화면 작성** — [client-component.md](./client-component.md)
- **클라이언트 sd-crud-* 컴포넌트** — [client-crud.md](./client-crud.md)
- **클라이언트 데모 작성** — [client-demo.md](./client-demo.md)
- **클라이언트 탭 컨트롤** — [client-tab.md](./client-tab.md)
- **클라이언트 환경 셋업** — [client-setup.md](./client-setup.md)
- **ORM 쿼리 작성** — [orm.md](./orm.md)
  - **UNION 사용법** — [orm-union.md](./orm-union.md)

## 패키지 인덱스

- **angular** — 표준 Angular UI/기능 라이브러리
- **capacitor-plugin-auto-update** — 모바일 앱 자동 업데이트(zip diff + APK 설치)
- **capacitor-plugin-file-system** — 모바일 앱 네이티브 파일시스템 접근
- **capacitor-plugin-intent** — Android Intent 송수신
- **capacitor-plugin-usb-storage** — Android USB OTG 외장 저장소 접근
- **core-common** — 환경 비종속 공용 도구
  - 표준 에러 클래스(`SdError`/`ArgumentError`/`NotImplementedError`/`TimeoutError`)
  - 값 타입(`Uuid`/`DateTime`/`DateOnly`/`Time`/`LazyGcMap`)
  - 디바운스 큐·직렬 큐·이벤트 에미터
  - bytes/날짜/JSON/숫자/객체/경로/텍스트/XML/zip 변환 유틸
- **core-browser** — 브라우저 전용 보강
  - DOM 트리 탐색·포커스 보조 확장
  - IndexedDB 기반 가상 파일시스템
  - 진행률·취소·타임아웃 가능 fetch 래퍼
  - 파일 선택/다운로드 헬퍼
- **core-node** — Node 전용 보강
  - 파일 IO/복사/경로 래퍼
  - 파일 감시(chokidar)
  - 로거(consola)
  - worker_threads 추상화
- **excel** — xlsx 파일 읽기/쓰기
- **lint** — 자체 ESLint 플러그인 + recommended 프리셋
- **orm-common** — DB 비종속 ORM 코어(쿼리 빌더·표현식·스키마·DDL)
- **orm-node** — Node DB 드라이버 연결(mssql/mysql/postgresql)
- **sd-claude** — 소비 앱에 Claude Code 셋업을 npm 으로 배포
- **sd-cli** — 모노레포 빌드/배포 오케스트레이터(tsc/esbuild/ngtsc/Capacitor/Electron)
- **service-client** — 서비스 서버 호출 클라이언트 SDK
- **service-common** — 서비스 서버↔클라이언트 프로토콜·타입 계약
- **service-server** — Fastify 기반 서비스 서버
- **storage** — FTP/SFTP 원격 파일 스토리지 클라이언트
