# @simplysm/core-node

Node.js 환경 전용 유틸리티. 파일시스템, 경로, 파일 감시, Worker 스레드를 제공한다.

## 설치

```bash
npm install @simplysm/core-node
```

**의존성:** `@simplysm/core-common`, `chokidar`, `consola`, `glob`, `minimatch`, `tsx`

## 모듈 구조

```
@simplysm/core-node
├── fsx           # 파일시스템 유틸리티 (namespace)
├── pathx         # 경로 유틸리티 (namespace)
├── FsWatcher     # 파일 감시 (class)
├── Worker        # 타입 안전한 Worker 스레드 (object)
├── createWorker  # Worker 팩토리 (function)
└── types         # NormPath, WorkerModule, WorkerProxy, ...
```

---

## 주요 사용법

### fsx -- 파일시스템 유틸리티

모든 함수는 async/sync 쌍으로 제공된다 (예: `read` / `readSync`).

```typescript
import { fsx } from "@simplysm/core-node";

// 존재 확인
await fsx.exists("/path/to/file");
fsx.existsSync("/path/to/file");

// 디렉토리 생성 (재귀)
await fsx.mkdir("/path/to/dir");
fsx.mkdirSync("/path/to/dir");

// 삭제
// async: 6회 재시도, 500ms 간격 (파일 잠금 등 일시적 오류 대응)
// sync: 재시도 없이 즉시 실패
await fsx.rm("/path/to/target");
fsx.rmSync("/path/to/target");

// 복사 (필터 지원)
// 필터는 자식 경로에만 적용, 최상위 sourcePath는 필터링 대상이 아님
// 디렉토리에 false를 반환하면 해당 디렉토리와 모든 하위 내용을 건너뜀
// sourcePath가 존재하지 않으면 아무 동작 없이 반환
await fsx.copy(src, dst, (absPath) => !absPath.includes("node_modules"));
fsx.copySync(src, dst);

// 읽기
const text = await fsx.read("/path/to/file.txt");           // UTF-8 문자열
const buf = await fsx.readBuffer("/path/to/file.bin");      // Buffer
const config = await fsx.readJson<Config>("/path/config.json"); // JSON 파싱 (core-common의 json.parse 사용)

// 쓰기 (부모 디렉토리 자동 생성)
await fsx.write("/path/to/file.txt", content);              // string | Uint8Array
await fsx.writeJson("/path/to/config.json", data, { space: 2 });
// writeJson의 options: { replacer?, space? }

// 디렉토리 읽기
const entries = await fsx.readdir("/path/to/dir");          // string[]

// 파일 정보
const stats = await fsx.stat("/path/to/file");              // 심볼릭 링크 따라감
const lstats = await fsx.lstat("/path/to/symlink");         // 심볼릭 링크 자체 정보

// Glob 패턴 검색 (절대 경로 반환)
const files = await fsx.glob("**/*.ts", { cwd: "/project" });
const filesSync = fsx.globSync("**/*.ts", { cwd: "/project" });

// 빈 디렉토리 정리 (재귀적으로 빈 디렉토리 삭제)
await fsx.clearEmptyDirectory("/path/to/dir");

// 상위 디렉토리 탐색
// fromPath에서 루트까지 각 디렉토리에서 childGlob 패턴에 매칭되는 파일 검색
const paths = await fsx.findAllParentChildPaths("package.json", "/project/src/deep");
const pathsSync = fsx.findAllParentChildPathsSync("package.json", "/project/src/deep", "/project"); // rootPath 지정 가능
```

### pathx -- 경로 유틸리티

```typescript
import { pathx } from "@simplysm/core-node";
import type { NormPath } from "@simplysm/core-node";

// POSIX 변환 (여러 인자를 path.join 후 변환)
pathx.posix("C:\\Users\\test");              // "C:/Users/test"
pathx.posix("src", "index.ts");              // "src/index.ts"

// 정규화 (절대 경로, 브랜드 타입 NormPath 반환)
const norm: NormPath = pathx.norm("relative/path");
const norm2: NormPath = pathx.norm("base", "relative"); // 여러 경로 조합 가능

// 디렉토리 변경
pathx.changeFileDirectory("/a/b/c.txt", "/a", "/x"); // "/x/b/c.txt"
// filePath가 fromDirectory 하위가 아니면 ArgumentError 발생

// 확장자 없는 파일명
pathx.basenameWithoutExt("/path/file.spec.ts");       // "file.spec"

// 자식 경로 확인
pathx.isChildPath("/a/b/c", "/a/b");                  // true
pathx.isChildPath("/a/b", "/a/b");                    // false (동일 경로)

// 대상 경로 필터링
pathx.filterByTargets(
  ["/proj/src/a.ts", "/proj/tests/c.ts"],
  ["src"],
  "/proj"
);
// ["/proj/src/a.ts"]
// targets가 빈 배열이면 files를 그대로 반환
```

### FsWatcher -- 파일 감시

Chokidar 기반, 이벤트 디바운싱 및 glob 패턴 지원.

```typescript
import { FsWatcher } from "@simplysm/core-node";
import type { FsWatcherEvent, FsWatcherChangeInfo } from "@simplysm/core-node";

// 감시 시작 (ready 이벤트까지 대기)
// 경로 또는 glob 패턴 모두 사용 가능
const watcher = await FsWatcher.watch([
  "/project/src",         // 디렉토리 경로
  "/project/lib/**/*.js", // glob 패턴
]);

// chokidar 옵션 전달 가능 (ignoreInitial은 내부적으로 항상 true로 설정됨)
const watcher2 = await FsWatcher.watch(["/project/src"], {
  depth: 2,
  ignored: /node_modules/,
});

// 변경 이벤트 핸들러 등록
// delay ms 동안 이벤트를 모아 한 번에 콜백 호출
watcher.onChange({ delay: 300 }, (changes: FsWatcherChangeInfo[]) => {
  for (const { event, path } of changes) {
    // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
    // path: NormPath (정규화된 절대 경로)
  }
});

// 종료
await watcher.close();
```

**이벤트 병합 전략** (같은 파일에 대해 짧은 시간 내 여러 이벤트 발생 시):
- `add` + `change` -> `add` (생성 직후 수정은 생성으로 처리)
- `add` + `unlink` -> 제거 (생성 후 즉시 삭제는 무변경)
- `unlink` + `add` -> `add` (삭제 후 재생성은 생성으로 처리)
- `unlink` + `change` -> `add` (삭제 후 변경은 생성으로 처리)
- `unlinkDir` + `addDir` -> `addDir`
- 그 외 -> 마지막 이벤트로 덮어쓰기

### Worker -- 타입 안전한 Worker 스레드

#### Worker 파일 작성 (worker.ts)

```typescript
import { createWorker } from "@simplysm/core-node";

// 이벤트 없는 Worker
export default createWorker({
  add: (a: number, b: number) => a + b,
});

// 이벤트가 있는 Worker
interface MyEvents {
  progress: number;
}

const methods = {
  processFile: async (path: string) => {
    sender.send("progress", 50);
    // ... 처리 ...
    sender.send("progress", 100);
    return "done";
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;
```

#### 메인 스레드에서 사용

```typescript
import { Worker } from "@simplysm/core-node";

// Worker 생성 (타입 추론을 위해 typeof import 사용)
const worker = Worker.create<typeof import("./worker")>("./worker.ts");

// 옵션 전달 (WorkerOptions에서 stdout/stderr 제외)
const worker2 = Worker.create<typeof import("./worker")>("./worker.ts", {
  env: { NODE_ENV: "production" },
  argv: ["--verbose"],
});

// 메서드 호출 (자동 Promise 래핑)
const result = await worker.add(10, 20); // 30

// 이벤트 수신
const handler = (value: number) => { /* ... */ };
worker.on("progress", handler);
worker.off("progress", handler); // 이벤트 해제

// 종료
await worker.terminate();
```

**특징:**
- `.ts` 파일은 tsx를 통해 자동 실행 (개발 환경), `.js` 파일은 직접 Worker 생성 (프로덕션)
- UUID 기반 요청 추적으로 동시 요청 지원
- Worker 크래시 시 대기 중인 모든 요청 자동 reject
- Worker 내 `process.stdout.write`는 메인 스레드로 자동 전달
- `@simplysm/core-common`의 `transfer`를 사용하여 메시지 직렬화
- `file://` URL 경로와 절대 경로 모두 지원

---

## API 레퍼런스

### fsx (namespace)

| 함수 | 시그니처 | 설명 |
|------|----------|------|
| `exists` | `(targetPath: string) => Promise<boolean>` | 파일/디렉토리 존재 확인 |
| `existsSync` | `(targetPath: string) => boolean` | 동기 버전 |
| `mkdir` | `(targetPath: string) => Promise<void>` | 디렉토리 재귀 생성 |
| `mkdirSync` | `(targetPath: string) => void` | 동기 버전 |
| `rm` | `(targetPath: string) => Promise<void>` | 삭제 (6회 재시도, 500ms 간격) |
| `rmSync` | `(targetPath: string) => void` | 동기 버전 (재시도 없음) |
| `copy` | `(src, dst, filter?) => Promise<void>` | 파일/디렉토리 복사 (async 시 병렬 처리) |
| `copySync` | `(src, dst, filter?) => void` | 동기 버전 |
| `read` | `(targetPath: string) => Promise<string>` | UTF-8 텍스트 읽기 |
| `readSync` | `(targetPath: string) => string` | 동기 버전 |
| `readBuffer` | `(targetPath: string) => Promise<Buffer>` | 바이너리 읽기 |
| `readBufferSync` | `(targetPath: string) => Buffer` | 동기 버전 |
| `readJson` | `<T>(targetPath: string) => Promise<T>` | JSON 파일 읽기 |
| `readJsonSync` | `<T>(targetPath: string) => T` | 동기 버전 |
| `write` | `(targetPath, data: string \| Uint8Array) => Promise<void>` | 파일 쓰기 (부모 디렉토리 자동 생성) |
| `writeSync` | `(targetPath, data: string \| Uint8Array) => void` | 동기 버전 |
| `writeJson` | `(targetPath, data, options?) => Promise<void>` | JSON 파일 쓰기 |
| `writeJsonSync` | `(targetPath, data, options?) => void` | 동기 버전 |
| `readdir` | `(targetPath: string) => Promise<string[]>` | 디렉토리 내용 읽기 |
| `readdirSync` | `(targetPath: string) => string[]` | 동기 버전 |
| `stat` | `(targetPath: string) => Promise<fs.Stats>` | 파일 정보 (심링크 따라감) |
| `statSync` | `(targetPath: string) => fs.Stats` | 동기 버전 |
| `lstat` | `(targetPath: string) => Promise<fs.Stats>` | 파일 정보 (심링크 자체) |
| `lstatSync` | `(targetPath: string) => fs.Stats` | 동기 버전 |
| `glob` | `(pattern, options?: GlobOptions) => Promise<string[]>` | Glob 패턴 검색 (절대 경로 반환) |
| `globSync` | `(pattern, options?: GlobOptions) => string[]` | 동기 버전 |
| `clearEmptyDirectory` | `(dirPath: string) => Promise<void>` | 빈 디렉토리 재귀 삭제 |
| `findAllParentChildPaths` | `(childGlob, fromPath, rootPath?) => Promise<string[]>` | 상위 디렉토리 탐색 |
| `findAllParentChildPathsSync` | `(childGlob, fromPath, rootPath?) => string[]` | 동기 버전 |

### pathx (namespace)

| 함수 | 시그니처 | 설명 |
|------|----------|------|
| `posix` | `(...args: string[]) => string` | POSIX 경로 변환 (path.join 후 `\` -> `/`) |
| `norm` | `(...paths: string[]) => NormPath` | 절대 경로 정규화 (브랜드 타입) |
| `changeFileDirectory` | `(filePath, fromDir, toDir) => string` | 파일의 기준 디렉토리 변경 |
| `basenameWithoutExt` | `(filePath: string) => string` | 확장자 제외한 파일명 |
| `isChildPath` | `(childPath, parentPath) => boolean` | 자식 경로 여부 확인 |
| `filterByTargets` | `(files, targets, cwd) => string[]` | 대상 경로 기준 파일 필터링 |

### FsWatcher (class)

| 멤버 | 시그니처 | 설명 |
|------|----------|------|
| `static watch` | `(paths: string[], options?: ChokidarOptions) => Promise<FsWatcher>` | 감시 시작 (ready까지 대기) |
| `onChange` | `(opt: { delay?: number }, cb) => this` | 변경 이벤트 핸들러 등록 (체이닝 가능) |
| `close` | `() => Promise<void>` | 감시 종료 |

### Worker (object)

| 멤버 | 시그니처 | 설명 |
|------|----------|------|
| `create` | `<TModule>(filePath, opt?) => WorkerProxy<TModule>` | 타입 안전한 Worker 프록시 생성 |

### createWorker (function)

```typescript
function createWorker<
  TMethods extends Record<string, (...args: any[]) => unknown>,
  TEvents extends Record<string, unknown> = Record<string, never>,
>(methods: TMethods): {
  send<K extends keyof TEvents & string>(event: K, data?: TEvents[K]): void;
  __methods: TMethods;
  __events: TEvents;
}
```

### 타입

| 타입 | 설명 |
|------|------|
| `NormPath` | 정규화된 경로 브랜드 타입 (`string & { [NORM]: never }`) |
| `FsWatcherEvent` | `"add" \| "addDir" \| "change" \| "unlink" \| "unlinkDir"` |
| `FsWatcherChangeInfo` | `{ event: FsWatcherEvent; path: NormPath }` |
| `WorkerModule` | Worker 모듈 타입 구조 (타입 추론용) |
| `WorkerProxy<TModule>` | Worker 프록시 타입 (메서드 + `on`/`off`/`terminate`) |
| `PromisifyMethods<T>` | 메서드 반환값을 Promise로 래핑하는 매핑 타입 |
| `WorkerRequest` | 내부 Worker 요청 메시지 타입 |
| `WorkerResponse` | 내부 Worker 응답 메시지 타입 (return/error/event/log) |
