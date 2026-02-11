# CLI 패키지 구조 리팩토링 설계서

## 1. 현재 구조 분석

### 1.1 디렉토리 구조

```
packages/cli/src/
├── sd-cli.ts              # CLI 진입점 (yargs 기반)
├── sd-config.types.ts     # 설정 타입 정의
├── index.ts               # 라이브러리 API export
│
├── commands/              # 명령어 구현 (6개)
│   ├── lint.ts            # ESLint 실행
│   ├── typecheck.ts       # TypeScript 타입체크
│   ├── build.ts           # 프로덕션 빌드 (461줄)
│   ├── watch.ts           # Watch 모드 - 라이브러리 (309줄)
│   ├── dev.ts             # Dev 모드 - client/server (581줄)
│   ├── publish.ts         # NPM/FTP 배포
│   └── device.ts          # Android 디바이스 실행
│
├── workers/               # Worker Thread 구현 (6개)
│   ├── build.worker.ts    # esbuild 일회성 빌드
│   ├── watch.worker.ts    # esbuild/Vite watch
│   ├── dts.worker.ts      # .d.ts 생성
│   ├── typecheck.worker.ts
│   ├── server-build.worker.ts
│   └── server-runtime.worker.ts
│
├── utils/                 # 유틸리티 (8개)
│   ├── sd-config.ts
│   ├── tsconfig.ts
│   ├── typecheck-serialization.ts
│   ├── listr-manager.ts
│   ├── worker-events.ts
│   ├── package-utils.ts
│   ├── output-utils.ts
│   └── spawn.ts
│
└── capacitor/
    └── capacitor.ts       # Android 빌드/실행 (885줄)
```

### 1.2 문제점

#### Critical: 책임 분리 부족

| 파일           | 줄수 | 책임                                                                                                        |
| -------------- | ---- | ----------------------------------------------------------------------------------------------------------- |
| `dev.ts`       | 581  | 설정 로드, 패키지 분류, Worker 생성, 이벤트 핸들러 등록, Listr 구성, 초기 빌드, Capacitor 초기화, 종료 처리 |
| `build.ts`     | 461  | 설정 로드, 패키지 분류, lint 호출, Worker 생성, Vite 빌드, DTS 생성, Capacitor 빌드, 결과 수집              |
| `watch.ts`     | 309  | 설정 로드, 패키지 분류, Worker 생성, 이벤트 핸들러, Listr 구성, 종료 처리                                   |
| `capacitor.ts` | 885  | 초기화, Android 설정, 빌드, 디바이스 실행, 서명 등 모든 것                                                  |

**결과**: 하나의 함수/클래스가 너무 많은 책임을 가져 로직 추적이 어려움

#### Important: 코드 중복

`dev.ts`와 `watch.ts` 공통 패턴:

- Worker 생성 및 관리
- 이벤트 핸들러 등록
- Promise resolver 패턴
- Listr 구성
- 종료 시그널 처리

#### Important: 일관성 부족

- `worker-events.ts`의 `registerWorkerEventHandlers`가 `watch.ts`에서는 사용되지만 `dev.ts`의 서버 로직에서는 인라인으로 구현
- 빌드 결과 타입이 파일마다 다르게 정의 (`BuildResult`, `PackageResult`)

---

## 2. 새 아키텍처 설계

### 2.1 설계 원칙

1. **단일 책임 원칙**: 각 클래스는 하나의 책임만 가짐
2. **생명주기 명확화**: 초기화 → 실행 → 종료 단계 분리
3. **확장성**: 새 빌드 타겟 추가 시 기존 코드 수정 최소화
4. **테스트 용이성**: 각 계층을 독립적으로 테스트 가능

### 2.2 새 디렉토리 구조

```
packages/cli/src/
├── sd-cli.ts                    # CLI 진입점 (유지, 얇은 레이어)
├── sd-config.types.ts           # 설정 타입 (유지)
├── index.ts                     # API export (유지)
│
├── commands/                    # CLI 명령어 (얇은 레이어로 변경)
│   ├── lint.ts                  # (유지)
│   ├── typecheck.ts             # (유지)
│   ├── build.ts                 # → BuildOrchestrator 호출만
│   ├── watch.ts                 # → WatchOrchestrator 호출만
│   ├── dev.ts                   # → DevOrchestrator 호출만
│   ├── publish.ts               # (유지)
│   └── device.ts                # (유지)
│
├── orchestrators/               # [NEW] 명령어 흐름 조율
│   ├── BuildOrchestrator.ts     # 프로덕션 빌드 흐름
│   ├── WatchOrchestrator.ts     # Watch 모드 흐름
│   └── DevOrchestrator.ts       # Dev 모드 흐름
│
├── builders/                    # [NEW] 빌드 타겟별 Builder
│   ├── types.ts                 # 공통 타입 정의
│   ├── BaseBuilder.ts           # 추상 베이스 클래스
│   ├── LibraryBuilder.ts        # node/browser/neutral
│   ├── ClientBuilder.ts         # client (Vite)
│   ├── ServerBuilder.ts         # server
│   └── DtsBuilder.ts            # .d.ts 생성
│
├── workers/                     # Worker (유지)
│   ├── build.worker.ts
│   ├── watch.worker.ts
│   ├── dts.worker.ts
│   ├── typecheck.worker.ts
│   ├── server-build.worker.ts
│   └── server-runtime.worker.ts
│
├── infra/                       # [NEW] 인프라 계층
│   ├── WorkerManager.ts         # Worker 생명주기 관리
│   ├── SignalHandler.ts         # 시그널 처리
│   ├── ResultCollector.ts       # 결과 수집/출력
│   └── ListrFactory.ts          # Listr 태스크 생성
│
├── utils/                       # 유틸리티 (유지)
│   ├── sd-config.ts
│   ├── tsconfig.ts
│   ├── typecheck-serialization.ts
│   ├── package-utils.ts
│   ├── output-utils.ts
│   └── spawn.ts
│
└── capacitor/                   # [REFACTOR] 책임 분리
    ├── CapacitorProject.ts      # 프로젝트 초기화/설정
    ├── AndroidBuilder.ts        # Android APK 빌드
    └── DeviceRunner.ts          # 디바이스 실행
```

---

## 3. 클래스 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Commands (얇은 레이어)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │ build.ts │  │ watch.ts │  │  dev.ts  │                          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                          │
└───────┼─────────────┼─────────────┼────────────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Orchestrators (흐름 조율)                      │
│  ┌──────────────────┐ ┌────────────────────┐ ┌──────────────────┐  │
│  │ BuildOrchestrator│ │ WatchOrchestrator  │ │ DevOrchestrator  │  │
│  │ - lint()         │ │ - initialize()     │ │ - initialize()   │  │
│  │ - clean()        │ │ - start()          │ │ - start()        │  │
│  │ - buildAll()     │ │ - awaitTermination │ │ - awaitTerminate │  │
│  └────────┬─────────┘ └─────────┬──────────┘ └────────┬─────────┘  │
└───────────┼─────────────────────┼─────────────────────┼────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Builders (빌드 실행)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      <<abstract>>                             │  │
│  │                       BaseBuilder                             │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  # workerManager: WorkerManager                               │  │
│  │  # resultCollector: ResultCollector                           │  │
│  │  # packages: PackageInfo[]                                    │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  + initialize(): Promise<void>                                │  │
│  │  + build(): Promise<void>       // 일회성 빌드                  │  │
│  │  + startWatch(): Promise<void>  // watch 모드                  │  │
│  │  + shutdown(): Promise<void>                                  │  │
│  │  # abstract createWorkers(): void                             │  │
│  │  # abstract registerEventHandlers(): void                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│              △                △                △                   │
│              │                │                │                   │
│    ┌─────────┴───┐  ┌────────┴────┐  ┌───────┴──────┐             │
│    │LibraryBuilder│  │ClientBuilder│  │ServerBuilder │             │
│    │(node/browser)│  │   (Vite)    │  │ (esbuild)    │             │
│    └──────────────┘  └─────────────┘  └──────────────┘             │
│                                                                     │
│    ┌──────────────┐                                                │
│    │  DtsBuilder  │  (.d.ts 생성 전담)                              │
│    └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Infra (인프라 계층)                           │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐  │
│  │ WorkerManager │  │ResultCollector│  │    SignalHandler       │  │
│  │ - create()    │  │ - add()       │  │ - onTerminate()        │  │
│  │ - terminate() │  │ - getErrors() │  │ - waitForTermination() │  │
│  │ - on/emit()   │  │ - print()     │  └────────────────────────┘  │
│  └───────────────┘  └───────────────┘                              │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                     ListrFactory                            │    │
│  │  + createInitialBuildTasks(builders: BaseBuilder[]): Listr  │    │
│  │  + createRebuildTask(title, promise): ListrTask             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 클래스별 책임 정의

### 4.1 Commands (얇은 레이어)

```typescript
// commands/watch.ts
export async function runWatch(options: WatchOptions): Promise<void> {
  const orchestrator = new WatchOrchestrator(options);
  await orchestrator.initialize();
  await orchestrator.start();
  await orchestrator.awaitTermination();
  await orchestrator.shutdown();
}
```

**책임**: CLI 인자 파싱 → Orchestrator 생성 → 실행 (로직 없음)

### 4.2 Orchestrators

#### WatchOrchestrator

```typescript
class WatchOrchestrator {
  private libraryBuilder: LibraryBuilder;
  private dtsBuilder: DtsBuilder;
  private signalHandler: SignalHandler;
  private listrFactory: ListrFactory;

  async initialize() {
    // 1. sd.config.ts 로드
    // 2. 패키지 필터링 (library만)
    // 3. Builder 생성 및 초기화
  }

  async start() {
    // 1. 초기 빌드 Listr 생성 및 실행
    // 2. 결과 출력
  }

  async awaitTermination() {
    // SignalHandler로 종료 시그널 대기
  }

  async shutdown() {
    // Builder들의 shutdown 호출
  }
}
```

#### DevOrchestrator

```typescript
class DevOrchestrator {
  private clientBuilder: ClientBuilder;
  private serverBuilder: ServerBuilder;
  private capacitorInitializer: CapacitorProject;
  private signalHandler: SignalHandler;

  async initialize() {
    // 1. sd.config.ts 로드
    // 2. 패키지 분류 (client, server, standalone)
    // 3. 서버-클라이언트 매핑
    // 4. Builder 생성 및 초기화
  }

  async start() {
    // 1. 초기 빌드 Listr 실행
    // 2. Capacitor 초기화
    // 3. 결과 출력
  }
}
```

#### BuildOrchestrator

```typescript
class BuildOrchestrator {
  private libraryBuilder: LibraryBuilder;
  private clientBuilder: ClientBuilder;
  private serverBuilder: ServerBuilder;
  private dtsBuilder: DtsBuilder;

  async execute() {
    // 1. lint 실행
    // 2. dist 폴더 정리
    // 3. 모든 Builder의 build() 병렬 실행
    // 4. 결과 출력
  }
}
```

### 4.3 Builders

#### BaseBuilder (추상 클래스)

```typescript
abstract class BaseBuilder {
  protected workerManager: WorkerManager;
  protected resultCollector: ResultCollector;
  protected packages: PackageInfo[];
  protected isWatchMode: boolean = false;

  constructor(
    packages: PackageInfo[],
    resultCollector: ResultCollector,
  ) { ... }

  // 공통 메서드
  async initialize(): Promise<void> {
    this.createWorkers();
    this.registerEventHandlers();
  }

  async build(): Promise<void> {
    // 일회성 빌드 (프로덕션)
    const promises = this.packages.map(pkg => this.buildPackage(pkg));
    await Promise.all(promises);
  }

  async startWatch(): Promise<void> {
    // watch 모드 시작
    this.isWatchMode = true;
    const promises = this.packages.map(pkg => this.startWatchPackage(pkg));
    await Promise.all(promises);
  }

  async shutdown(): Promise<void> {
    await this.workerManager.terminateAll();
  }

  // 추상 메서드 (서브클래스에서 구현)
  protected abstract createWorkers(): void;
  protected abstract registerEventHandlers(): void;
  protected abstract buildPackage(pkg: PackageInfo): Promise<void>;
  protected abstract startWatchPackage(pkg: PackageInfo): Promise<void>;
}
```

#### LibraryBuilder

```typescript
class LibraryBuilder extends BaseBuilder {
  protected createWorkers() {
    for (const pkg of this.packages) {
      this.workerManager.create(
        `${pkg.name}:build`,
        'workers/watch.worker.ts'
      );
    }
  }

  protected registerEventHandlers() {
    for (const pkg of this.packages) {
      const worker = this.workerManager.get(`${pkg.name}:build`);

      worker.on('buildStart', () => { ... });
      worker.on('build', (data) => {
        this.resultCollector.add({ ... });
      });
      worker.on('error', (data) => { ... });
    }
  }

  protected async buildPackage(pkg: PackageInfo) {
    const worker = this.workerManager.get(`${pkg.name}:build`);
    await worker.build({ ... });
  }

  protected async startWatchPackage(pkg: PackageInfo) {
    const worker = this.workerManager.get(`${pkg.name}:build`);
    // watch는 Promise를 반환하지 않음 (백그라운드 실행)
    void worker.startWatch({ ... });
  }
}
```

### 4.4 Infra

#### WorkerManager

```typescript
class WorkerManager {
  private workers = new Map<string, WorkerProxy<any>>();

  create<T>(id: string, workerPath: string): WorkerProxy<T> {
    const worker = Worker.create<T>(workerPath);
    this.workers.set(id, worker);
    return worker;
  }

  get<T>(id: string): WorkerProxy<T> {
    return this.workers.get(id) as WorkerProxy<T>;
  }

  async terminate(id: string): Promise<void> {
    const worker = this.workers.get(id);
    if (worker) {
      await worker.terminate();
      this.workers.delete(id);
    }
  }

  async terminateAll(): Promise<void> {
    await Promise.all([...this.workers.values()].map((w) => w.terminate()));
    this.workers.clear();
  }
}
```

#### ResultCollector

```typescript
interface BuildResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "pending" | "building" | "success" | "error";
  message?: string;
  port?: number;
  diagnostics?: ts.Diagnostic[];
}

class ResultCollector {
  private results = new Map<string, BuildResult>();

  add(result: BuildResult): void {
    this.results.set(`${result.name}:${result.type}`, result);
  }

  getErrors(): BuildResult[] {
    return [...this.results.values()].filter((r) => r.status === "error");
  }

  getServers(): BuildResult[] {
    return [...this.results.values()].filter((r) => r.type === "server" && r.port);
  }

  printErrors(): void {
    // output-utils.ts의 printErrors 로직 이동
  }

  printServers(clientMapping: Map<string, string[]>): void {
    // output-utils.ts의 printServers 로직 이동
  }
}
```

#### SignalHandler

```typescript
class SignalHandler {
  private terminateResolver: (() => void) | null = null;
  private terminatePromise: Promise<void>;

  constructor() {
    this.terminatePromise = new Promise((resolve) => {
      this.terminateResolver = resolve;
    });

    const handler = () => {
      process.off("SIGINT", handler);
      process.off("SIGTERM", handler);
      this.terminateResolver?.();
    };

    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  }

  async waitForTermination(): Promise<void> {
    return this.terminatePromise;
  }
}
```

### 4.5 Capacitor (책임 분리)

```typescript
// CapacitorProject: 프로젝트 설정 관리
class CapacitorProject {
  async initialize(): Promise<void> { ... }
  async updateConfig(): Promise<void> { ... }
  async sync(): Promise<void> { ... }
}

// AndroidBuilder: APK 빌드
class AndroidBuilder {
  constructor(private project: CapacitorProject) {}
  async build(outPath: string): Promise<void> { ... }
  async buildSigned(keystoreConfig: KeystoreConfig): Promise<void> { ... }
}

// DeviceRunner: 디바이스 실행
class DeviceRunner {
  constructor(private project: CapacitorProject) {}
  async listDevices(): Promise<Device[]> { ... }
  async runOnDevice(deviceId: string): Promise<void> { ... }
}
```

---

## 5. 마이그레이션 단계

### Phase 1: 인프라 계층 구축

1. `infra/WorkerManager.ts` 생성
2. `infra/ResultCollector.ts` 생성 (기존 `PackageResult` 통합)
3. `infra/SignalHandler.ts` 생성
4. `infra/ListrFactory.ts` 생성

**테스트**: 단위 테스트로 각 클래스 검증

### Phase 2: Builders 구현

1. `builders/types.ts` - 공통 타입 정의
2. `builders/BaseBuilder.ts` - 추상 클래스
3. `builders/LibraryBuilder.ts` - `watch.ts`에서 로직 추출
4. `builders/DtsBuilder.ts` - DTS 생성 전담

**테스트**: LibraryBuilder로 기존 `watch` 명령어 대체 테스트

### Phase 3: Orchestrators 구현

1. `orchestrators/WatchOrchestrator.ts` 구현
2. `commands/watch.ts`를 얇은 레이어로 변경
3. 기존 동작과 동일한지 검증

### Phase 4: Dev/Build 마이그레이션

1. `builders/ClientBuilder.ts` 구현
2. `builders/ServerBuilder.ts` 구현
3. `orchestrators/DevOrchestrator.ts` 구현
4. `orchestrators/BuildOrchestrator.ts` 구현
5. `commands/dev.ts`, `commands/build.ts` 변경

### Phase 5: Capacitor 분리

1. `capacitor/CapacitorProject.ts` 추출
2. `capacitor/AndroidBuilder.ts` 추출
3. `capacitor/DeviceRunner.ts` 추출
4. 기존 `capacitor.ts` 삭제

### Phase 6: 정리

1. 불필요한 코드 제거
2. 테스트 커버리지 보강
3. 문서화

---

## 6. 예상 효과

### 6.1 유지보수성 개선

| Before                    | After                                          |
| ------------------------- | ---------------------------------------------- |
| `dev.ts` 581줄 단일 함수  | `DevOrchestrator` ~100줄 + Builder들 각 ~100줄 |
| 로직 추적: "dev.ts 어디?" | 로직 추적: "ServerBuilder.startWatch()"        |
| 수정 영향 범위 불명확     | 클래스별 책임 명확                             |

### 6.2 확장성 향상

새 빌드 타겟 추가 시:

```typescript
// 기존: dev.ts, build.ts, watch.ts 모두 수정
// 신규: ElectronBuilder extends BaseBuilder 추가 + Orchestrator에 등록
```

### 6.3 테스트 용이성

```typescript
// Worker 모킹 후 Builder 단위 테스트
const mockWorkerManager = new MockWorkerManager();
const builder = new LibraryBuilder(packages, resultCollector);
builder.workerManager = mockWorkerManager;

await builder.build();
expect(mockWorkerManager.buildCalled).toBe(true);
```

---

## 7. 인터페이스 정의 (TypeScript)

```typescript
// builders/types.ts

export interface PackageInfo {
  name: string;
  dir: string;
  target: string;
  config: SdPackageConfig;
}

export interface BuildOptions {
  cwd: string;
  dev: boolean;
}

export interface BuilderConfig {
  packages: PackageInfo[];
  resultCollector: ResultCollector;
  rebuildManager?: RebuildListrManager;
}

export interface BuildResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "pending" | "building" | "success" | "error" | "server";
  message?: string;
  port?: number;
  diagnostics?: ts.Diagnostic[];
}

// Builder 인터페이스
export interface IBuilder {
  initialize(): Promise<void>;
  build(): Promise<void>;
  startWatch(): Promise<void>;
  shutdown(): Promise<void>;
  getInitialBuildPromises(): Map<string, Promise<void>>;
}

// Orchestrator 인터페이스
export interface IOrchestrator {
  initialize(): Promise<void>;
  start(): Promise<void>;
  awaitTermination(): Promise<void>;
  shutdown(): Promise<void>;
}
```

---

## 8. 결론

이 설계는 다음 문제를 해결합니다:

1. **책임 분리**: Orchestrator(흐름) / Builder(빌드) / Infra(인프라)
2. **코드 중복**: BaseBuilder에서 공통 로직 관리
3. **로직 추적**: 클래스와 메서드 이름으로 위치 파악 용이
4. **확장성**: 새 타겟은 Builder 추가로 대응
5. **테스트**: 각 계층 독립 테스트 가능

마이그레이션은 단계별로 진행하여 기존 기능을 유지하면서 점진적으로 개선합니다.
