# @simplysm/core-node

심플리즘 프레임워크의 Node.js 전용 유틸리티 패키지이다.

## 설치

```bash
npm install @simplysm/core-node
# or
pnpm add @simplysm/core-node
```

## 주요 기능

### PathUtils

경로 처리 유틸리티를 제공한다.

```typescript
import { PathUtils } from "@simplysm/core-node";

// POSIX 스타일 경로로 변환
PathUtils.posix("C:\\Users\\test"); // "C:/Users/test"

// 경로 정규화 (절대 경로로 변환)
const normPath = PathUtils.norm("src", "index.ts"); // NormPath 타입 반환

// 자식 경로 여부 확인
PathUtils.isChildPath("/a/b/c", "/a/b"); // true

// 파일 디렉토리 변경
PathUtils.changeFileDirectory("/a/b/c.txt", "/a", "/x"); // "/x/b/c.txt"

// 확장자 제거
PathUtils.removeExt("file.spec.ts"); // "file.spec"
```

### FsUtils

파일 시스템 유틸리티를 제공한다.

```typescript
import { FsUtils } from "@simplysm/core-node";

// 파일 읽기/쓰기
const content = FsUtils.read("/path/to/file.txt");
FsUtils.write("/path/to/output.txt", "content"); // 부모 디렉토리 자동 생성

// JSON 파일 읽기/쓰기 (JsonConvert 사용)
const config = FsUtils.readJson<Config>("/path/to/config.json");
FsUtils.writeJson("/path/to/output.json", data);

// Glob 패턴으로 파일 검색
const files = FsUtils.glob("**/*.ts");
const filesAsync = await FsUtils.globAsync("**/*.ts");

// 디렉토리 생성/삭제
FsUtils.mkdir("/path/to/dir"); // recursive
await FsUtils.rmAsync("/path/to/target");

// 파일/디렉토리 복사
await FsUtils.copyAsync("/src", "/dest", (path) => !path.includes("node_modules"));
```

> constructor 등 async를 사용할 수 없는 경우를 제외하고 async 함수를 사용한다.
> 동기 함수는 이벤트 루프를 차단하여 성능 저하를 유발한다.

### SdFsWatcher

파일 시스템 변경 감지 유틸리티를 제공한다.

```typescript
import { SdFsWatcher } from "@simplysm/core-node";

// 파일 감시 시작
const watcher = await SdFsWatcher.watchAsync(["src/**/*.ts"]);

// 변경 이벤트 핸들러 등록 (이벤트 병합 지원)
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`); // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
  }
});

// 감시 종료
await watcher.close();
```

### SdWorker

타입 안전한 Worker 스레드 래퍼를 제공한다.

```typescript
// worker.ts
import { createSdWorker } from "@simplysm/core-node";

interface MyEvents {
  progress: number;
}

const methods = {
  calculate: (a: number, b: number) => {
    sender.send("progress", 50);
    return a + b;
  },
};

const sender = createSdWorker<typeof methods, MyEvents>(methods);
export default sender;

// main.ts
import { SdWorker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";

const worker = SdWorker.create<typeof MyWorker>("./worker.ts");

worker.on("progress", (percent) => {
  console.log(`Progress: ${percent}%`);
});

const result = await worker.calculate(10, 20); // 30
await worker.terminate();
```

## 라이선스

Apache-2.0
