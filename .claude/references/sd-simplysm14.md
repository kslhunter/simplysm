# sd-simplysm14: @simplysm v14 소비앱 가이드

소비앱이 `@simplysm/*` v14를 사용할 때 적용되는 규칙.

## 패키지 목록

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

## 중간 패키지(common) 불필요

v14에서는 `import type`으로 타입을 직접 가져올 수 있으므로, 이전 버전에서 클라이언트-서버 간 타입 공유를 위해 필요하던 중간 패키지(예: `service-common`, `orm-common`)가 소비앱의 의존성으로 불필요하다.

```typescript
// v14: 서버 패키지에서 타입을 직접 import — common 패키지 의존성 불필요
import type { ServiceMethods } from "@simplysm/service-server";
```
