# @simplysm/sd-cli

> Simplysm 모노레포용 빌드/개발/배포 CLI 도구. `sd.config.ts` 설정 타입, TypeScript AOT 컴파일러(`SdTsCompiler`), Angular AOT Vite 플러그인(`sdAngularPlugin`)을 export한다. Node.js 20+ 환경에서 실행된다.

## Installation

```bash
npm install @simplysm/sd-cli
```

## 하려는 작업 → 읽을 파일

### 프로젝트 설정

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| `sd.config.ts` 파일을 처음 작성하거나 최상위 설정을 수정할 때 | [sd-config.md](./config/sd-config.md) |
| 패키지의 빌드 타겟을 결정하거나 타겟별 설정 차이를 확인할 때 | [sd-package-config.md](./config/sd-package-config.md) |
| `node`/`browser`/`neutral` 라이브러리 패키지를 설정할 때 | [sd-build-package-config.md](./config/sd-build-package-config.md) |
| 빌드 타겟 플랫폼 값(`"node"` / `"browser"` / `"neutral"`)을 참조할 때 | [build-target.md](./config/build-target.md) |

### 프론트엔드 / 서버 / 스크립트 패키지

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 프론트엔드 클라이언트 패키지를 설정할 때 | [sd-client-package-config.md](./config/sd-client-package-config.md) |
| Fastify 서버 패키지를 설정할 때 | [sd-server-package-config.md](./config/sd-server-package-config.md) |
| 빌드 없이 watch 훅만 실행하는 스크립트 패키지를 설정할 때 | [sd-scripts-package-config.md](./config/sd-scripts-package-config.md) |

### 배포

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| npm/로컬 디렉토리/FTP/SFTP 배포 방식을 설정할 때 | [sd-publish-config.md](./config/sd-publish-config.md) |
| 배포 완료 후 스크립트를 실행할 때 | [sd-post-publish-script-config.md](./config/sd-post-publish-script-config.md) |

### 네이티브 앱

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| Capacitor 모바일 앱(Android)을 설정할 때 | [sd-capacitor-config.md](./config/sd-capacitor-config.md) |
| Electron 데스크톱 앱을 설정할 때 | [sd-electron-config.md](./config/sd-electron-config.md) |

### 브라우저 호환성 / PWA

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| browserslist/PostCSS/레거시 모듈 지원을 설정할 때 | [sd-browser-support-config.md](./config/sd-browser-support-config.md) |
| PWA manifest를 설정할 때 | [sd-pwa-config.md](./config/sd-pwa-config.md) |

### watch 훅 / 유틸리티 타입

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| watch 모드에서 파일 변경 시 명령어를 실행하는 훅을 설정할 때 | [sd-watch-hook-config.md](./config/sd-watch-hook-config.md) |
| `package.json` 구조를 타입으로 참조할 때 | [npm-config.md](./config/npm-config.md) |

### 프로그래매틱 컴파일

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| Angular/TS 패키지를 프로그래매틱하게 AOT 컴파일할 때 | [sd-ts-compiler.md](./ts-compiler/sd-ts-compiler.md) |
| Vitest에서 Angular 컴포넌트 테스트 시 AOT 컴파일이 필요할 때 | [sd-angular-plugin.md](./angular-vite-plugin/sd-angular-plugin.md) |

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
