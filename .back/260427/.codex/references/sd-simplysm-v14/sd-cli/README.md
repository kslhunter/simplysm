# @simplysm/sd-cli

> Simplysm 워크스페이스의 빌드, 개발 서버, 타입체크, lint, 배포를 실행하는 CLI 패키지. 소비자 코드에는 `sd.config.ts` 설정 타입, Vitest용 Angular AOT Vite 플러그인, 프로그래매틱 TypeScript/Angular 컴파일러를 제공한다. Node.js 환경에서 사용한다.

## Installation

```bash
npm install @simplysm/sd-cli
```

## 하려는 작업 → 읽을 파일

### 프로젝트 설정 작성

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| `sd.config.ts` 최상위 구조와 default export 함수 형태를 작성할 때 | [sd-config.md](./config/sd-config.md) |
| 패키지 `target` 값에 따라 어떤 설정 타입을 써야 하는지 고를 때 | [sd-package-config.md](./config/sd-package-config.md) |
| `node`/`browser`/`neutral` 라이브러리 패키지를 설정할 때 | [sd-build-package-config.md](./config/sd-build-package-config.md) |
| 빌드 타겟 플랫폼 값 자체를 타입으로 참조할 때 | [build-target.md](./config/build-target.md) |
| `package.json` 구조를 타입으로 참조할 때 | [npm-config.md](./config/npm-config.md) |

### 실행 대상 패키지 설정

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 프론트엔드 클라이언트 패키지의 서버 연결, 환경값, PWA, 네이티브 앱 설정을 작성할 때 | [sd-client-package-config.md](./config/sd-client-package-config.md) |
| Fastify 서버 패키지의 external, PM2, 런타임 설정을 작성할 때 | [sd-server-package-config.md](./config/sd-server-package-config.md) |
| 빌드 산출물 없이 watch 훅만 실행하는 scripts 패키지를 설정할 때 | [sd-scripts-package-config.md](./config/sd-scripts-package-config.md) |
| watch 모드에서 파일 변경 시 별도 명령을 실행할 때 | [sd-watch-hook-config.md](./config/sd-watch-hook-config.md) |

### 배포 설정

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| npm, 로컬 디렉토리, FTP/FTPS/SFTP 배포 방식을 설정할 때 | [sd-publish-config.md](./config/sd-publish-config.md) |
| 배포 완료 후 후속 스크립트를 실행할 때 | [sd-post-publish-script-config.md](./config/sd-post-publish-script-config.md) |

### 클라이언트 산출물 확장

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| Capacitor Android 앱 ID, 권한, 서명, 아이콘 설정을 작성할 때 | [sd-capacitor-config.md](./config/sd-capacitor-config.md) |
| Electron 데스크톱 앱 ID, installer, 포함 dependency를 설정할 때 | [sd-electron-config.md](./config/sd-electron-config.md) |
| browserslist, PostCSS, legacy module 지원을 설정할 때 | [sd-browser-support-config.md](./config/sd-browser-support-config.md) |
| PWA manifest 설정을 작성하거나 PWA 생성을 끌 때 | [sd-pwa-config.md](./config/sd-pwa-config.md) |

### 프로그래매틱 컴파일과 테스트

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| Angular/TypeScript 패키지를 코드에서 직접 컴파일하거나 증분 빌드를 구현할 때 | [sd-ts-compiler.md](./ts-compiler/sd-ts-compiler.md) |
| Vitest에서 Angular 컴포넌트가 포함된 패키지를 AOT 컴파일할 때 | [sd-angular-plugin.md](./angular-vite-plugin/sd-angular-plugin.md) |

## 이 패키지를 쓰지 말아야 할 때

- Simplysm 워크스페이스 밖의 일반 Vite/Angular 앱 빌드는 해당 프레임워크의 표준 CLI를 사용한다.
- 런타임 서비스 서버/클라이언트 통신 코드를 작성할 때는 `@simplysm/service-server`, `@simplysm/service-client`, `@simplysm/service-common` 문서를 읽는다.

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
