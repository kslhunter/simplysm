# @simplysm/core-node

SIMPLYSM 프레임워크의 Node.js 전용 유틸리티 패키지입니다.

## 설치

```bash
yarn add @simplysm/core-node
```

## 주요 기능

### 경로 유틸리티 (PathUtils)

```typescript
import { PathUtils, NormPath } from "@simplysm/core-node";

// POSIX 스타일 경로
PathUtils.posix("C:\\Users\\test"); // "C:/Users/test"

// 정규화된 경로
const normalized: NormPath = PathUtils.norm("/some/path");

// 자식 경로 확인
PathUtils.isChildPath("/a/b/c", "/a/b"); // true

// 확장자 제거
PathUtils.removeExt("file.txt"); // "file"
```

### 파일 시스템 유틸리티 (FsUtils)

```typescript
import { FsUtils } from "@simplysm/core-node";

// 파일 존재 확인
if (FsUtils.exists("./config.json")) {
  const config = FsUtils.readJson("./config.json");
}

// 비동기 파일 작업
await FsUtils.mkdirAsync("./output");
await FsUtils.writeAsync("./output/data.txt", "Hello");
await FsUtils.copyAsync("./src", "./dist");

// 글로브 패턴 매칭
const files = await FsUtils.globAsync("src/**/*.ts");

// JSON 읽기/쓰기 (커스텀 타입 지원)
await FsUtils.writeJsonAsync("./data.json", { date: new DateTime() });
const data = await FsUtils.readJsonAsync("./data.json");
```

### 파일 감시 (SdFsWatcher)

```typescript
import { SdFsWatcher } from "@simplysm/core-node";

const watcher = await SdFsWatcher.watchAsync(["src/**/*.ts"]);

watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
    // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
  }
});

// 종료
await watcher.close();
```

### 타입 안전 Worker (SdWorker)

```typescript
// worker-types.ts
export interface MyWorkerType {
  methods: {
    calculate: { params: [number, number]; returnType: number };
  };
  events: {
    progress: number;
  };
}

// main.ts
import { SdWorker } from "@simplysm/core-node";
import type { MyWorkerType } from "./worker-types";

const worker = new SdWorker<MyWorkerType>("./my-worker.ts");

worker.on("progress", (percent) => {
  console.log(`Progress: ${percent}%`);
});

const result = await worker.run("calculate", [10, 20]);
await worker.killAsync();

// my-worker.ts
import { createSdWorker } from "@simplysm/core-node";
import type { MyWorkerType } from "./worker-types";

const sender = createSdWorker<MyWorkerType>({
  calculate: async (a, b) => {
    sender.send("progress", 50);
    return a + b;
  }
});
```

## 외부 도구 권장

### 로깅 (pino + ora)

```typescript
import pino from "pino";
import ora from "ora";

// 파일 로깅 + 콘솔 에러만
const logger = pino({
  level: "debug",
  transport: {
    targets: [
      { target: "pino-pretty", level: "error", options: { colorize: true } },
      { target: "pino-roll", level: "debug", options: { file: "./logs/app" } }
    ]
  }
});

// 스피너 (빌드 진행 표시 등)
const spinner = ora("Building...").start();
spinner.succeed("Build complete");
```

### 프로세스 실행 (execa)

```typescript
import { execa } from "execa";
import pino from "pino";

const logger = pino({ name: "my-app" });
const { stdout } = await execa("npm", ["install"]);
logger.info(stdout);
```

## API 참조

자세한 API 문서는 [CLAUDE.md](CLAUDE.md)를 참고하세요.

## 라이선스

MIT
