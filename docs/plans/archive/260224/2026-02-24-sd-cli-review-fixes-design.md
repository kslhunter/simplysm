# sd-cli Review Fixes Design

## Overview

sd-cli 코드 리뷰에서 발견된 20건의 이슈를 3단계 배치로 수정하는 설계.

## Batch 1 — 기반 패키지 (`core-common`, `core-node`)

### C4: `errorMessage()` 유틸리티 — `core-common`

`packages/core-common/src/utils/`에 추가:

```typescript
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
```

sd-cli 전반의 30+ `err instanceof Error ? err.message : String(err)` 패턴을 이 함수로 교체.

### D4: `WorkerProxy` typed event map — `core-node`

```typescript
// 변경 전
class WorkerProxy<TModule> {
  on(event: string, handler: (data: unknown) => void): void;
}

// 변경 후
class WorkerProxy<TModule, TEvents extends Record<string, unknown> = Record<string, unknown>> {
  on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): void;
}
```

`Worker.create<TModule, TEvents>()`에도 `TEvents` 제네릭 추가.

## Batch 2 — sd-cli 내부 인프라 정리

### C6: Base worker event 타입 (`worker-events.ts`)

```typescript
export interface BaseBuildEvent {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface BaseErrorEvent {
  message: string;
}

export interface BaseWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: BaseBuildEvent;
  error: BaseErrorEvent;
}
```

각 워커의 이벤트 타입이 이를 extends.

### C7: `createOnceGuard` (`worker-utils.ts`)

```typescript
export function createOnceGuard(label: string): () => void {
  let called = false;
  return () => {
    if (called) throw new Error(`${label}는 Worker당 한 번만 호출할 수 있습니다.`);
    called = true;
  };
}
```

### C2: esbuild context 공통화 (`worker-utils.ts`)

`createEsbuildWatchContext()` 함수 추출. library.worker와 server.worker의 `createAndBuildContext` 공통 부분을 통합. esbuild 옵션 생성은 콜백으로 전달.

### C3: 에러 포맷팅 (`output-utils.ts`)

```typescript
export function formatBuildMessages(
  name: string, label: string, messages: string[], level: "warn" | "error"
): string {
  const lines = [`${name} (${label})`];
  for (const msg of messages) {
    for (const line of msg.split("\n")) {
      lines.push(`  → ${line}`);
    }
  }
  return lines.join("\n");
}
```

### C5: replaceDeps 공통 resolve (`replace-deps.ts`)

```typescript
async function resolveAllEntries(
  projectRoot: string, config: Record<string, string>
): Promise<Array<{ targetDir: string; sourceDir: string }>>
```

`setupReplaceDeps`와 `watchReplaceDeps`가 이 함수를 호출.

### N2: 이벤트 핸들러 통합

`BaseBuilder.registerEventHandlersForWorker` 제거. `worker-events.ts`의 `registerWorkerEventHandlers`를 `BaseBuilder`에서도 사용.

### Q4: `BuildResult` → `BuildStepResult` rename

`BuildOrchestrator.ts`의 로컬 `interface BuildResult`를 `interface BuildStepResult`로 rename.

### Q5: `PackageResult` → `BuildResult` 통합

`package-utils.ts`의 `PackageResult` 제거. `ResultCollector.ts`의 `BuildResult`로 통합 (status superset). `output-utils.ts`의 `ErrorResult` 유니온 타입 제거.

### C8: ResultCollector 미사용 메서드 제거

`getErrors()`, `getServers()`, `getByType()`, `getAll()`, `clear()` 제거. `add()`, `get()`, `toMap()` 유지.

### D5: Command-level 옵션 타입 제거

`BuildOptions`, `WatchOptions`, `DevOptions` 제거. Orchestrator 옵션 타입 직접 사용.

## Batch 3 — 사용자 대면 변경 + 보안

### S1: Path Traversal 방어 (`vite-config.ts`)

```typescript
const decodedPath = decodeURIComponent(urlPath);
const filePath = path.resolve(publicDevDir, decodedPath);
if (!filePath.startsWith(path.resolve(publicDevDir) + path.sep)) {
  next();
  return;
}
```

### S2: execa 전환 (`spawn.ts`) + Q1 Buffer 해결

`child_process.spawn` → `execa` 교체. `shell: true` 제거. Buffer 이슈 자연 해결.

```typescript
import { execa } from "execa";

export async function spawn(cmd: string, args: string[], options?: SpawnOptions): Promise<string> {
  const result = await execa(cmd, args, {
    cwd: options?.cwd,
    env: { ...process.env, ...colorEnv, ...options?.env },
    reject: false,
    all: true,
  });
  if (result.exitCode !== 0) {
    throw new Error(`명령어 실패 (${cmd} ${args.join(" ")})\n종료 코드: ${result.exitCode}\n출력:\n${result.all}`);
  }
  return result.all ?? "";
}
```

### Q1: publish.ts Buffer eslint-disable

```typescript
// eslint-disable-next-line @typescript-eslint/no-restricted-types -- ssh2 ConnectConfig requires Buffer
auth: { privateKey?: Buffer; agent?: string },
```

### Q2: actualPort 검증 (`client.worker.ts`)

```typescript
const actualPort = typeof address === "object" && address != null ? address.port : undefined;
if (actualPort == null) {
  sender.send("error", { message: "Vite dev server port를 확인할 수 없습니다." });
  return;
}
```

### Q3: PM2 dead code 수정 (`server.worker.ts`)

`require("child_process")` 줄을 `packageManager !== "volta"` 조건부로 포함.

### D1: `configOpt` → `opt` (`sd-cli-entry.ts`)

Breaking change 허용됨. 7개 핸들러에서 rename 보일러플레이트 제거.

### D2: dts.worker 메서드명 통일

`startDtsWatch` → `startWatch`, `buildDts` → `build`.

### D3: `loadSdConfig` 타입 정렬

파라미터를 `SdConfigParams`로 교체.

### C1: `DevOrchestrator.start()` 분리

3개 private 메서드로 분리:
- `_setupStandaloneClients()` — standalone client 이벤트 등록
- `_setupViteClients()` — vite client 이벤트 등록
- `_setupServers()` — server build + runtime 이벤트 등록

## Skipped Issues

- **N1** (Orchestrator 아키텍처 불일치): one-shot vs long-running 라이프사이클 차이로 인한 의도적 설계
