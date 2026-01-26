# @simplysm/core-node

심플리즘 프레임워크의 Node.js 전용 유틸리티 패키지이다.

## 요구 사항

- Node.js 20.11+ (`import.meta.filename`/`import.meta.dirname` 지원 필요)

## 설치

```bash
npm install @simplysm/core-node
# or
pnpm add @simplysm/core-node
```

## 주요 기능

### 경로 유틸리티

경로 처리 함수들을 제공한다.

```typescript
import {
  pathPosix,
  pathNorm,
  pathIsChildPath,
  pathChangeFileDirectory,
  pathGetBasenameWithoutExt,
  pathFilterByTargets,
} from "@simplysm/core-node";

// POSIX 스타일 경로로 변환
pathPosix("C:\\Users\\test"); // "C:/Users/test"

// 경로 정규화 (절대 경로로 변환)
const normPath = pathNorm("src", "index.ts"); // NormPath 타입 반환

// 자식 경로 여부 확인
pathIsChildPath("/a/b/c", "/a/b"); // true

// 파일 디렉토리 변경
pathChangeFileDirectory("/a/b/c.txt", "/a", "/x"); // "/x/b/c.txt"

// 확장자 제거한 파일명 반환
pathGetBasenameWithoutExt("file.spec.ts"); // "file.spec"

// 타겟 경로로 파일 필터링
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
pathFilterByTargets(files, ["src"], "/proj"); // ["/proj/src/a.ts", "/proj/src/b.ts"]
```

### 파일 시스템 유틸리티

파일 시스템 처리 함수들을 제공한다.

```typescript
import {
  fsRead,
  fsReadAsync,
  fsReadBuffer,
  fsWrite,
  fsWriteAsync,
  fsReadJson,
  fsWriteJson,
  fsStat,
  fsLstat,
  fsReaddir,
  fsGlob,
  fsGlobAsync,
  fsMkdir,
  fsRmAsync,
  fsCopyAsync,
  fsClearEmptyDirectoryAsync,
  fsFindAllParentChildPaths,
} from "@simplysm/core-node";

// 파일 읽기/쓰기
const content = fsRead("/path/to/file.txt");
const buffer = fsReadBuffer("/path/to/file.bin"); // Buffer로 읽기
fsWrite("/path/to/output.txt", "content"); // 부모 디렉토리 자동 생성

// JSON 파일 읽기/쓰기 (JsonConvert 사용)
const config = fsReadJson<Config>("/path/to/config.json");
fsWriteJson("/path/to/output.json", data);

// 파일 정보 조회
const stat = fsStat("/path/to/file.txt"); // 심볼릭 링크 따라감
const lstat = fsLstat("/path/to/link"); // 심볼릭 링크 자체 정보

// 디렉토리 읽기
const entries = fsReaddir("/path/to/dir");

// Glob 패턴으로 파일 검색
const files = fsGlob("**/*.ts");
const filesAsync = await fsGlobAsync("**/*.ts");

// 디렉토리 생성/삭제
fsMkdir("/path/to/dir"); // recursive
await fsRmAsync("/path/to/target");
await fsClearEmptyDirectoryAsync("/path/to/dir"); // 빈 디렉토리 재귀 삭제

// 파일/디렉토리 복사
await fsCopyAsync("/src", "/dest", (path) => !path.includes("node_modules"));

// 상위 디렉토리 순회하며 glob 검색
const configs = fsFindAllParentChildPaths("package.json", "/proj/src/sub", "/proj");
```

> constructor 등 async를 사용할 수 없는 경우를 제외하고 async 함수를 사용한다.
> 동기 함수는 이벤트 루프를 차단하여 성능 저하를 유발한다.

### FsWatcher

파일 시스템 변경 감지 유틸리티를 제공한다.

```typescript
import { FsWatcher } from "@simplysm/core-node";

// 파일 감시 시작
const watcher = await FsWatcher.watchAsync(["src/**/*.ts"]);

// 변경 이벤트 핸들러 등록 (이벤트 병합 지원)
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`); // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
  }
});

// 감시 종료
await watcher.close();
```

### Worker

타입 안전한 Worker 스레드 래퍼를 제공한다.

```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

interface MyEvents {
  progress: number;
}

// sender는 아래에서 정의되지만, 클로저로 인해 함수 실행 시점에 참조됨
const methods = {
  calculate: (a: number, b: number) => {
    sender.send("progress", 50);
    return a + b;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;

// main.ts
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";

const worker = Worker.create<typeof MyWorker>(
  path.resolve(import.meta.dirname, "./worker.ts")
);

worker.on("progress", (percent) => {
  console.log(`Progress: ${percent}%`);
});

const result = await worker.calculate(10, 20); // 30
await worker.terminate();
```

## 라이선스

Apache-2.0
