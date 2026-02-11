# CLI 패키지 구조 리팩토링 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CLI 패키지의 책임 분리를 통해 유지보수성과 확장성을 개선한다.

**Architecture:** Orchestrator(흐름 조율) / Builder(빌드 실행) / Infra(인프라 계층) 3계층으로 분리. Commands는 얇은 레이어로 변경.

**Tech Stack:** TypeScript, Node.js Worker Threads, Listr2, esbuild, Vite

---

## Phase 1: 인프라 계층 구축

### Task 1: ResultCollector 구현

**Files:**

- Create: `packages/cli/src/infra/ResultCollector.ts`
- Reference: `packages/cli/src/utils/package-utils.ts` (PackageResult 타입)
- Reference: `packages/cli/src/utils/output-utils.ts` (printErrors, printServers 로직)

**Step 1: 테스트 파일 생성**

```typescript
// packages/cli/tests/infra/ResultCollector.spec.ts
import { describe, it, expect } from "vitest";
import { ResultCollector, type BuildResult } from "../../src/infra/ResultCollector";

describe("ResultCollector", () => {
  it("결과를 추가하고 조회할 수 있다", () => {
    const collector = new ResultCollector();
    const result: BuildResult = {
      name: "core-common",
      target: "neutral",
      type: "build",
      status: "success",
    };

    collector.add(result);

    expect(collector.get("core-common:build")).toEqual(result);
  });

  it("에러 상태인 결과만 필터링할 수 있다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });
    collector.add({ name: "pkg2", target: "node", type: "build", status: "error", message: "fail" });

    const errors = collector.getErrors();

    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe("pkg2");
  });

  it("서버 상태인 결과만 필터링할 수 있다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });
    collector.add({ name: "pkg2", target: "server", type: "server", status: "server", port: 3000 });

    const servers = collector.getServers();

    expect(servers).toHaveLength(1);
    expect(servers[0].port).toBe(3000);
  });
});
```

**Step 2: 테스트 실행 - 실패 확인**

Run: `pnpm vitest packages/cli/tests/infra/ResultCollector.spec.ts --project=node --run`
Expected: FAIL - 모듈을 찾을 수 없음

**Step 3: ResultCollector 구현**

```typescript
// packages/cli/src/infra/ResultCollector.ts

/**
 * 빌드 결과 상태
 */
export interface BuildResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "pending" | "building" | "success" | "error" | "server";
  message?: string;
  port?: number;
}

/**
 * 빌드 결과를 수집하고 관리하는 클래스
 *
 * 여러 Builder에서 발생하는 빌드 결과를 중앙에서 관리하고,
 * 상태별 필터링 및 출력 기능을 제공한다.
 */
export class ResultCollector {
  private readonly _results = new Map<string, BuildResult>();

  /**
   * 결과 추가
   * @param result 빌드 결과
   */
  add(result: BuildResult): void {
    const key = `${result.name}:${result.type}`;
    this._results.set(key, result);
  }

  /**
   * 키로 결과 조회
   * @param key 결과 키 (예: "core-common:build")
   */
  get(key: string): BuildResult | undefined {
    return this._results.get(key);
  }

  /**
   * 모든 결과 조회
   */
  getAll(): BuildResult[] {
    return [...this._results.values()];
  }

  /**
   * 에러 상태인 결과만 조회
   */
  getErrors(): BuildResult[] {
    return this.getAll().filter((r) => r.status === "error");
  }

  /**
   * 서버 상태인 결과만 조회
   */
  getServers(): BuildResult[] {
    return this.getAll().filter((r) => r.type === "server" && r.status === "server");
  }

  /**
   * 특정 타입의 결과만 조회
   * @param type 결과 타입
   */
  getByType(type: BuildResult["type"]): BuildResult[] {
    return this.getAll().filter((r) => r.type === type);
  }

  /**
   * 결과 초기화
   */
  clear(): void {
    this._results.clear();
  }

  /**
   * 내부 Map 반환 (하위 호환성)
   */
  toMap(): Map<string, BuildResult> {
    return this._results;
  }
}
```

**Step 4: 테스트 실행 - 통과 확인**

Run: `pnpm vitest packages/cli/tests/infra/ResultCollector.spec.ts --project=node --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/cli/src/infra/ResultCollector.ts packages/cli/tests/infra/ResultCollector.spec.ts
git commit -m "$(cat <<'EOF'
feat(cli): add ResultCollector for centralized build result management

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: SignalHandler 구현

**Files:**

- Create: `packages/cli/src/infra/SignalHandler.ts`
- Reference: `packages/cli/src/commands/watch.ts:144-157` (기존 시그널 처리 로직)

**Step 1: 테스트 파일 생성**

```typescript
// packages/cli/tests/infra/SignalHandler.spec.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { SignalHandler } from "../../src/infra/SignalHandler";

describe("SignalHandler", () => {
  afterEach(() => {
    // 테스트 간 process 리스너 정리
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  it("종료 요청 시 waitForTermination이 resolve된다", async () => {
    const handler = new SignalHandler();

    // 비동기로 종료 요청
    setTimeout(() => handler.requestTermination(), 10);

    await expect(handler.waitForTermination()).resolves.toBeUndefined();
  });

  it("isTerminated가 종료 상태를 반환한다", () => {
    const handler = new SignalHandler();

    expect(handler.isTerminated()).toBe(false);

    handler.requestTermination();

    expect(handler.isTerminated()).toBe(true);
  });
});
```

**Step 2: 테스트 실행 - 실패 확인**

Run: `pnpm vitest packages/cli/tests/infra/SignalHandler.spec.ts --project=node --run`
Expected: FAIL - 모듈을 찾을 수 없음

**Step 3: SignalHandler 구현**

```typescript
// packages/cli/src/infra/SignalHandler.ts

/**
 * 프로세스 종료 시그널을 처리하는 클래스
 *
 * SIGINT (Ctrl+C) 및 SIGTERM 시그널을 감지하고,
 * 종료 시점까지 대기하는 Promise를 제공한다.
 */
export class SignalHandler {
  private _terminateResolver: (() => void) | null = null;
  private readonly _terminatePromise: Promise<void>;
  private _terminated = false;

  constructor() {
    this._terminatePromise = new Promise((resolve) => {
      this._terminateResolver = resolve;
    });

    const handler = () => {
      process.off("SIGINT", handler);
      process.off("SIGTERM", handler);
      this._terminated = true;
      this._terminateResolver?.();
    };

    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  }

  /**
   * 종료 시그널이 수신될 때까지 대기
   */
  async waitForTermination(): Promise<void> {
    return this._terminatePromise;
  }

  /**
   * 종료 여부 확인
   */
  isTerminated(): boolean {
    return this._terminated;
  }

  /**
   * 프로그래밍 방식으로 종료 요청
   * (테스트 또는 외부에서 종료 트리거 시 사용)
   */
  requestTermination(): void {
    if (!this._terminated) {
      this._terminated = true;
      this._terminateResolver?.();
    }
  }
}
```

**Step 4: 테스트 실행 - 통과 확인**

Run: `pnpm vitest packages/cli/tests/infra/SignalHandler.spec.ts --project=node --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/cli/src/infra/SignalHandler.ts packages/cli/tests/infra/SignalHandler.spec.ts
git commit -m "$(cat <<'EOF'
feat(cli): add SignalHandler for process signal management

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: WorkerManager 구현

**Files:**

- Create: `packages/cli/src/infra/WorkerManager.ts`
- Reference: `packages/cli/src/commands/watch.ts:112-131` (기존 Worker 생성 로직)

**Step 1: 테스트 파일 생성**

```typescript
// packages/cli/tests/infra/WorkerManager.spec.ts
import { describe, it, expect, vi } from "vitest";
import { WorkerManager } from "../../src/infra/WorkerManager";

// Worker 모킹
vi.mock("@simplysm/core-node", () => ({
  Worker: {
    create: vi.fn(() => ({
      on: vi.fn(),
      terminate: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

describe("WorkerManager", () => {
  it("Worker를 생성하고 ID로 조회할 수 있다", () => {
    const manager = new WorkerManager();

    const worker = manager.create("test-worker", "/path/to/worker.ts");

    expect(worker).toBeDefined();
    expect(manager.get("test-worker")).toBe(worker);
  });

  it("존재하지 않는 Worker 조회 시 undefined 반환", () => {
    const manager = new WorkerManager();

    expect(manager.get("nonexistent")).toBeUndefined();
  });

  it("모든 Worker를 종료할 수 있다", async () => {
    const manager = new WorkerManager();
    const worker1 = manager.create("worker1", "/path/to/worker.ts");
    const worker2 = manager.create("worker2", "/path/to/worker.ts");

    await manager.terminateAll();

    expect(worker1.terminate).toHaveBeenCalled();
    expect(worker2.terminate).toHaveBeenCalled();
  });

  it("특정 Worker만 종료할 수 있다", async () => {
    const manager = new WorkerManager();
    const worker1 = manager.create("worker1", "/path/to/worker.ts");
    manager.create("worker2", "/path/to/worker.ts");

    await manager.terminate("worker1");

    expect(worker1.terminate).toHaveBeenCalled();
    expect(manager.get("worker1")).toBeUndefined();
  });
});
```

**Step 2: 테스트 실행 - 실패 확인**

Run: `pnpm vitest packages/cli/tests/infra/WorkerManager.spec.ts --project=node --run`
Expected: FAIL - 모듈을 찾을 수 없음

**Step 3: WorkerManager 구현**

```typescript
// packages/cli/src/infra/WorkerManager.ts
import { Worker, type WorkerProxy } from "@simplysm/core-node";

/**
 * Worker 생명주기를 관리하는 클래스
 *
 * Worker 생성, 조회, 종료를 중앙에서 관리하여
 * 리소스 누수를 방지하고 일관된 Worker 관리를 제공한다.
 */
export class WorkerManager {
  private readonly _workers = new Map<string, WorkerProxy<unknown>>();

  /**
   * 새 Worker 생성
   * @param id Worker 식별자 (예: "core-common:build")
   * @param workerPath Worker 파일 경로
   * @returns 생성된 WorkerProxy
   */
  create<T>(id: string, workerPath: string): WorkerProxy<T> {
    const worker = Worker.create<T>(workerPath);
    this._workers.set(id, worker as WorkerProxy<unknown>);
    return worker;
  }

  /**
   * ID로 Worker 조회
   * @param id Worker 식별자
   */
  get<T>(id: string): WorkerProxy<T> | undefined {
    return this._workers.get(id) as WorkerProxy<T> | undefined;
  }

  /**
   * 특정 Worker 종료 및 제거
   * @param id Worker 식별자
   */
  async terminate(id: string): Promise<void> {
    const worker = this._workers.get(id);
    if (worker != null) {
      await worker.terminate();
      this._workers.delete(id);
    }
  }

  /**
   * 모든 Worker 종료
   */
  async terminateAll(): Promise<void> {
    await Promise.all([...this._workers.values()].map((w) => w.terminate()));
    this._workers.clear();
  }

  /**
   * 관리 중인 Worker 수
   */
  get size(): number {
    return this._workers.size;
  }

  /**
   * 모든 Worker ID 목록
   */
  get ids(): string[] {
    return [...this._workers.keys()];
  }
}
```

**Step 4: 테스트 실행 - 통과 확인**

Run: `pnpm vitest packages/cli/tests/infra/WorkerManager.spec.ts --project=node --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/cli/src/infra/WorkerManager.ts packages/cli/tests/infra/WorkerManager.spec.ts
git commit -m "$(cat <<'EOF'
feat(cli): add WorkerManager for worker lifecycle management

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: infra 모듈 index.ts 생성 및 export

**Files:**

- Create: `packages/cli/src/infra/index.ts`

**Step 1: index.ts 생성**

```typescript
// packages/cli/src/infra/index.ts
export { ResultCollector, type BuildResult } from "./ResultCollector";
export { SignalHandler } from "./SignalHandler";
export { WorkerManager } from "./WorkerManager";
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/infra/index.ts
git commit -m "$(cat <<'EOF'
feat(cli): add infra module index for centralized exports

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Builders 구현

### Task 5: Builder 타입 정의

**Files:**

- Create: `packages/cli/src/builders/types.ts`
- Reference: `packages/cli/src/sd-config.types.ts` (SdPackageConfig)
- Reference: `packages/cli/src/infra/ResultCollector.ts` (BuildResult)

**Step 1: 타입 파일 생성**

```typescript
// packages/cli/src/builders/types.ts
import type { SdPackageConfig } from "../sd-config.types";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildListrManager } from "../utils/listr-manager";

/**
 * 패키지 정보
 */
export interface PackageInfo {
  name: string;
  dir: string;
  config: SdPackageConfig;
}

/**
 * Builder 공통 옵션
 */
export interface BuilderOptions {
  cwd: string;
  packages: PackageInfo[];
  resultCollector: ResultCollector;
  rebuildManager?: RebuildListrManager;
}

/**
 * Builder 인터페이스
 *
 * 모든 Builder가 구현해야 하는 공통 인터페이스
 */
export interface IBuilder {
  /**
   * Builder 초기화 (Worker 생성, 이벤트 핸들러 등록)
   */
  initialize(): Promise<void>;

  /**
   * 일회성 빌드 (프로덕션 빌드용)
   */
  build(): Promise<void>;

  /**
   * Watch 모드 시작
   * Promise는 초기 빌드 완료 시 resolve됨
   */
  startWatch(): Promise<void>;

  /**
   * Builder 종료 (Worker 정리)
   */
  shutdown(): Promise<void>;

  /**
   * 초기 빌드 Promise 맵 반환 (Listr 태스크용)
   */
  getInitialBuildPromises(): Map<string, Promise<void>>;
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/builders/types.ts
git commit -m "$(cat <<'EOF'
feat(cli): add Builder interface and common types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: BaseBuilder 추상 클래스 구현

**Files:**

- Create: `packages/cli/src/builders/BaseBuilder.ts`
- Reference: `packages/cli/src/builders/types.ts`
- Reference: `packages/cli/src/infra/WorkerManager.ts`

**Step 1: BaseBuilder 구현**

```typescript
// packages/cli/src/builders/BaseBuilder.ts
import { WorkerManager } from "../infra/WorkerManager";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildListrManager } from "../utils/listr-manager";
import type { IBuilder, PackageInfo } from "./types";

/**
 * Builder 추상 베이스 클래스
 *
 * 모든 Builder의 공통 로직을 제공하고,
 * 서브클래스에서 구현해야 할 추상 메서드를 정의한다.
 */
export abstract class BaseBuilder implements IBuilder {
  protected readonly workerManager: WorkerManager;
  protected readonly resultCollector: ResultCollector;
  protected readonly rebuildManager: RebuildListrManager | undefined;
  protected readonly packages: PackageInfo[];
  protected readonly cwd: string;
  protected isWatchMode = false;

  /** 초기 빌드 Promise (패키지별) */
  protected readonly initialBuildPromises = new Map<string, Promise<void>>();
  /** 초기 빌드 resolver (패키지별) */
  protected readonly buildResolvers = new Map<string, () => void>();

  constructor(options: {
    cwd: string;
    packages: PackageInfo[];
    resultCollector: ResultCollector;
    rebuildManager?: RebuildListrManager;
  }) {
    this.cwd = options.cwd;
    this.packages = options.packages;
    this.resultCollector = options.resultCollector;
    this.rebuildManager = options.rebuildManager;
    this.workerManager = new WorkerManager();
  }

  /**
   * Builder 초기화
   */
  async initialize(): Promise<void> {
    // 초기 빌드 Promise 생성
    for (const pkg of this.packages) {
      const key = this.getPackageKey(pkg);
      this.initialBuildPromises.set(
        key,
        new Promise<void>((resolve) => {
          this.buildResolvers.set(key, resolve);
        }),
      );
    }

    // Worker 생성
    this.createWorkers();

    // 이벤트 핸들러 등록
    this.registerEventHandlers();
  }

  /**
   * 일회성 빌드 (프로덕션)
   */
  async build(): Promise<void> {
    await Promise.all(this.packages.map((pkg) => this.buildPackage(pkg)));
  }

  /**
   * Watch 모드 시작
   */
  async startWatch(): Promise<void> {
    this.isWatchMode = true;

    // 모든 패키지의 watch 시작 (await 없이 - 백그라운드 실행)
    for (const pkg of this.packages) {
      this.startWatchPackage(pkg);
    }

    // 초기 빌드 완료까지 대기
    await Promise.all(this.initialBuildPromises.values());
  }

  /**
   * Builder 종료
   */
  async shutdown(): Promise<void> {
    await this.workerManager.terminateAll();
  }

  /**
   * 초기 빌드 Promise 맵 반환
   */
  getInitialBuildPromises(): Map<string, Promise<void>> {
    return this.initialBuildPromises;
  }

  /**
   * 패키지 키 생성 (결과 저장용)
   */
  protected getPackageKey(pkg: PackageInfo): string {
    return `${pkg.name}:${this.getBuilderType()}`;
  }

  /**
   * 빌드 완료 처리
   */
  protected completeBuild(pkg: PackageInfo): void {
    const key = this.getPackageKey(pkg);
    const resolver = this.buildResolvers.get(key);
    if (resolver != null) {
      resolver();
      this.buildResolvers.delete(key);
    }
  }

  /**
   * Builder 타입 (결과 키 생성용)
   */
  protected abstract getBuilderType(): string;

  /**
   * Worker 생성
   */
  protected abstract createWorkers(): void;

  /**
   * 이벤트 핸들러 등록
   */
  protected abstract registerEventHandlers(): void;

  /**
   * 단일 패키지 빌드 (프로덕션)
   */
  protected abstract buildPackage(pkg: PackageInfo): Promise<void>;

  /**
   * 단일 패키지 watch 시작
   */
  protected abstract startWatchPackage(pkg: PackageInfo): void;
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/builders/BaseBuilder.ts
git commit -m "$(cat <<'EOF'
feat(cli): add BaseBuilder abstract class with common builder logic

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: LibraryBuilder 구현

**Files:**

- Create: `packages/cli/src/builders/LibraryBuilder.ts`
- Reference: `packages/cli/src/commands/watch.ts` (기존 esbuild watch 로직)
- Reference: `packages/cli/src/utils/worker-events.ts` (registerWorkerEventHandlers)

**Step 1: LibraryBuilder 구현**

```typescript
// packages/cli/src/builders/LibraryBuilder.ts
import path from "path";
import type { WorkerProxy } from "@simplysm/core-node";
import type * as WatchWorkerModule from "../workers/watch.worker";
import type { BuildResult } from "../infra/ResultCollector";
import { registerWorkerEventHandlers, type BuildEventData, type ErrorEventData } from "../utils/worker-events";
import { BaseBuilder } from "./BaseBuilder";
import type { PackageInfo } from "./types";

/**
 * Library 패키지 빌드를 담당하는 Builder
 *
 * node/browser/neutral 타겟 패키지의 esbuild 빌드를 처리한다.
 * Watch 모드와 프로덕션 빌드를 모두 지원한다.
 */
export class LibraryBuilder extends BaseBuilder {
  private readonly _workerPath: string;

  constructor(options: ConstructorParameters<typeof BaseBuilder>[0]) {
    super(options);
    this._workerPath = path.resolve(import.meta.dirname, "../workers/watch.worker.ts");
  }

  protected getBuilderType(): string {
    return "build";
  }

  protected createWorkers(): void {
    for (const pkg of this.packages) {
      this.workerManager.create<typeof WatchWorkerModule>(`${pkg.name}:build`, this._workerPath);
    }
  }

  protected registerEventHandlers(): void {
    for (const pkg of this.packages) {
      const worker = this.workerManager.get<typeof WatchWorkerModule>(`${pkg.name}:build`)!;
      const resultKey = `${pkg.name}:build`;
      const listrTitle = `${pkg.name} (${pkg.config.target})`;

      // 초기 빌드 여부 추적
      let isInitialBuild = true;

      // 빌드 시작 (리빌드 시)
      worker.on("buildStart", () => {
        if (!isInitialBuild && this.rebuildManager != null) {
          // 리빌드 시 RebuildListrManager에 등록
          const resolver = this.rebuildManager.registerBuild(resultKey, listrTitle);
          this.buildResolvers.set(resultKey, resolver);
        }
      });

      // 빌드 완료
      worker.on("build", (data) => {
        const event = data as BuildEventData;
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "build",
          status: event.success ? "success" : "error",
          message: event.errors?.join("\n"),
        };
        this.resultCollector.add(result);

        if (isInitialBuild) {
          isInitialBuild = false;
        }
        this.completeBuild(pkg);
      });

      // 에러
      worker.on("error", (data) => {
        const event = data as ErrorEventData;
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "build",
          status: "error",
          message: event.message,
        };
        this.resultCollector.add(result);

        if (isInitialBuild) {
          isInitialBuild = false;
        }
        this.completeBuild(pkg);
      });
    }
  }

  protected async buildPackage(pkg: PackageInfo): Promise<void> {
    const worker = this.workerManager.get<typeof WatchWorkerModule>(`${pkg.name}:build`)!;

    // 빌드 완료 Promise 생성
    const buildPromise = new Promise<void>((resolve) => {
      const originalResolver = this.buildResolvers.get(`${pkg.name}:build`);
      this.buildResolvers.set(`${pkg.name}:build`, () => {
        originalResolver?.();
        resolve();
      });
    });

    // 빌드 시작 (await 없이 - 이벤트로 완료 감지)
    void worker.startWatch({
      name: pkg.name,
      config: pkg.config,
      cwd: this.cwd,
      pkgDir: pkg.dir,
    });

    await buildPromise;
  }

  protected startWatchPackage(pkg: PackageInfo): void {
    const worker = this.workerManager.get<typeof WatchWorkerModule>(`${pkg.name}:build`)!;

    worker
      .startWatch({
        name: pkg.name,
        config: pkg.config,
        cwd: this.cwd,
        pkgDir: pkg.dir,
      })
      .catch((err: unknown) => {
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "build",
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        };
        this.resultCollector.add(result);
        this.completeBuild(pkg);
      });
  }

  /**
   * Graceful shutdown (esbuild context dispose)
   */
  override async shutdown(): Promise<void> {
    const shutdownTimeout = 3000;

    // 각 Worker의 shutdown 메서드 호출 후 terminate
    await Promise.all(
      this.workerManager.ids.map(async (id) => {
        const worker = this.workerManager.get<typeof WatchWorkerModule>(id);
        if (worker != null) {
          try {
            await Promise.race([
              worker.shutdown(),
              new Promise<void>((resolve) => setTimeout(resolve, shutdownTimeout)),
            ]);
          } catch {
            // shutdown 실패해도 계속 진행
          }
        }
      }),
    );

    await super.shutdown();
  }
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/builders/LibraryBuilder.ts
git commit -m "$(cat <<'EOF'
feat(cli): add LibraryBuilder for node/browser/neutral package builds

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: DtsBuilder 구현

**Files:**

- Create: `packages/cli/src/builders/DtsBuilder.ts`
- Reference: `packages/cli/src/commands/watch.ts:121-131` (기존 DTS Worker 로직)

**Step 1: DtsBuilder 구현**

```typescript
// packages/cli/src/builders/DtsBuilder.ts
import path from "path";
import type { WorkerProxy } from "@simplysm/core-node";
import type * as DtsWorkerModule from "../workers/dts.worker";
import type { BuildResult } from "../infra/ResultCollector";
import type { TypecheckEnv } from "../utils/tsconfig";
import type { BuildEventData, ErrorEventData } from "../utils/worker-events";
import { BaseBuilder } from "./BaseBuilder";
import type { PackageInfo } from "./types";

/**
 * .d.ts 파일 생성을 담당하는 Builder
 *
 * Library 패키지의 TypeScript 선언 파일 생성을 처리한다.
 * Watch 모드와 프로덕션 빌드를 모두 지원한다.
 */
export class DtsBuilder extends BaseBuilder {
  private readonly _workerPath: string;

  constructor(options: ConstructorParameters<typeof BaseBuilder>[0]) {
    super(options);
    this._workerPath = path.resolve(import.meta.dirname, "../workers/dts.worker.ts");
  }

  protected getBuilderType(): string {
    return "dts";
  }

  /**
   * 패키지 타겟에서 TypecheckEnv 결정
   */
  private _getEnv(pkg: PackageInfo): TypecheckEnv {
    const target = pkg.config.target;
    if (target === "node") return "node";
    return "browser"; // browser, neutral, client 모두 browser 환경
  }

  protected createWorkers(): void {
    for (const pkg of this.packages) {
      this.workerManager.create<typeof DtsWorkerModule>(`${pkg.name}:dts`, this._workerPath);
    }
  }

  protected registerEventHandlers(): void {
    for (const pkg of this.packages) {
      const worker = this.workerManager.get<typeof DtsWorkerModule>(`${pkg.name}:dts`)!;
      const resultKey = `${pkg.name}:dts`;
      const listrTitle = `${pkg.name} (dts)`;

      let isInitialBuild = true;

      // 빌드 시작 (리빌드 시)
      worker.on("buildStart", () => {
        if (!isInitialBuild && this.rebuildManager != null) {
          const resolver = this.rebuildManager.registerBuild(resultKey, listrTitle);
          this.buildResolvers.set(resultKey, resolver);
        }
      });

      // 빌드 완료
      worker.on("build", (data) => {
        const event = data as BuildEventData;
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "dts",
          status: event.success ? "success" : "error",
          message: event.errors?.join("\n"),
        };
        this.resultCollector.add(result);

        if (isInitialBuild) {
          isInitialBuild = false;
        }
        this.completeBuild(pkg);
      });

      // 에러
      worker.on("error", (data) => {
        const event = data as ErrorEventData;
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "dts",
          status: "error",
          message: event.message,
        };
        this.resultCollector.add(result);

        if (isInitialBuild) {
          isInitialBuild = false;
        }
        this.completeBuild(pkg);
      });
    }
  }

  protected async buildPackage(pkg: PackageInfo): Promise<void> {
    const worker = this.workerManager.get<typeof DtsWorkerModule>(`${pkg.name}:dts`)!;

    const buildPromise = new Promise<void>((resolve) => {
      const originalResolver = this.buildResolvers.get(`${pkg.name}:dts`);
      this.buildResolvers.set(`${pkg.name}:dts`, () => {
        originalResolver?.();
        resolve();
      });
    });

    void worker.startDtsWatch({
      name: pkg.name,
      cwd: this.cwd,
      pkgDir: pkg.dir,
      env: this._getEnv(pkg),
    });

    await buildPromise;
  }

  protected startWatchPackage(pkg: PackageInfo): void {
    const worker = this.workerManager.get<typeof DtsWorkerModule>(`${pkg.name}:dts`)!;

    worker
      .startDtsWatch({
        name: pkg.name,
        cwd: this.cwd,
        pkgDir: pkg.dir,
        env: this._getEnv(pkg),
      })
      .catch((err: unknown) => {
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "dts",
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        };
        this.resultCollector.add(result);
        this.completeBuild(pkg);
      });
  }
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/builders/DtsBuilder.ts
git commit -m "$(cat <<'EOF'
feat(cli): add DtsBuilder for TypeScript declaration file generation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: builders 모듈 index.ts 생성

**Files:**

- Create: `packages/cli/src/builders/index.ts`

**Step 1: index.ts 생성**

```typescript
// packages/cli/src/builders/index.ts
export type { IBuilder, PackageInfo, BuilderOptions } from "./types";
export { BaseBuilder } from "./BaseBuilder";
export { LibraryBuilder } from "./LibraryBuilder";
export { DtsBuilder } from "./DtsBuilder";
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/builders/index.ts
git commit -m "$(cat <<'EOF'
feat(cli): add builders module index for centralized exports

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: WatchOrchestrator 구현 및 watch 명령어 마이그레이션

### Task 10: WatchOrchestrator 구현

**Files:**

- Create: `packages/cli/src/orchestrators/WatchOrchestrator.ts`
- Reference: `packages/cli/src/commands/watch.ts` (기존 watch 로직 전체)

**Step 1: WatchOrchestrator 구현**

```typescript
// packages/cli/src/orchestrators/WatchOrchestrator.ts
import path from "path";
import { Listr } from "listr2";
import { consola } from "consola";
import type { BuildTarget, SdConfig, SdPackageConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { filterPackagesByTargets } from "../utils/package-utils";
import { printErrors } from "../utils/output-utils";
import { RebuildListrManager } from "../utils/listr-manager";
import { ResultCollector } from "../infra/ResultCollector";
import { SignalHandler } from "../infra/SignalHandler";
import { LibraryBuilder } from "../builders/LibraryBuilder";
import { DtsBuilder } from "../builders/DtsBuilder";
import type { PackageInfo } from "../builders/types";

/**
 * Watch 명령 옵션
 */
export interface WatchOrchestratorOptions {
  targets: string[];
  options: string[];
}

/**
 * Watch 모드 실행을 조율하는 Orchestrator
 *
 * Library 패키지(node/browser/neutral)의 watch 모드 실행을 관리한다.
 * - LibraryBuilder: esbuild watch
 * - DtsBuilder: .d.ts 생성
 */
export class WatchOrchestrator {
  private readonly _cwd: string;
  private readonly _options: WatchOrchestratorOptions;
  private readonly _logger = consola.withTag("sd:cli:watch");

  private _resultCollector!: ResultCollector;
  private _signalHandler!: SignalHandler;
  private _rebuildManager!: RebuildListrManager;
  private _libraryBuilder!: LibraryBuilder;
  private _dtsBuilder!: DtsBuilder;
  private _packages: PackageInfo[] = [];

  constructor(options: WatchOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Orchestrator 초기화
   * - sd.config.ts 로드
   * - 패키지 분류
   * - Builder 생성 및 초기화
   */
  async initialize(): Promise<void> {
    this._logger.debug("watch 시작", { targets: this._options.targets });

    // sd.config.ts 로드
    let sdConfig: SdConfig;
    try {
      sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: true,
        opt: this._options.options,
      });
      this._logger.debug("sd.config.ts 로드 완료");
    } catch (err) {
      consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // targets 필터링
    const allPackages = filterPackagesByTargets(sdConfig.packages, this._options.targets);

    // library 패키지만 필터링 (node, browser, neutral)
    const isLibraryTarget = (target: string): target is BuildTarget =>
      target === "node" || target === "browser" || target === "neutral";

    const libraryConfigs: Record<string, SdPackageConfig> = {};
    for (const [name, config] of Object.entries(allPackages)) {
      if (isLibraryTarget(config.target)) {
        libraryConfigs[name] = config;
      }
    }

    if (Object.keys(libraryConfigs).length === 0) {
      process.stdout.write("⚠ watch할 library 패키지가 없습니다.\n");
      return;
    }

    // PackageInfo 배열 생성
    this._packages = Object.entries(libraryConfigs).map(([name, config]) => ({
      name,
      dir: path.join(this._cwd, "packages", name),
      config,
    }));

    // 인프라 초기화
    this._resultCollector = new ResultCollector();
    this._signalHandler = new SignalHandler();
    this._rebuildManager = new RebuildListrManager(this._logger);

    // 배치 완료 시 에러 출력
    this._rebuildManager.on("batchComplete", () => {
      printErrors(this._resultCollector.toMap());
    });

    // Builder 생성
    const builderOptions = {
      cwd: this._cwd,
      packages: this._packages,
      resultCollector: this._resultCollector,
      rebuildManager: this._rebuildManager,
    };

    this._libraryBuilder = new LibraryBuilder(builderOptions);
    this._dtsBuilder = new DtsBuilder(builderOptions);

    // Builder 초기화
    await Promise.all([this._libraryBuilder.initialize(), this._dtsBuilder.initialize()]);
  }

  /**
   * Watch 모드 시작
   * - 초기 빌드 Listr 실행
   * - 결과 출력
   */
  async start(): Promise<void> {
    if (this._packages.length === 0) {
      return;
    }

    // 초기 빌드 Listr 구성
    const buildPromises = this._libraryBuilder.getInitialBuildPromises();
    const dtsPromises = this._dtsBuilder.getInitialBuildPromises();

    const initialListr = new Listr(
      [
        // Library 빌드 태스크
        ...this._packages.map((pkg) => ({
          title: `${pkg.name} (${pkg.config.target})`,
          task: () => buildPromises.get(`${pkg.name}:build`) ?? Promise.resolve(),
        })),
        // DTS 태스크
        ...this._packages.map((pkg) => ({
          title: `${pkg.name} (dts)`,
          task: () => dtsPromises.get(`${pkg.name}:dts`) ?? Promise.resolve(),
        })),
      ],
      { concurrent: true },
    );

    // Watch 시작 (백그라운드 실행)
    void this._libraryBuilder.startWatch();
    void this._dtsBuilder.startWatch();

    // Listr 실행 (초기 빌드 완료까지 대기)
    await initialListr.run();

    // 초기 빌드 결과 출력
    printErrors(this._resultCollector.toMap());
  }

  /**
   * 종료 시그널 대기
   */
  async awaitTermination(): Promise<void> {
    if (this._packages.length === 0) {
      return;
    }
    await this._signalHandler.waitForTermination();
  }

  /**
   * Orchestrator 종료
   */
  async shutdown(): Promise<void> {
    if (this._packages.length === 0) {
      return;
    }

    process.stdout.write("⏳ 종료 중...\n");

    await Promise.all([this._libraryBuilder.shutdown(), this._dtsBuilder.shutdown()]);

    process.stdout.write("✔ 완료\n");
  }
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/orchestrators/WatchOrchestrator.ts
git commit -m "$(cat <<'EOF'
feat(cli): add WatchOrchestrator for watch mode coordination

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: watch 명령어를 얇은 레이어로 변경

**Files:**

- Modify: `packages/cli/src/commands/watch.ts`
- Backup: 기존 파일을 `watch.ts.bak`으로 백업 (선택)

**Step 1: watch.ts 수정**

```typescript
// packages/cli/src/commands/watch.ts
import { WatchOrchestrator, type WatchOrchestratorOptions } from "../orchestrators/WatchOrchestrator";

/**
 * Watch 명령 옵션 (하위 호환성)
 */
export interface WatchOptions {
  targets: string[];
  options: string[];
}

/**
 * Library 패키지를 watch 모드로 빌드한다.
 *
 * - `sd.config.ts`를 로드하여 패키지별 빌드 타겟 정보 확인 (필수)
 * - `node`/`browser`/`neutral` 타겟: esbuild watch 모드로 빌드 + .d.ts 생성
 * - 파일 변경 시 자동 리빌드
 * - SIGINT/SIGTERM 시그널로 종료
 *
 * @param options - watch 실행 옵션
 * @returns 종료 시그널 수신 시 resolve
 */
export async function runWatch(options: WatchOptions): Promise<void> {
  const orchestratorOptions: WatchOrchestratorOptions = {
    targets: options.targets,
    options: options.options,
  };

  const orchestrator = new WatchOrchestrator(orchestratorOptions);

  try {
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.awaitTermination();
  } finally {
    await orchestrator.shutdown();
  }
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 통합 테스트 (수동)**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/cli-refactoring && pnpm watch core-common`
Expected: watch 모드가 정상 동작 (빌드 완료, Ctrl+C로 종료)

**Step 4: 커밋**

```bash
git add packages/cli/src/commands/watch.ts
git commit -m "$(cat <<'EOF'
refactor(cli): migrate watch command to use WatchOrchestrator

BREAKING CHANGE: Internal implementation changed, public API unchanged

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: orchestrators 모듈 index.ts 생성

**Files:**

- Create: `packages/cli/src/orchestrators/index.ts`

**Step 1: index.ts 생성**

```typescript
// packages/cli/src/orchestrators/index.ts
export { WatchOrchestrator, type WatchOrchestratorOptions } from "./WatchOrchestrator";
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/cli/src/orchestrators/index.ts
git commit -m "$(cat <<'EOF'
feat(cli): add orchestrators module index for centralized exports

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: 정리 및 검증

### Task 13: 불필요한 코드 정리

**Files:**

- Review: `packages/cli/src/utils/worker-events.ts` (필요시 수정)
- Review: `packages/cli/src/utils/package-utils.ts` (필요시 수정)

**Step 1: 기존 유틸리티와 새 Builder 호환성 확인**

기존 `registerWorkerEventHandlers`는 `dev.ts`에서 여전히 사용되므로 유지.
Phase 4에서 `dev.ts` 마이그레이션 시 제거 검토.

**Step 2: 타입체크 및 린트**

Run: `pnpm typecheck packages/cli && pnpm lint packages/cli`
Expected: 에러 없음

**Step 3: 커밋 (변경 사항이 있는 경우만)**

```bash
# 변경 사항이 있는 경우에만
git add packages/cli/src/utils/
git commit -m "$(cat <<'EOF'
refactor(cli): cleanup unused utilities after Builder migration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: 최종 검증

**Step 1: 전체 타입체크**

Run: `pnpm typecheck packages/cli`
Expected: 에러 없음

**Step 2: 전체 린트**

Run: `pnpm lint packages/cli`
Expected: 에러 없음

**Step 3: watch 명령어 통합 테스트**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/cli-refactoring && pnpm watch core-common core-node`
Expected:

- 초기 빌드 완료 (esbuild + dts)
- 파일 변경 시 리빌드 동작
- Ctrl+C로 정상 종료

**Step 4: 기존 기능 회귀 테스트**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/cli-refactoring && pnpm dev solid-demo`
Expected: dev 명령어 정상 동작 (아직 마이그레이션 안 됨)

**Step 5: Phase 3 완료 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs(cli): complete Phase 3 - watch command migration to new architecture

- Infra layer: ResultCollector, SignalHandler, WorkerManager
- Builders layer: BaseBuilder, LibraryBuilder, DtsBuilder
- Orchestrators layer: WatchOrchestrator
- watch command migrated to thin layer

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## 향후 계획 (Phase 4~6)

### Phase 4: Dev/Build 마이그레이션

- `ClientBuilder` 구현 (Vite dev server)
- `ServerBuilder` 구현 (esbuild + runtime)
- `DevOrchestrator` 구현
- `BuildOrchestrator` 구현
- `dev.ts`, `build.ts` 마이그레이션

### Phase 5: Capacitor 분리

- `CapacitorProject` 추출
- `AndroidBuilder` 추출
- `DeviceRunner` 추출
- 기존 `capacitor.ts` 삭제

### Phase 6: 정리

- 불필요한 코드 제거
- 테스트 커버리지 보강
- 문서화

---

## 파일 구조 요약 (Phase 3 완료 후)

```
packages/cli/src/
├── sd-cli.ts                    # CLI 진입점 (유지)
├── sd-config.types.ts           # 설정 타입 (유지)
├── index.ts                     # API export (유지)
│
├── commands/                    # CLI 명령어
│   ├── watch.ts                 # → WatchOrchestrator 호출 (얇은 레이어)
│   ├── dev.ts                   # (Phase 4에서 마이그레이션)
│   ├── build.ts                 # (Phase 4에서 마이그레이션)
│   └── ...                      # 기타 (유지)
│
├── orchestrators/               # [NEW] 명령어 흐름 조율
│   ├── index.ts
│   └── WatchOrchestrator.ts
│
├── builders/                    # [NEW] 빌드 타겟별 Builder
│   ├── index.ts
│   ├── types.ts
│   ├── BaseBuilder.ts
│   ├── LibraryBuilder.ts
│   └── DtsBuilder.ts
│
├── infra/                       # [NEW] 인프라 계층
│   ├── index.ts
│   ├── ResultCollector.ts
│   ├── SignalHandler.ts
│   └── WorkerManager.ts
│
├── workers/                     # Worker (유지)
├── utils/                       # 유틸리티 (유지)
└── capacitor/                   # (Phase 5에서 분리)
```
