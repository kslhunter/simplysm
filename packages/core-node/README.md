# @simplysm/core-node

Simplysm 프레임워크의 Node.js 전용 유틸리티 패키지이다. 경로 처리, 파일 시스템 조작, 파일 변경 감지, 타입 안전한 Worker 스레드 래퍼를 제공한다.

## 요구 사항

- Node.js 20.11+ (`import.meta.filename`/`import.meta.dirname` 지원 필요)

## 설치

```bash
npm install @simplysm/core-node
# or
pnpm add @simplysm/core-node
```

## 주요 모듈

### 경로 유틸리티 (`utils/path`)

경로 변환, 정규화, 비교, 필터링 함수를 제공한다.

| 함수/타입 | 설명 |
|-----------|------|
| `NormPath` | `pathNorm()`으로 생성되는 브랜드 타입. 정규화된 절대 경로를 나타낸다. |
| `pathPosix(...args)` | POSIX 스타일 경로로 변환한다 (백슬래시를 슬래시로 치환). |
| `pathNorm(...paths)` | 경로를 정규화하여 `NormPath`로 반환한다. 절대 경로로 변환되며 플랫폼별 구분자로 정규화된다. |
| `pathIsChildPath(childPath, parentPath)` | `childPath`가 `parentPath`의 자식 경로인지 확인한다. 같은 경로는 `false`를 반환한다. |
| `pathChangeFileDirectory(filePath, fromDir, toDir)` | 파일 경로의 디렉토리를 변경한다. 파일이 `fromDir` 안에 없으면 에러를 발생시킨다. |
| `pathGetBasenameWithoutExt(filePath)` | 확장자를 제거한 파일명(basename)을 반환한다. |
| `pathFilterByTargets(files, targets, cwd)` | 타겟 경로 목록을 기준으로 파일을 필터링한다. `targets`가 빈 배열이면 `files`를 그대로 반환한다. |

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
pathPosix("src", "index.ts"); // "src/index.ts"

// 경로 정규화 (절대 경로로 변환)
const normPath = pathNorm("src", "index.ts"); // NormPath 타입 반환

// 자식 경로 여부 확인
pathIsChildPath("/a/b/c", "/a/b"); // true
pathIsChildPath("/a/b", "/a/b/c"); // false
pathIsChildPath("/a/b", "/a/b");   // false (같은 경로)

// 파일 디렉토리 변경
pathChangeFileDirectory("/a/b/c.txt", "/a", "/x"); // "/x/b/c.txt"

// 확장자 제거한 파일명 반환
pathGetBasenameWithoutExt("file.txt");             // "file"
pathGetBasenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"

// 타겟 경로로 파일 필터링
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
pathFilterByTargets(files, ["src"], "/proj");
// ["/proj/src/a.ts", "/proj/src/b.ts"]
```

---

### 파일 시스템 유틸리티 (`utils/fs`)

파일 및 디렉토리에 대한 읽기, 쓰기, 삭제, 복사, 검색 등의 함수를 제공한다. 대부분의 함수는 비동기 버전과 동기(`Sync` 접미사) 버전이 함께 제공된다.

#### 존재 확인

| 함수 | 설명 |
|------|------|
| `fsExists(targetPath)` | 파일 또는 디렉토리 존재 여부를 비동기로 확인한다. |
| `fsExistsSync(targetPath)` | 파일 또는 디렉토리 존재 여부를 동기로 확인한다. |

#### 디렉토리 생성

| 함수 | 설명 |
|------|------|
| `fsMkdir(targetPath)` | 디렉토리를 비동기로 생성한다 (recursive). |
| `fsMkdirSync(targetPath)` | 디렉토리를 동기로 생성한다 (recursive). |

#### 삭제

| 함수 | 설명 |
|------|------|
| `fsRm(targetPath)` | 파일 또는 디렉토리를 비동기로 삭제한다. 파일 잠금 등 일시적 오류에 대해 최대 6회(500ms 간격) 재시도한다. |
| `fsRmSync(targetPath)` | 파일 또는 디렉토리를 동기로 삭제한다. 재시도 없이 즉시 실패한다. |

#### 복사

| 함수 | 설명 |
|------|------|
| `fsCopy(sourcePath, targetPath, filter?)` | 파일 또는 디렉토리를 비동기로 복사한다. `filter` 함수로 복사 대상을 선별할 수 있다. `sourcePath`가 존재하지 않으면 아무 작업도 수행하지 않는다. |
| `fsCopySync(sourcePath, targetPath, filter?)` | 파일 또는 디렉토리를 동기로 복사한다. |

#### 파일 읽기

| 함수 | 설명 |
|------|------|
| `fsRead(targetPath)` | UTF-8 문자열로 파일을 비동기로 읽는다. |
| `fsReadSync(targetPath)` | UTF-8 문자열로 파일을 동기로 읽는다. |
| `fsReadBuffer(targetPath)` | Buffer로 파일을 비동기로 읽는다. |
| `fsReadBufferSync(targetPath)` | Buffer로 파일을 동기로 읽는다. |
| `fsReadJson<T>(targetPath)` | JSON 파일을 비동기로 읽는다 (`jsonParse` 사용). |
| `fsReadJsonSync<T>(targetPath)` | JSON 파일을 동기로 읽는다 (`jsonParse` 사용). |

#### 파일 쓰기

| 함수 | 설명 |
|------|------|
| `fsWrite(targetPath, data)` | 파일을 비동기로 쓴다. 부모 디렉토리가 없으면 자동 생성한다. `data`는 `string` 또는 `Uint8Array`이다. |
| `fsWriteSync(targetPath, data)` | 파일을 동기로 쓴다. 부모 디렉토리 자동 생성. |
| `fsWriteJson(targetPath, data, options?)` | JSON 파일을 비동기로 쓴다 (`jsonStringify` 사용). `options`에서 `replacer`와 `space`를 지정할 수 있다. |
| `fsWriteJsonSync(targetPath, data, options?)` | JSON 파일을 동기로 쓴다. |

#### 디렉토리 읽기

| 함수 | 설명 |
|------|------|
| `fsReaddir(targetPath)` | 디렉토리 내용을 비동기로 읽는다. |
| `fsReaddirSync(targetPath)` | 디렉토리 내용을 동기로 읽는다. |

#### 파일 정보

| 함수 | 설명 |
|------|------|
| `fsStat(targetPath)` | 파일/디렉토리 정보를 비동기로 조회한다 (심볼릭 링크를 따라감). |
| `fsStatSync(targetPath)` | 파일/디렉토리 정보를 동기로 조회한다 (심볼릭 링크를 따라감). |
| `fsLstat(targetPath)` | 파일/디렉토리 정보를 비동기로 조회한다 (심볼릭 링크 자체 정보). |
| `fsLstatSync(targetPath)` | 파일/디렉토리 정보를 동기로 조회한다 (심볼릭 링크 자체 정보). |

#### Glob 검색

| 함수 | 설명 |
|------|------|
| `fsGlob(pattern, options?)` | Glob 패턴으로 파일을 비동기로 검색한다. 매칭된 파일의 절대 경로 배열을 반환한다. |
| `fsGlobSync(pattern, options?)` | Glob 패턴으로 파일을 동기로 검색한다. |

#### 기타 유틸리티

| 함수 | 설명 |
|------|------|
| `fsClearEmptyDirectory(dirPath)` | 지정 디렉토리 하위의 빈 디렉토리를 재귀적으로 삭제한다. |
| `fsFindAllParentChildPaths(childGlob, fromPath, rootPath?)` | 시작 경로부터 루트 방향으로 상위 디렉토리를 순회하며 glob 패턴을 비동기로 검색한다. |
| `fsFindAllParentChildPathsSync(childGlob, fromPath, rootPath?)` | 위의 동기 버전. |

```typescript
import {
  fsExists,
  fsRead,
  fsWrite,
  fsReadJson,
  fsWriteJson,
  fsStat,
  fsLstat,
  fsReaddir,
  fsGlob,
  fsMkdir,
  fsRm,
  fsCopy,
  fsClearEmptyDirectory,
  fsFindAllParentChildPaths,
  fsReadBuffer,
} from "@simplysm/core-node";

// 존재 확인
if (await fsExists("/path/to/file.txt")) {
  // ...
}

// 파일 읽기/쓰기
const content = await fsRead("/path/to/file.txt");
await fsWrite("/path/to/output.txt", "content"); // 부모 디렉토리 자동 생성

// 바이너리 파일 읽기
const buffer = await fsReadBuffer("/path/to/file.bin");

// JSON 파일 읽기/쓰기 (JsonConvert 사용)
interface Config { port: number; host: string }
const config = await fsReadJson<Config>("/path/to/config.json");
await fsWriteJson("/path/to/output.json", data, { space: 2 });

// 파일 정보 조회
const stat = await fsStat("/path/to/file.txt");   // 심볼릭 링크 따라감
const lstat = await fsLstat("/path/to/link");      // 심볼릭 링크 자체 정보

// 디렉토리 읽기
const entries = await fsReaddir("/path/to/dir");

// Glob 패턴으로 파일 검색
const tsFiles = await fsGlob("**/*.ts");

// 디렉토리 생성/삭제
await fsMkdir("/path/to/dir"); // recursive
await fsRm("/path/to/target");

// 빈 디렉토리 재귀 삭제
await fsClearEmptyDirectory("/path/to/dir");

// 파일/디렉토리 복사 (필터 함수로 node_modules 제외)
await fsCopy("/src", "/dest", (path) => !path.includes("node_modules"));

// 상위 디렉토리 순회하며 glob 검색
const configs = await fsFindAllParentChildPaths(
  "package.json",
  "/proj/src/sub",
  "/proj",
);
```

> constructor 등 async를 사용할 수 없는 경우를 제외하고 비동기 함수를 사용하는 것을 권장한다. 동기 함수는 이벤트 루프를 차단하여 성능 저하를 유발할 수 있다.

---

### FsWatcher (`features/fs-watcher`)

chokidar 기반 파일 시스템 변경 감지 래퍼이다. 짧은 시간 내 발생한 이벤트를 병합하여 콜백을 호출한다.

| API | 설명 |
|-----|------|
| `FsWatcher.watch(paths, options?)` | 파일 감시를 시작한다 (static, 비동기). chokidar의 `ready` 이벤트까지 대기한 후 `FsWatcher` 인스턴스를 반환한다. |
| `watcher.onChange(opt, cb)` | 파일 변경 이벤트 핸들러를 등록한다. `opt.delay`로 이벤트 병합 대기 시간(ms)을 설정한다. 체이닝을 지원한다. |
| `watcher.close()` | 파일 감시를 종료한다. |
| `FsWatcherEvent` | 이벤트 타입: `"add"` \| `"addDir"` \| `"change"` \| `"unlink"` \| `"unlinkDir"` |
| `FsWatcherChangeInfo` | 변경 정보 인터페이스. `event: FsWatcherEvent`, `path: NormPath` 필드를 가진다. |

**이벤트 병합 전략:**

짧은 시간 내 같은 파일에 대해 여러 이벤트가 발생하면 최종 상태만 전달한다.

| 이전 이벤트 | 새 이벤트 | 결과 |
|------------|----------|------|
| `add` | `change` | `add` (생성 직후 수정은 생성으로 간주) |
| `add` | `unlink` | 삭제 (생성 후 즉시 삭제는 변경 없음으로 처리) |
| `unlink` | `add` / `change` | `add` (삭제 후 재생성) |
| `unlinkDir` | `addDir` | `addDir` (디렉토리 재생성) |
| 그 외 | - | 최신 이벤트로 덮어씀 |

```typescript
import { FsWatcher } from "@simplysm/core-node";

// 파일 감시 시작
const watcher = await FsWatcher.watch(["src/**/*.ts"]);

// 변경 이벤트 핸들러 등록 (300ms 이내 이벤트 병합)
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
    // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
  }
});

// 감시 종료
await watcher.close();
```

---

### Worker (`worker/`)

Node.js `worker_threads` 기반의 타입 안전한 Worker 래퍼를 제공한다. Proxy를 사용하여 워커 메서드를 직접 호출하는 것처럼 사용할 수 있으며, 커스텀 이벤트도 지원한다.

| API | 설명 |
|-----|------|
| `Worker.create<TModule>(filePath, opt?)` | 타입 안전한 Worker Proxy를 생성한다. `filePath`는 `file://` URL 또는 절대 경로이다. |
| `createWorker<TMethods, TEvents>(methods)` | 워커 스레드 내에서 사용하는 워커 팩토리이다. 메서드 객체를 등록하고 이벤트 전송이 가능한 sender를 반환한다. |
| `WorkerModule` | `Worker.create<typeof import("./worker")>()`에서 타입 추론에 사용되는 모듈 타입 인터페이스이다. |
| `WorkerProxy<TModule>` | `Worker.create()`가 반환하는 Proxy 타입이다. Promisified 메서드, `on()`, `off()`, `terminate()`를 제공한다. |
| `PromisifyMethods<T>` | 메서드의 반환값을 `Promise`로 래핑하는 유틸리티 타입이다. |
| `WorkerRequest` | Worker 내부 요청 메시지 인터페이스이다. |
| `WorkerResponse` | Worker 내부 응답 메시지 타입이다 (`"return"` \| `"error"` \| `"event"` \| `"log"`). |

**기본 사용법 (이벤트 없이):**

```typescript
// worker.ts - 워커 파일
import { createWorker } from "@simplysm/core-node";

export default createWorker({
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b,
});

// main.ts - 메인 스레드
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";
import path from "path";

const worker = Worker.create<typeof MyWorker>(
  path.resolve(import.meta.dirname, "./worker.ts"),
);

const sum = await worker.add(10, 20);      // 30
const product = await worker.multiply(3, 4); // 12

await worker.terminate();
```

**이벤트를 사용하는 워커:**

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
    const result = a + b;
    sender.send("progress", 100);
    return result;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;

// main.ts
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";
import path from "path";

const worker = Worker.create<typeof MyWorker>(
  path.resolve(import.meta.dirname, "./worker.ts"),
);

// 이벤트 리스너 등록
worker.on("progress", (percent) => {
  console.log(`Progress: ${percent}%`);
});

const result = await worker.calculate(10, 20); // 30

// 이벤트 리스너 제거
const listener = (percent: number) => { /* ... */ };
worker.on("progress", listener);
worker.off("progress", listener);

await worker.terminate();
```

---

## 주의사항

- 모든 함수는 에러 발생 시 `SdError`로 래핑하여 경로 정보를 포함한 에러를 던진다.
- `fsRm`(비동기)은 파일 잠금 등의 일시적 오류에 대해 최대 6회(500ms 간격) 재시도하지만, `fsRmSync`(동기)는 재시도 없이 즉시 실패한다.
- `fsCopy`/`fsCopySync`에서 `filter` 함수는 최상위 `sourcePath`에는 적용되지 않으며, 디렉토리에 `false`를 반환하면 해당 디렉토리와 모든 하위 항목이 건너뛰어진다.
- `FsWatcher`는 내부적으로 `ignoreInitial: true`를 강제한다. `ignoreInitial: false`를 전달하면 `onChange` 첫 호출 시 빈 배열로 콜백이 호출되지만 실제 초기 파일 목록은 포함되지 않는다.
- Worker는 개발 환경(`.ts` 파일)에서 `tsx`를 통해 TypeScript 워커 파일을 자동으로 실행한다. 프로덕션 환경(`.js`)에서는 직접 Worker를 생성한다.
- 이 패키지는 `@simplysm/core-common`에 의존하며, JSON 처리에 `jsonParse`/`jsonStringify`를 사용한다.

## 의존성

| 패키지 | 용도 |
|--------|------|
| `@simplysm/core-common` | 공통 유틸리티 (`SdError`, `jsonParse`, `jsonStringify`, `EventEmitter`, `DebounceQueue` 등) |
| `chokidar` | 파일 시스템 변경 감지 (`FsWatcher`) |
| `consola` | 로깅 |
| `glob` | Glob 패턴 파일 검색 (`fsGlob`, `fsGlobSync`) |
| `tsx` | 개발 환경에서 TypeScript 워커 파일 실행 |

## 라이선스

Apache-2.0
