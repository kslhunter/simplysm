# sd-rule-readme: @simplysm 패키지 문서 참조

`@simplysm/*` 패키지 사용 시, 해당 패키지의 README.md를 먼저 읽어 API와 사용법을 파악한다.

- 먼저 `packages/{패키지}/node_modules/@simplysm/{패키지명}/README.md`를 확인하고, 없으면 `node_modules/@simplysm/{패키지명}/README.md`를 확인한다
- simplysm패키지의 경우 context7은 구버전일수 있으니 context7사용을 지양한다.

## 14버전의 @simplysm 패키지를 사용하고 있다면 다음 패키지 목록 참고

Simplysm — TypeScript 모노레포. 코어 유틸리티, ORM, 서비스 프레임워크, Angular UI 컴포넌트, 빌드 도구를 제공한다.

| 패키지                                    | 설명                            |
|----------------------------------------|-------------------------------|
| @simplysm/angular                      | Angular 21 UI 컴포넌트 라이브러리      |
| @simplysm/capacitor-plugin-auto-update | Capacitor 자동 업데이트 플러그인        |
| @simplysm/capacitor-plugin-file-system | Capacitor 파일 시스템 플러그인         |
| @simplysm/capacitor-plugin-intent      | Capacitor Intent 플러그인         |
| @simplysm/capacitor-plugin-usb-storage | Capacitor USB 저장소 플러그인        |
| @simplysm/core-browser                 | 코어 모듈 (browser)               |
| @simplysm/core-common                  | 코어 모듈 (common) — 플랫폼 중립 유틸리티  |
| @simplysm/core-node                    | 코어 모듈 (node)                  |
| @simplysm/excel                        | 엑셀 파일 처리 라이브러리                |
| @simplysm/lint                         | ESLint 공유 설정                  |
| @simplysm/orm-common                   | ORM 모듈 (common) — DB 독립 ORM   |
| @simplysm/orm-node                     | ORM 모듈 (node)                 |
| @simplysm/sd-claude                    | Claude Code 에셋 동기화 도구         |
| @simplysm/sd-cli                       | 모노레포 빌드/체크 CLI 도구             |
| @simplysm/service-client               | 서비스 모듈 (client)               |
| @simplysm/service-common               | 서비스 모듈 (common)               |
| @simplysm/service-server               | 서비스 모듈 (server) — Fastify 기반  |
| @simplysm/storage                      | 저장소 모듈 (node) — FTP/FTPS/SFTP |
