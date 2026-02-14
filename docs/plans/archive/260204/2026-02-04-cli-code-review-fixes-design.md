# packages/cli 코드 리뷰 이슈 수정 설계

## 개요

code-reviewer 에이전트가 발견한 7가지 이슈를 수정하는 설계 문서입니다.

## 수정 사항

### 1. publish.ts 중복 spawnAsync 제거

**파일:** `packages/cli/src/commands/publish.ts`

- `spawnAsync` 함수 제거 (58-93행)
- 모든 호출을 `utils/spawn.ts`의 `spawn`으로 교체 (15곳)
- `shell: true` 보안 취약점 해결

### 2. SdConfigFn 타입 정의 수정

**파일:** `packages/cli/src/sd-config.types.ts`

```typescript
export interface SdConfigParams {
  cwd: string;
  dev: boolean;
  opt: string[];
}

export type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

- 파라미터 타입을 인터페이스로 분리
- `Promise<SdConfig>` 반환 허용
- JSDoc 예제 업데이트

### 3. index.ts export 추가

**파일:** `packages/cli/src/index.ts`

```typescript
export { runBuild, type BuildOptions } from "./commands/build";
export { runPublish, type PublishOptions } from "./commands/publish";
export { runDevice, type DeviceOptions } from "./commands/device";
```

### 4. Worker 종료 시 리소스 정리 개선

**파일:**

- `packages/cli/src/commands/watch.ts`
- `packages/cli/src/workers/watch.worker.ts`

메인 스레드에서 워커에게 `shutdown` 메시지를 보내는 프로토콜:

```typescript
// watch.ts (메인)
for (const worker of workers) {
  worker.postMessage({ type: "shutdown" });
}
// 타임아웃(3초) 후 terminate

// watch.worker.ts (워커)
parentPort.on("message", async (msg) => {
  if (msg.type === "shutdown") {
    await cleanup();
    parentPort.postMessage({ type: "shutdown-complete" });
  }
});
```

### 5. device.ts server 타입 가드 추가

**파일:** `packages/cli/src/commands/device.ts`

```typescript
let serverUrl = url;
if (serverUrl == null) {
  if (typeof clientConfig.server === "number") {
    serverUrl = `http://localhost:${clientConfig.server}/${packageName}/capacitor/`;
  } else {
    consola.error(`--url 옵션이 필요합니다. server가 패키지명으로 설정되어 있습니다: ${clientConfig.server}`);
    process.exitCode = 1;
    return;
  }
}
```

### 6. 에러 출력을 consola로 통일

**대상 파일 (18곳):**

- `build.ts` (2곳)
- `dev.ts` (1곳)
- `device.ts` (5곳)
- `publish.ts` (7곳)
- `typecheck.ts` (1곳)
- `watch.ts` (1곳)

```typescript
// 기존
process.stderr.write(`✖ 메시지\n`);

// 변경
consola.error(`메시지`);
```

### 7. --options 플래그 문서화

**파일:** `packages/cli/src/sd-cli.ts`

모든 명령어의 options 설명 통일:

```typescript
description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
```

## 수정 파일 목록

1. `packages/cli/src/commands/publish.ts`
2. `packages/cli/src/sd-config.types.ts`
3. `packages/cli/src/index.ts`
4. `packages/cli/src/commands/watch.ts`
5. `packages/cli/src/workers/watch.worker.ts`
6. `packages/cli/src/commands/device.ts`
7. `packages/cli/src/commands/build.ts`
8. `packages/cli/src/commands/dev.ts`
9. `packages/cli/src/commands/typecheck.ts`
10. `packages/cli/src/sd-cli.ts`
