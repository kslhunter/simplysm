# @simplysm/sd-cli

Simplysm 프로젝트용 CLI 도구. pnpm 모노레포 환경에서 빌드, 개발 서버, 린트, 타입체크, 배포를 오케스트레이션한다.

## 설치

```bash
pnpm add @simplysm/sd-cli
```

## 문서

| 카테고리 | 설명 |
|---------|------|
| [설정 타입 레퍼런스](docs/config-types.md) | `sd.config.ts`에서 사용하는 모든 타입 상세 |
| [아키텍처](docs/architecture.md) | 내부 구조, 빌드 파이프라인, 오케스트레이터, Worker, 인프라 |

## 빠른 시작

```bash
# 새 프로젝트 초기화
sd-cli init

# 개발 서버 시작
sd-cli dev

# 프로덕션 빌드
sd-cli build

# 코드 품질 전체 검사
sd-cli check
```

## 명령어

모든 명령어는 `sd-cli <command> [targets..] [--debug]` 형태로 실행한다.
`[targets..]`를 지정하지 않으면 `sd.config.ts`에 정의된 모든 패키지가 대상이 된다.

### dev

클라이언트 + 서버 패키지를 개발 모드로 실행한다.

```bash
sd-cli dev [targets..] [-o key=value]
```

- `client` 타겟: Vite 개발 서버 시작 (HMR 지원)
- `server` 타겟: esbuild watch 빌드 + Fastify 서버 런타임
- 서버-클라이언트 프록시 연결 자동 구성
- Capacitor 초기화 지원
- SIGINT/SIGTERM으로 종료

### build

프로덕션 빌드를 실행한다.

```bash
sd-cli build [targets..] [-o key=value]
```

- dist 폴더 클린 후 빌드
- 린트 + 빌드 병렬 실행
- `node`/`browser`/`neutral` 타겟: esbuild JS 빌드 + .d.ts 생성
- `client` 타겟: Vite 프로덕션 빌드 + 타입체크 + Capacitor/Electron 빌드
- `server` 타겟: esbuild 번들 빌드

### watch

라이브러리 패키지를 watch 모드로 빌드한다.

```bash
sd-cli watch [targets..] [-o key=value]
```

- `node`/`browser`/`neutral` 타겟 전용
- esbuild watch + .d.ts 생성
- 파일 변경 시 자동 리빌드

### lint

ESLint를 실행한다.

```bash
sd-cli lint [targets..] [--fix] [--timing]
```

| 옵션 | 설명 |
|------|------|
| `--fix` | 자동 수정 |
| `--timing` | 규칙별 실행 시간 출력 |

- `.cache/eslint.cache`에 캐시 저장 (설정 변경 시 자동 무효화)

### typecheck

TypeScript 타입 검사를 실행한다.

```bash
sd-cli typecheck [targets..] [-o key=value]
```

- Worker 스레드로 병렬 타입체크
- neutral 패키지는 node/browser 환경 분리 검사
- `.cache/typecheck-{env}.tsbuildinfo` 증분 컴파일

### check

타입체크 + 린트 + 테스트를 병렬로 실행한다.

```bash
sd-cli check [targets..] [--type typecheck,lint,test]
```

- `--type`으로 실행할 검사 종류를 선택할 수 있다 (쉼표 구분)
- 테스트는 vitest를 subprocess로 실행

### publish

패키지를 빌드 후 배포한다.

```bash
sd-cli publish [targets..] [--no-build] [--dry-run] [-o key=value]
```

배포 순서:
1. 사전 검증 (npm 인증, Git 상태, SSH 키)
2. 버전 업그레이드 (patch 또는 prerelease)
3. 빌드
4. Git commit/tag/push
5. 의존성 레벨 순서로 배포 (레벨 내 병렬, 레벨 간 순차)
6. postPublish 스크립트 실행

| 옵션 | 설명 |
|------|------|
| `--no-build` | 빌드 없이 배포만 실행 |
| `--dry-run` | 실제 배포 없이 시뮬레이션 |

### device

Android 기기 또는 Electron에서 앱을 실행한다.

```bash
sd-cli device -p <package> [-u <url>] [-o key=value]
```

| 옵션 | 설명 |
|------|------|
| `-p, --package` | 패키지명 (필수) |
| `-u, --url` | 개발 서버 URL (미지정 시 sd.config.ts 서버 설정 사용) |

### init

새 Simplysm 프로젝트를 초기화한다.

```bash
sd-cli init
```

- 빈 디렉토리에서 실행 필요
- 프로젝트명, 설명, 포트를 입력받아 Handlebars 템플릿으로 생성
- 자동으로 `pnpm install` 실행

### replace-deps

`sd.config.ts`의 `replaceDeps` 설정에 따라 node_modules 패키지를 로컬 소스로 심링크한다.

```bash
sd-cli replace-deps [-o key=value]
```

## 설정 (sd.config.ts)

프로젝트 루트에 `sd.config.ts`를 생성하여 패키지별 빌드, 배포, 옵션을 설정한다.

### 기본 구조

```typescript
import type { SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";

const config: SdConfigFn = (params: SdConfigParams) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "ui-lib": { target: "browser" },
    "my-client": {
      target: "client",
      server: "my-server",
    },
    "my-server": {
      target: "server",
      pm2: { name: "my-app" },
    },
    "scripts": { target: "scripts" },
  },
  replaceDeps: {
    "@simplysm/*": "../simplysm/packages/*",
  },
  postPublish: [
    { type: "script", cmd: "ssh", args: ["user@host", "pm2 restart %PROJECT%"] },
  ],
});

export default config;
```

### SdConfigParams

`sd.config.ts`의 default export 함수에 전달되는 파라미터.

```typescript
interface SdConfigParams {
  cwd: string;       // 현재 작업 디렉토리
  dev: boolean;      // 개발 모드 여부
  options: string[];  // CLI의 -o 플래그로 전달된 옵션
}
```

### 패키지 타겟 유형

| 타겟 | 설명 | 빌드 도구 |
|------|------|-----------|
| `node` | Node.js 전용 라이브러리 | esbuild (bundle: false) + .d.ts |
| `browser` | 브라우저 전용 라이브러리 | esbuild (bundle: false) + .d.ts |
| `neutral` | Node/브라우저 공용 라이브러리 | esbuild (bundle: false) + .d.ts |
| `client` | 클라이언트 앱 (SolidJS + Vite) | Vite + 타입체크 |
| `server` | 서버 앱 (Fastify) | esbuild (bundle: true, minify) |
| `scripts` | 스크립트 전용 (빌드/watch 제외) | 없음 |

### 배포 설정 (publish)

각 패키지의 `publish` 필드로 배포 방식을 지정한다.

```typescript
// npm 레지스트리
{ type: "npm" }

// 로컬 디렉토리 복사
{ type: "local-directory", path: "/deploy/%PROJECT%/%VER%" }

// FTP/FTPS/SFTP 업로드
{ type: "sftp", host: "example.com", port: 22, path: "/app", user: "deploy" }
```

환경 변수 치환: `%VER%` (버전), `%PROJECT%` (프로젝트 경로)

상세 API는 [설정 타입 레퍼런스](docs/config-types.md) 참조.

## 라이브러리 API

`@simplysm/sd-cli`는 CLI 외에도 프로그래밍 방식으로 사용할 수 있는 API를 export한다.

### 설정 타입

```typescript
import type {
  SdConfig,
  SdConfigFn,
  SdConfigParams,
  SdPackageConfig,
  SdBuildPackageConfig,
  SdClientPackageConfig,
  SdServerPackageConfig,
  SdScriptsPackageConfig,
  BuildTarget,
  SdPublishConfig,
  SdNpmPublishConfig,
  SdLocalDirectoryPublishConfig,
  SdStoragePublishConfig,
  SdCapacitorConfig,
  SdElectronConfig,
  SdPostPublishScriptConfig,
} from "@simplysm/sd-cli";
```

### Vite 설정

외부 Vite 프로젝트에서 Simplysm 스타일의 Vite 설정을 생성할 때 사용한다.

```typescript
import { createViteConfig, type ViteConfigOptions } from "@simplysm/sd-cli";

const config = createViteConfig({
  pkgDir: "/path/to/package",
  name: "my-app",
  tsconfigPath: "/path/to/tsconfig.json",
  compilerOptions: { /* ... */ },
  mode: "dev",        // "build" | "dev"
  serverPort: 3000,   // dev 모드 서버 포트 (0이면 자동 할당)
  env: { API_URL: "http://localhost:8080" },
  replaceDeps: ["@simplysm/solid"],  // scope 패키지 watch 대상
});
```

#### ViteConfigOptions

```typescript
interface ViteConfigOptions {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  mode: "build" | "dev";
  serverPort?: number;
  replaceDeps?: string[];
  onScopeRebuild?: () => void;
}
```

`createViteConfig`는 다음을 자동 구성한다:
- SolidJS 플러그인
- TailwindCSS (postcss)
- tsconfig paths 해석
- PWA 지원 (vite-plugin-pwa)
- scope 패키지 dist 변경 감지 (sdScopeWatchPlugin)
- public-dev/ 디렉토리 우선 서빙 (dev 모드)
- process.env 치환 (define)

## 아키텍처

상세 아키텍처는 [아키텍처 문서](docs/architecture.md) 참조.

### 핵심 구조

```
sd-cli.ts (런처)
  └─ sd-cli-entry.ts (CLI 파서, yargs)
       ├─ commands/          <- 각 명령어 진입점
       ├─ orchestrators/     <- 빌드 워크플로우 관리
       ├─ builders/          <- 빌더 (esbuild/dts)
       ├─ workers/           <- Worker 스레드 (병렬 처리)
       ├─ infra/             <- 인프라 (결과 수집, 시그널, 워커 관리)
       ├─ capacitor/         <- Capacitor 프로젝트 관리
       ├─ electron/          <- Electron 프로젝트 관리
       └─ utils/             <- 유틸리티
```

### 오케스트레이터

| 클래스 | 용도 |
|--------|------|
| `BuildOrchestrator` | 프로덕션 빌드 (클린 -> 린트+빌드 병렬) |
| `DevOrchestrator` | 개발 모드 (Vite 서버 + Fastify 서버 + 프록시) |
| `WatchOrchestrator` | 라이브러리 watch 모드 (esbuild watch + dts) |

### 빌더

| 클래스 | 역할 |
|--------|------|
| `BaseBuilder` | 빌더 공통 추상 클래스 |
| `LibraryBuilder` | esbuild 기반 라이브러리 JS 빌드 |
| `DtsBuilder` | TypeScript .d.ts 파일 생성 |

### 인프라

| 클래스 | 역할 |
|--------|------|
| `WorkerManager` | Worker 생성/조회/종료 관리 |
| `ResultCollector` | 빌드 결과 수집 및 상태 관리 |
| `SignalHandler` | SIGINT/SIGTERM 시그널 처리 |
