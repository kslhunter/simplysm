# @simplysm/core-node

심플리즘 프레임워크의 Node.js 전용 유틸리티 패키지입니다.

## 설치

```bash
npm install @simplysm/core-node
# or
yarn add @simplysm/core-node
```

## 주요 기능

### Path Utils

경로 처리 유틸리티를 제공합니다.

```typescript
import { getParentPaths, convertToRelPath } from "@simplysm/core-node";

// 부모 경로들 가져오기
const parents = getParentPaths("/a/b/c"); // ["/a/b", "/a", "/"]

// 상대 경로로 변환
const relPath = convertToRelPath("/project/src/index.ts", "/project");
```

### FS Utils

파일 시스템 유틸리티를 제공합니다.

```typescript
import { readDirRecursive, findPathsByGlob, readJson, writeJson } from "@simplysm/core-node";

// 디렉토리 재귀 읽기
const files = await readDirRecursive("/path/to/dir");

// Glob 패턴으로 파일 찾기
const matched = await findPathsByGlob("**/*.ts", "/project");

// JSON 파일 읽기/쓰기
const config = await readJson("/path/to/config.json");
await writeJson("/path/to/output.json", data);
```

> **⚠️ 주의**: constructor 등 async를 사용할 수 없는 경우를 제외하고 반드시 async 함수를 사용하세요.
> 동기 함수(`*Sync`)는 이벤트 루프를 차단하여 성능 저하를 유발합니다.

### FS Watcher

파일 시스템 변경 감지 유틸리티를 제공합니다.

```typescript
import { FsWatcher } from "@simplysm/core-node";

const watcher = new FsWatcher();
await watcher.watch(["/path/to/watch"], async (changes) => {
  for (const change of changes) {
    console.log(`${change.type}: ${change.path}`);
  }
});

// 감시 중지
await watcher.close();
```

### Worker Utils

Worker 스레드 관리 유틸리티를 제공합니다.

```typescript
import { SdWorker, createWorker } from "@simplysm/core-node";

// Worker 생성
const worker = createWorker("./worker.js");

// SdWorker로 래핑하여 사용
const sdWorker = new SdWorker<InputType, OutputType>(worker);
const result = await sdWorker.run(input);

// Worker 종료
await sdWorker.terminate();
```

## 라이선스

Apache-2.0
