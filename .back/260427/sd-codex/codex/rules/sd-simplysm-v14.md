# @simplysm/* 라이브러리 문서 인덱스

## 필수 규칙

`@simplysm/*`를 import하는 파일을 신규 작성하거나 수정할 때,
작업 전 해당 패키지의 README.md를 반드시 읽어야 한다.
문서에 API 시그니처, 사용 예시, anti-pattern, 제약사항이 포함되어 있다.

- "간단한 수정"이라도 예외 없음
- 읽지 않고 수정하면 규칙 위반

## 패키지 목록

| 패키지 | 문서 경로 | 설명 |
|--------|-----------|------|
| `@simplysm/angular` | `.codex/references/sd-simplysm-v14/angular/README.md` | Angular 21 UI 컴포넌트, 디렉티브, 프로바이더, 레시피 |
| `@simplysm/core-common` | `.codex/references/sd-simplysm-v14/core-common/README.md` | 플랫폼 중립 유틸리티 (DateTime, UUID, EventEmitter 등) |
| `@simplysm/core-browser` | `.codex/references/sd-simplysm-v14/core-browser/README.md` | 브라우저 전용 유틸리티 |
| `@simplysm/core-node` | `.codex/references/sd-simplysm-v14/core-node/README.md` | Node.js 유틸리티 (Fsx, Cpx, FsWatcher 등) |
| `@simplysm/service-server` | `.codex/references/sd-simplysm-v14/service-server/README.md` | Fastify 기반 서비스 서버 |
| `@simplysm/service-client` | `.codex/references/sd-simplysm-v14/service-client/README.md` | 서비스 클라이언트 (WebSocket/HTTP) |
| `@simplysm/service-common` | `.codex/references/sd-simplysm-v14/service-common/README.md` | 서버-클라이언트 공유 프로토콜, 타입 |
| `@simplysm/orm-node` | `.codex/references/sd-simplysm-v14/orm-node/README.md` | Node.js ORM (MSSQL, MySQL, PostgreSQL) |
| `@simplysm/orm-common` | `.codex/references/sd-simplysm-v14/orm-common/README.md` | ORM 공통 쿼리빌더, 스키마, 타입 |
| `@simplysm/excel` | `.codex/references/sd-simplysm-v14/excel/README.md` | 엑셀 파일 읽기/쓰기 |
| `@simplysm/storage` | `.codex/references/sd-simplysm-v14/storage/README.md` | FTP/SFTP 스토리지 클라이언트 |
| `@simplysm/sd-cli` | `.codex/references/sd-simplysm-v14/sd-cli/README.md` | 빌드/체크 CLI 도구 |
| `@simplysm/sd-codex` | `.codex/references/sd-simplysm-v14/sd-codex/README.md` | Codex 설정 동기화 스크립트 |
| `@simplysm/lint` | `.codex/references/sd-simplysm-v14/lint/README.md` | ESLint 공유 설정 |
| `@simplysm/capacitor-plugin-auto-update` | `.codex/references/sd-simplysm-v14/capacitor-plugin-auto-update/README.md` | Capacitor 자동 업데이트 플러그인 |
| `@simplysm/capacitor-plugin-file-system` | `.codex/references/sd-simplysm-v14/capacitor-plugin-file-system/README.md` | Capacitor 파일 시스템 플러그인 |
| `@simplysm/capacitor-plugin-intent` | `.codex/references/sd-simplysm-v14/capacitor-plugin-intent/README.md` | Capacitor Intent 플러그인 |
| `@simplysm/capacitor-plugin-usb-storage` | `.codex/references/sd-simplysm-v14/capacitor-plugin-usb-storage/README.md` | Capacitor USB 스토리지 플러그인 |
