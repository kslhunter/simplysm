# @simplysm/cli

Simplysm 프레임워크의 CLI 도구이다. ESLint 린트, TypeScript 타입체크, 라이브러리/클라이언트/서버 패키지 빌드, 개발 모드, 배포, Android 디바이스 실행 기능을 제공한다.

## 설치

```bash
npm install --save-dev @simplysm/cli
# or
pnpm add -D @simplysm/cli
```

## 주요 명령어

CLI 바이너리 이름은 `sd-cli`이다. 모든 명령어에 공통으로 `--debug` 옵션을 사용하여 상세 로그를 출력할 수 있다.

### lint

ESLint를 실행한다. `eslint.config.ts`에서 globalIgnores 패턴을 자동으로 추출하여 적용하며, `.cache/eslint.cache`에 캐시를 저장한다.

```bash
# 전체 린트
sd-cli lint

# 특정 경로만 린트
sd-cli lint packages/core-common

# 여러 경로 린트
sd-cli lint packages/core-common tests/orm

# 자동 수정
sd-cli lint --fix

# 규칙별 실행 시간 출력
sd-cli lint --timing
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--fix` | 자동 수정 | `false` |
| `--timing` | 규칙별 실행 시간 출력 (ESLint `TIMING` 환경변수 설정) | `false` |
| `--debug` | debug 로그 출력 | `false` |

### typecheck

TypeScript 타입체크를 실행한다. `tsconfig.json`과 `sd.config.ts`를 기반으로 패키지별 환경(`node`/`browser`)을 구분하여 병렬로 타입체크를 수행한다. Worker threads를 사용하여 CPU 코어의 7/8만큼 동시 실행한다.

```bash
# 전체 타입체크
sd-cli typecheck

# 특정 경로만 타입체크
sd-cli typecheck packages/core-common

# 여러 경로 타입체크
sd-cli typecheck packages/core-common tests/orm

# sd.config.ts에 옵션 전달
sd-cli typecheck -o key=value
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

**타겟별 타입체크 환경:**

| 타겟 | 환경 |
|------|------|
| `node` | node 환경 1회 |
| `browser`, `client` | browser 환경 1회 |
| `neutral` | node + browser 환경 2회 |
| `scripts` | 타입체크 제외 |

### watch

**라이브러리 패키지**(`node`/`browser`/`neutral` 타겟)를 watch 모드로 빌드한다. 파일 변경 시 자동으로 리빌드되며, `.d.ts` 타입 정의 파일도 자동 생성된다.

> **참고**: `client`/`server` 타겟은 `dev` 명령어를 사용한다.

```bash
# 모든 라이브러리 패키지 watch
sd-cli watch

# 특정 패키지만 watch
sd-cli watch solid

# 여러 패키지 watch
sd-cli watch solid core-common
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

### dev

**Client 및 Server 패키지**를 개발 모드로 실행한다. `client` 타겟은 Vite dev server로 실행되며, `server` 타겟은 Server Build Worker + Server Runtime Worker로 실행된다. Server-Client 프록시 연결 및 Capacitor 초기화를 지원한다.

```bash
# 모든 client/server 패키지 실행
sd-cli dev

# 특정 패키지만 실행
sd-cli dev solid-demo

# 여러 패키지 실행
sd-cli dev solid-demo my-server
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

**동작 방식:**

- `client` 타겟: Vite dev server 시작. `server` 설정이 문자열(패키지명)이면 해당 서버에 프록시 연결
- `server` 타겟: esbuild watch 모드로 빌드 후, 별도 Worker에서 서버 런타임 실행. 파일 변경 시 자동 리빌드 및 서버 재시작
- Capacitor 설정이 있는 클라이언트 패키지는 빌드 완료 후 Capacitor 초기화 수행
- SIGINT/SIGTERM 시그널로 종료

### build

프로덕션 빌드를 실행한다. Lint, dist 폴더 정리, 빌드를 순차적으로 수행한다.

```bash
# 모든 패키지 빌드
sd-cli build

# 특정 패키지만 빌드
sd-cli build solid core-common
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

**타겟별 빌드 동작:**

| 타겟 | JS 빌드 | .d.ts 생성 | 타입체크 | 비고 |
|------|---------|-----------|---------|------|
| `node`/`browser`/`neutral` | esbuild | O | O | 라이브러리 패키지 |
| `client` | Vite production | X | O | 클라이언트 앱 (+ Capacitor 빌드) |
| `server` | esbuild | X | X | 서버 앱 |
| `scripts` | 제외 | 제외 | 제외 | - |

### publish

패키지를 배포한다. 안전성을 위해 다음 순서로 진행된다:

1. 사전 검증 (npm 인증, Git 미커밋 변경사항 확인)
2. 버전 업그레이드 (prerelease면 prerelease 증가, 아니면 patch 증가)
3. 빌드 (실패 시 Git 롤백)
4. Git 커밋/태그/푸시 (실패 시 Git 롤백)
5. npm/FTP/로컬 배포
6. postPublish 스크립트 실행

```bash
# publish 설정이 있는 모든 패키지 배포
sd-cli publish

# 특정 패키지만 배포
sd-cli publish solid core-common

# 빌드 없이 배포 (위험)
sd-cli publish --no-build

# 실제 배포 없이 시뮬레이션
sd-cli publish --dry-run
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--build` / `--no-build` | 빌드 실행 여부 (`--no-build`로 스킵) | `true` |
| `--dry-run` | 실제 배포 없이 시뮬레이션 | `false` |
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

### device

Android 디바이스에서 Capacitor 앱을 실행한다. `sd.config.ts`에 `capacitor` 설정이 있는 `client` 타겟 패키지만 사용 가능하다.

```bash
# 패키지 지정 (필수)
sd-cli device -p my-app

# 개발 서버 URL 직접 지정
sd-cli device -p my-app -u http://192.168.0.10:3000
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--package`, `-p` | 패키지 이름 (필수) | - |
| `--url`, `-u` | 개발 서버 URL (미지정 시 sd.config.ts의 server 포트 사용) | - |
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

## 설정 (sd.config.ts)

프로젝트 루트에 `sd.config.ts` 파일을 생성하여 패키지별 빌드 타겟과 배포 설정을 정의한다. `typecheck`, `watch`, `dev`, `build`, `publish`, `device` 명령어에서 사용된다.

`typecheck` 명령어는 설정 파일이 없으면 모든 패키지를 `neutral` 타겟으로 처리한다. `watch`, `dev`, `build`, `publish` 명령어는 이 파일이 필수이다.

### 기본 예시

```typescript
import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "core-browser": { target: "browser" },
    "solid": { target: "browser", publish: "npm" },
    "solid-demo": { target: "client", server: "solid-demo-server" },
    "solid-demo-server": { target: "server" },
    "my-scripts": { target: "scripts" },
  },
});

export default config;
```

### 타겟 종류

| 타겟 | 설명 | 타입체크 | watch | dev | build |
|------|------|---------|-------|-----|-------|
| `node` | Node.js 전용 패키지. DOM lib 제거, `@types/node` 포함 | O (node) | O | X | O (JS + dts) |
| `browser` | 브라우저 전용 패키지. DOM lib 유지, `@types/node` 제외 | O (browser) | O | X | O (JS + dts) |
| `neutral` | Node/브라우저 공용. DOM lib 유지, `@types/node` 포함 | O (node + browser) | O | X | O (JS + dts) |
| `client` | Vite dev server 기반 클라이언트 앱 | O (browser) | X | O | O (Vite) |
| `server` | Fastify 기반 서버 앱 | X | X | O | O (JS) |
| `scripts` | typecheck/watch/build 대상에서 제외 | X | X | X | X |

### 함수 파라미터

`sd.config.ts`의 함수는 `SdConfigParams` 객체를 인자로 받는다:

```typescript
import type { SdConfigFn, SdConfigParams } from "@simplysm/cli";

const config: SdConfigFn = (params: SdConfigParams) => {
  // params.cwd  - 현재 작업 디렉토리
  // params.dev  - 개발 모드 여부 (dev 명령 시 true, build/publish 시 false)
  // params.opt  - CLI의 -o 플래그로 전달된 추가 옵션 배열

  return {
    packages: {
      "my-app": {
        target: "client",
        server: params.dev ? 3000 : "my-server",
      },
    },
  };
};

export default config;
```

### 패키지 설정 타입

#### 라이브러리 패키지 (SdBuildPackageConfig)

```typescript
{
  target: "node" | "browser" | "neutral";
  publish?: SdPublishConfig;  // 배포 설정 (선택)
}
```

#### 클라이언트 패키지 (SdClientPackageConfig)

```typescript
{
  target: "client";
  server: string | number;      // 서버 패키지명 또는 직접 포트 번호
  env?: Record<string, string>; // 빌드 시 치환할 환경변수
  publish?: SdPublishConfig;    // 배포 설정 (선택)
  capacitor?: SdCapacitorConfig; // Capacitor 설정 (선택)
}
```

#### 서버 패키지 (SdServerPackageConfig)

```typescript
{
  target: "server";
  env?: Record<string, string>; // 빌드 시 치환할 환경변수
  publish?: SdPublishConfig;    // 배포 설정 (선택)
}
```

#### 스크립트 패키지 (SdScriptsPackageConfig)

```typescript
{
  target: "scripts";
}
```

### 배포 설정 (SdPublishConfig)

배포 방식은 세 가지를 지원한다:

| 방식 | 설정 값 | 설명 |
|------|---------|------|
| npm | `"npm"` | npm 레지스트리에 배포 |
| 로컬 디렉토리 | `{ type: "local-directory", path: "..." }` | 로컬 경로에 dist 복사 |
| 스토리지 | `{ type: "ftp" \| "ftps" \| "sftp", host, port?, path?, user?, pass? }` | FTP/FTPS/SFTP 서버에 업로드 |

로컬 디렉토리와 스토리지의 `path`에서는 환경변수 치환을 지원한다: `%VER%` (버전), `%PROJECT%` (프로젝트 경로).

```typescript
// npm 배포
"core-common": { target: "neutral", publish: "npm" },

// 로컬 디렉토리 배포
"my-app": {
  target: "client",
  server: 3000,
  publish: { type: "local-directory", path: "/deploy/%VER%/my-app" },
},

// SFTP 업로드
"my-server": {
  target: "server",
  publish: {
    type: "sftp",
    host: "deploy.example.com",
    port: 22,
    path: "/opt/app",
    user: "deploy",
    pass: "secret",
  },
},
```

### postPublish 스크립트

배포 완료 후 실행할 스크립트를 정의할 수 있다. 환경변수 치환(`%VER%`, `%PROJECT%`)을 지원한다. 스크립트 실패 시 경고만 출력하고 계속 진행한다.

```typescript
const config: SdConfigFn = () => ({
  packages: { /* ... */ },
  postPublish: [
    {
      type: "script",
      cmd: "curl",
      args: ["-X", "POST", "https://hooks.example.com/deploy?version=%VER%"],
    },
  ],
});
```

### Capacitor 설정 (SdCapacitorConfig)

`client` 타겟 패키지에서 Android 앱 빌드를 위한 Capacitor 설정이다.

```typescript
"my-app": {
  target: "client",
  server: 3000,
  capacitor: {
    appId: "com.example.myapp",
    appName: "My App",
    icon: "resources/icon.png",          // 앱 아이콘 (패키지 디렉토리 기준)
    debug: true,                          // 디버그 빌드 여부
    plugins: {                            // Capacitor 플러그인
      "@capacitor/camera": true,
      "@capacitor/storage": { group: "myGroup" },
    },
    platform: {
      android: {
        bundle: true,                     // AAB 번들 빌드 (false면 APK)
        sdkVersion: 33,                   // Android SDK 버전
        permissions: [                    // 추가 권한
          { name: "CAMERA" },
          { name: "WRITE_EXTERNAL_STORAGE", maxSdkVersion: 29 },
        ],
        sign: {                           // APK/AAB 서명
          keystore: "keystore.jks",
          storePassword: "password",
          alias: "key0",
          password: "password",
        },
      },
    },
  },
},
```

## API로 직접 호출

CLI 외에 코드에서 직접 함수를 import하여 사용할 수 있다.

### 내보내기 목록

| 내보내기 | 종류 | 설명 |
|---------|------|------|
| `runLint` | 함수 | ESLint 실행 |
| `LintOptions` | 타입 | `runLint` 옵션 |
| `runTypecheck` | 함수 | TypeScript 타입체크 실행 |
| `TypecheckOptions` | 타입 | `runTypecheck` 옵션 |
| `runWatch` | 함수 | 라이브러리 패키지 watch 모드 빌드 |
| `WatchOptions` | 타입 | `runWatch` 옵션 |
| `runDev` | 함수 | Client/Server 패키지 개발 모드 실행 |
| `DevOptions` | 타입 | `runDev` 옵션 |
| `runBuild` | 함수 | 프로덕션 빌드 실행 |
| `BuildOptions` | 타입 | `runBuild` 옵션 |
| `runPublish` | 함수 | 패키지 배포 실행 |
| `PublishOptions` | 타입 | `runPublish` 옵션 |
| `runDevice` | 함수 | Android 디바이스에서 앱 실행 |
| `DeviceOptions` | 타입 | `runDevice` 옵션 |
| `SdConfigFn` | 타입 | sd.config.ts 함수 타입 |
| `SdConfig` | 타입 | sd.config.ts 반환 타입 |
| `SdConfigParams` | 타입 | sd.config.ts 함수 파라미터 타입 |
| `SdPackageConfig` | 타입 | 패키지 설정 유니온 타입 |
| `SdBuildPackageConfig` | 타입 | 라이브러리 패키지 설정 |
| `SdClientPackageConfig` | 타입 | 클라이언트 패키지 설정 |
| `SdServerPackageConfig` | 타입 | 서버 패키지 설정 |
| `SdScriptsPackageConfig` | 타입 | 스크립트 패키지 설정 |
| `BuildTarget` | 타입 | 빌드 타겟 (`"node" \| "browser" \| "neutral"`) |
| `SdPublishConfig` | 타입 | 배포 설정 유니온 타입 |
| `SdLocalDirectoryPublishConfig` | 타입 | 로컬 디렉토리 배포 설정 |
| `SdStoragePublishConfig` | 타입 | 스토리지(FTP/SFTP) 배포 설정 |
| `SdPostPublishScriptConfig` | 타입 | postPublish 스크립트 설정 |
| `SdCapacitorConfig` | 타입 | Capacitor 설정 |
| `SdCapacitorAndroidConfig` | 타입 | Capacitor Android 플랫폼 설정 |
| `SdCapacitorSignConfig` | 타입 | Capacitor Android 서명 설정 |
| `SdCapacitorPermission` | 타입 | Capacitor Android 권한 설정 |
| `SdCapacitorIntentFilter` | 타입 | Capacitor Android Intent Filter 설정 |

### 사용 예시

```typescript
import { runLint, runTypecheck, runWatch, runDev, runBuild, runPublish, runDevice } from "@simplysm/cli";

// 린트 실행
await runLint({
  targets: ["packages/core-common"],
  fix: false,
  timing: false,
});

// 타입체크 실행
await runTypecheck({
  targets: ["packages/core-common"],
  options: [],
});

// watch 실행 (라이브러리 패키지)
await runWatch({
  targets: ["solid"],
  options: [],
});

// dev 실행 (client/server 패키지)
await runDev({
  targets: ["solid-demo"],
  options: [],
});

// 프로덕션 빌드
await runBuild({
  targets: ["solid", "core-common"],
  options: [],
});

// 배포
await runPublish({
  targets: ["core-common"],
  noBuild: false,
  dryRun: true,
  options: [],
});

// Android 디바이스 실행
await runDevice({
  package: "my-app",
  url: "http://192.168.0.10:3000",
  options: [],
});
```

### 옵션 타입 상세

#### LintOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | 린트할 경로 목록. 빈 배열이면 전체 |
| `fix` | `boolean` | 자동 수정 여부 |
| `timing` | `boolean` | 규칙별 실행 시간 출력 |

#### TypecheckOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | 타입체크할 경로 목록. 빈 배열이면 전체 |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

#### WatchOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | watch할 라이브러리 패키지 목록. 빈 배열이면 전체 |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

#### DevOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | dev 실행할 client/server 패키지 목록. 빈 배열이면 전체 |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

#### BuildOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | 빌드할 패키지 목록. 빈 배열이면 전체 |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

#### PublishOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | 배포할 패키지 목록. 빈 배열이면 publish 설정이 있는 전체 |
| `noBuild` | `boolean` | 빌드 없이 배포 (위험) |
| `dryRun` | `boolean` | 실제 배포 없이 시뮬레이션 |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

#### DeviceOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `package` | `string` | 패키지 이름 (필수) |
| `url` | `string \| undefined` | 개발 서버 URL (미지정 시 sd.config.ts의 server 포트 사용) |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

### API 동작 방식

- `runLint`, `runTypecheck`, `runBuild`: `Promise<void>` 반환. 에러 발견 시 `process.exitCode = 1`을 설정하고 resolve (throw하지 않음)
- `runWatch`, `runDev`: `Promise<void>` 반환. SIGINT/SIGTERM 시그널 수신 시 resolve
- `runPublish`: `Promise<void>` 반환. 실패 시 가능한 범위에서 자동 롤백 후 `process.exitCode = 1` 설정
- `runDevice`: `Promise<void>` 반환. 실패 시 `process.exitCode = 1` 설정

## 캐시

| 명령어 | 캐시 경로 | 설명 |
|--------|----------|------|
| `lint` | `.cache/eslint.cache` | ESLint 캐시 |
| `typecheck` | `packages/{pkg}/.cache/typecheck-{env}.tsbuildinfo` | incremental 타입체크 정보 (`{env}`는 `node` 또는 `browser`) |
| `watch` (dts) | `packages/{pkg}/.cache/dts.tsbuildinfo` | incremental .d.ts 빌드 정보 |

캐시를 초기화하려면 `.cache` 디렉토리를 삭제한다:

```bash
# 전체 캐시 삭제
rm -rf .cache packages/*/.cache
```

## 주의사항

- `sd.config.ts`는 `watch`, `dev`, `build`, `publish`, `device` 명령어에서 필수이다. `typecheck`와 `lint`는 설정 파일 없이도 동작한다.
- `publish` 명령어는 자동으로 버전을 증가시키고 Git 커밋/태그/푸시를 수행한다. 커밋되지 않은 변경사항이 있으면 실행이 거부된다.
- `publish --no-build`는 이미 빌드된 결과물을 그대로 배포하므로 사용 시 주의가 필요하다.
- `device` 명령어 사용 전 `sd-cli dev` 또는 `sd-cli watch`를 먼저 실행하여 Capacitor 프로젝트를 초기화해야 한다.
- 빌드 시 `VER`(프로젝트 버전)과 `DEV`(`"true"` 또는 `"false"`) 환경변수가 자동으로 설정된다.

## 라이선스

Apache-2.0
