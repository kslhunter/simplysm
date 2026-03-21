# @simplysm 패키지 문서 참조

`@simplysm/*` 패키지 사용 시, 해당 패키지의 README.md를 먼저 읽어 API와 사용법을 파악한다.
- monorepo 내부: `packages/{패키지명}/README.md`
- 외부 프로젝트: `node_modules/@simplysm/{패키지명}/README.md`
- simplysm패키지의 경우 context7은 구버전일수 있으니 context7사용을 지양한다.

## 13버전의 @simplysm 패키지를 사용하고 있다면 다음 패키지 목록 참고

Simplysm packages — a TypeScript monorepo providing core utilities, ORM, service framework, SolidJS UI components, and build tooling.

| Package | Description |
|---------|-------------|
| @simplysm/capacitor-plugin-auto-update | Capacitor Auto Update Plugin |
| @simplysm/capacitor-plugin-broadcast | Capacitor Broadcast Plugin |
| @simplysm/capacitor-plugin-file-system | Capacitor File System Plugin |
| @simplysm/capacitor-plugin-usb-storage | Capacitor USB Storage Plugin |
| @simplysm/core-browser | Core module (browser) |
| @simplysm/core-common | Core module (common) — platform-neutral utilities |
| @simplysm/core-node | Core module (node) |
| @simplysm/excel | Excel file processing library |
| @simplysm/lint | Lint configuration (ESLint) |
| @simplysm/orm-common | ORM Module (common) — dialect-independent ORM |
| @simplysm/orm-node | ORM module (node) |
| @simplysm/sd-cli | CLI tool for monorepo build/dev |
| @simplysm/service-client | Service module (client) |
| @simplysm/service-common | Service module (common) |
| @simplysm/service-server | Service module (server) |
| @simplysm/solid | SolidJS + Tailwind CSS UI component library |
| @simplysm/storage | Storage Module (node) — FTP/FTPS/SFTP |
