# 아키텍처

sd-cli의 내부 아키텍처 상세 문서.

## 실행 흐름

### CLI 진입점

```
sd-cli.ts (런처)
  ├─ 개발 모드 (.ts): CPU 어피니티 설정 → sd-cli-entry.ts 직접 import
  └─ 프로덕션 모드 (.js):
       1. replaceDeps 실행 (모듈 캐시 전 심링크 설정)
       2. 새 프로세스에서 sd-cli-entry.ts 실행 (모듈 캐시 리셋)
          --max-old-space-size=8192 --max-semi-space-size=16
```

CPU 어피니티: 전체 CPU 중 앞쪽 코어를 제외하고 남은 코어에만 바인딩. OS/다른 프로세스를 위한 코어 확보.

### CLI 파서

`sd-cli-entry.ts`에서 yargs로 명령어를 파싱한다.

```typescript
export function createCliParser(argv: string[]): Argv
```

전역 옵션: `--debug` (consola 로그 레벨을 debug로 설정)

## 빌드 파이프라인

### 빌드 타겟별 처리

| 타겟 | JS 빌드 | 타입 검사 | .d.ts | 기타 |
|------|---------|----------|-------|------|
| node/browser/neutral | esbuild (bundle: false) | Worker (dts.worker) | 생성 | copySrc |
| client | Vite (production build) | Worker (dts.worker) | 미생성 | Capacitor/Electron |
| server | esbuild (bundle: true, minify) | - | - | PM2 설정 생성 |

### esbuild 설정

**라이브러리 빌드** (`createLibraryEsbuildOptions`):
- `bundle: false` (개별 파일 트랜스파일)
- `format: "esm"`, `sourcemap: true`
- `platform`: node → `"node"`, browser/neutral → `"browser"`
- `target`: node → `"node20"`, browser/neutral → `"chrome84"`
- solid-js 의존성 감지 시 `esbuild-plugin-solid` 자동 적용
- 출력 후 ESM import 경로에 `.js` 확장자 자동 추가

**서버 빌드** (`createServerEsbuildOptions`):
- `bundle: true` (모든 의존성 포함)
- `minify: true` (코드 보호)
- `banner`: `createRequire` shim (CJS 패키지 호환)
- `process.env.KEY` 상수 치환 (define)
- 자동 external: native 모듈 (binding.gyp), 미설치 optional peer deps

### Vite 설정

`createViteConfig`가 생성하는 Vite 설정:

**플러그인:**
- `vite-tsconfig-paths`: tsconfig path alias 해석
- `vite-plugin-solid`: SolidJS JSX 컴파일
- `vite-plugin-pwa`: PWA manifest/service worker
- `sdTailwindConfigDepsPlugin`: scope 패키지 Tailwind 설정 변경 감지
- `sdScopeWatchPlugin`: scope 패키지 dist 변경 감지 + optimizeDeps 제외
- `sdPublicDevPlugin`: `public-dev/` 디렉토리 우선 서빙 (dev 모드 전용)

**CSS:**
- PostCSS + TailwindCSS (각 패키지의 `tailwind.config.ts` 사용)

## 오케스트레이터

### BuildOrchestrator

프로덕션 빌드 워크플로우를 관리한다.

```
initialize()
  ├─ sd.config.ts 로드
  ├─ 패키지 분류 (build/client/server)
  └─ 환경 변수 준비 (VER, DEV)

start() → boolean (에러 여부)
  ├─ Phase 1: Clean (dist 폴더 삭제)
  └─ Phase 2: Lint + Build (병렬)
       ├─ Lint Worker
       ├─ buildPackages → Library Worker + DTS Worker (병렬)
       ├─ clientPackages → Client Worker + DTS Worker (병렬) + Capacitor/Electron
       └─ serverPackages → Server Worker

shutdown()
```

### DevOrchestrator

개발 모드 워크플로우를 관리한다.

```
initialize()
  ├─ sd.config.ts 로드
  ├─ replaceDeps watch 시작
  ├─ 패키지 분류 (client/server)
  └─ 서버-클라이언트 매핑

start()
  ├─ 클라이언트 Worker 시작
  │   ├─ standalone (server가 number이거나 서버가 dev 대상 아님)
  │   └─ server-connected (server가 string이고 서버가 dev 대상)
  ├─ 서버 Build Worker 시작
  │   └─ build 이벤트 → Server Runtime Worker 시작
  │       └─ Vite 클라이언트 ready 대기 → 프록시 포트 전달
  └─ Capacitor 초기화

awaitTermination() → SIGINT/SIGTERM 대기
shutdown() → 모든 Worker 종료
```

서버-클라이언트 프록시 연결:
1. 클라이언트의 `server` 필드가 서버 패키지명이면 프록시 대상
2. Vite 서버가 자동 포트를 할당받아 `serverReady` 이벤트 emit
3. 서버 런타임에 클라이언트 포트 맵을 전달
4. Fastify 서버가 `@fastify/http-proxy`로 Vite 서버에 프록시

### WatchOrchestrator

라이브러리 watch 모드를 관리한다.

```
initialize()
  ├─ sd.config.ts 로드
  ├─ replaceDeps watch 시작
  ├─ 라이브러리 패키지 필터링 (node/browser/neutral)
  ├─ LibraryBuilder + DtsBuilder 생성
  └─ 빌더 초기화

start()
  ├─ copySrc watch 시작
  ├─ LibraryBuilder.startWatch()
  ├─ DtsBuilder.startWatch()
  └─ 초기 빌드 완료 대기

awaitTermination() → SIGINT/SIGTERM 대기
shutdown() → 빌더 종료 + watcher 정리
```

## 빌더

### BaseBuilder (추상 클래스)

모든 빌더의 공통 로직을 제공한다.

```typescript
abstract class BaseBuilder implements IBuilder {
  // 공통 메서드
  initialize(): Promise<void>;
  build(): Promise<void>;          // 프로덕션 1회 빌드
  startWatch(): Promise<void>;     // watch 모드
  shutdown(): Promise<void>;
  getInitialBuildPromises(): Map<string, Promise<void>>;

  // 서브클래스 구현 필수
  abstract getBuilderType(): string;
  abstract createWorkers(): void;
  abstract registerEventHandlers(): void;
  abstract buildPackage(pkg: PackageInfo): Promise<void>;
  abstract startWatchPackage(pkg: PackageInfo): void;
}
```

### LibraryBuilder

esbuild 기반 JS 컴파일. Worker 키: `{패키지명}:build`.

- watch 모드: Worker의 `startWatch()` 호출, `buildStart`/`build`/`error` 이벤트 수신
- 종료 시 `stopWatch()` 호출 (esbuild context dispose), 3초 타임아웃

### DtsBuilder

TypeScript .d.ts 파일 생성. Worker 키: `{패키지명}:dts`.

- 환경 결정: node → `"node"`, browser/neutral/client → `"browser"`

## Worker 스레드

모든 빌드 작업은 Worker 스레드에서 실행되어 메인 스레드를 차단하지 않는다.

| Worker | 파일 | 역할 |
|--------|------|------|
| library.worker | `workers/library.worker.ts` | esbuild 라이브러리 JS 빌드 |
| dts.worker | `workers/dts.worker.ts` | .d.ts 생성 + 타입체크 |
| client.worker | `workers/client.worker.ts` | Vite 빌드/개발 서버 |
| server.worker | `workers/server.worker.ts` | esbuild 서버 빌드 |
| server-runtime.worker | `workers/server-runtime.worker.ts` | Fastify 서버 런타임 |
| lint.worker | `workers/lint.worker.ts` | ESLint 실행 |

### Worker 이벤트

Worker와 메인 스레드 간 이벤트 통신:

| 이벤트 | 데이터 | 발생 시점 |
|--------|--------|----------|
| `buildStart` | `{}` | 빌드/리빌드 시작 |
| `build` | `{ success, errors?, warnings? }` | 빌드 완료 |
| `serverReady` | `{ port }` | Vite/Fastify 서버 시작 |
| `scopeRebuild` | `{}` | scope 패키지 dist 변경 감지 |
| `error` | `{ message }` | 에러 발생 |

## 인프라 클래스

### WorkerManager

Worker 생명주기를 중앙 관리한다.

```typescript
class WorkerManager {
  create<T>(id: string, workerPath: string): WorkerProxy<T>;
  get<T>(id: string): WorkerProxy<T> | undefined;
  terminate(id: string): Promise<void>;
  terminateAll(): Promise<void>;
  readonly size: number;
  readonly ids: string[];
}
```

### ResultCollector

빌드 결과를 수집하고 상태를 관리한다.

```typescript
interface BuildResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "pending" | "building" | "success" | "error" | "running";
  message?: string;
  port?: number;
}

class ResultCollector {
  add(result: BuildResult): void;
  get(key: string): BuildResult | undefined;
  toMap(): Map<string, BuildResult>;
}
```

### SignalHandler

프로세스 종료 시그널을 처리한다.

```typescript
class SignalHandler {
  waitForTermination(): Promise<void>;
  isTerminated(): boolean;
  requestTermination(): void;  // 프로그래밍 방식 종료
}
```

### RebuildManager

리빌드 시 배치 완료를 추적하고 `batchComplete` 이벤트를 발생시킨다.
동시에 여러 패키지가 리빌드되는 경우 모두 완료된 후 한 번만 결과를 출력하기 위해 사용한다.

## Capacitor / Electron

### Capacitor 클래스

Capacitor 프로젝트를 관리한다.

```typescript
class Capacitor {
  static create(pkgDir: string, config: SdCapacitorConfig): Promise<Capacitor>;
  initialize(): Promise<void>;     // .capacitor/ 프로젝트 생성/업데이트
  build(outPath: string): Promise<void>;      // APK/AAB 빌드
  runOnDevice(serverUrl: string): Promise<void>;  // 기기에서 실행
}
```

### Electron 클래스

Electron 프로젝트를 관리한다.

```typescript
class Electron {
  static create(pkgDir: string, config: SdElectronConfig): Promise<Electron>;
  initialize(): Promise<void>;     // .electron/ 프로젝트 생성/업데이트
  build(outPath: string): Promise<void>;      // Windows exe 빌드
  run(serverUrl: string): Promise<void>;      // 개발 모드 실행
}
```

## 유틸리티

| 모듈 | 역할 |
|------|------|
| `sd-config.ts` | `sd.config.ts` 로드 (jiti 사용) |
| `tsconfig.ts` | tsconfig.json 파싱, TypecheckEnv 결정 |
| `esbuild-config.ts` | esbuild 빌드 옵션 생성 |
| `vite-config.ts` | Vite 설정 생성 |
| `build-env.ts` | 버전, 환경 변수 관리 |
| `replace-deps.ts` | replaceDeps 심링크 + watch |
| `copy-src.ts` | copySrc 파일 복사 + watch |
| `copy-public.ts` | public 파일 복사 |
| `output-utils.ts` | 빌드 결과 포맷팅 출력 |
| `rebuild-manager.ts` | 리빌드 배치 추적 |
| `worker-utils.ts` | Worker 유틸리티 |
| `worker-events.ts` | Worker 이벤트 타입/핸들러 |
| `package-utils.ts` | 패키지 필터링, 루트 패키지 탐색 |
| `template.ts` | Handlebars 템플릿 렌더링 |
| `typecheck-serialization.ts` | ts.Diagnostic 직렬화/역직렬화 |
| `tailwind-config-deps.ts` | Tailwind 설정 파일 의존성 추적 |
