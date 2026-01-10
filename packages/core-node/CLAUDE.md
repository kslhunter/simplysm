# core-node 개발 가이드

> SIMPLYSM 프레임워크의 Node.js 전용 유틸리티 패키지 - Claude Code 참고 문서
>
> **주의:** `sd-core-node`(구버전)은 참고 금지.

**이 문서는 Claude Code가 core-node 패키지를 개발/수정할 때 참고하는 가이드입니다.**
**프로젝트 루트의 [CLAUDE.md](../../CLAUDE.md) 함께 확인하세요.**
**사용자 문서는 [README.md](README.md)를 참고하세요.**

## 아키텍처

```
Application
    ↓
angular, cli, etc.
    ↓
service-server / service-client
    ↓
orm-node
    ↓
core-node               ← Node.js 전용 유틸리티
    ↓
core-common             ← 공통 유틸리티
```

**핵심**: Node.js 환경 전용 유틸리티. 파일 시스템, 프로세스, 워커 등.

## 모듈 구조

```
src/
├── utils/
│   ├── path.ts         # 경로 유틸리티 (NormPath 브랜드 타입)
│   ├── fs.ts           # 파일 시스템 유틸리티 (node:fs/promises 기반)
│   └── fs-watcher.ts   # 파일 감시 (chokidar 래퍼)
├── worker/
│   ├── types.ts        # 워커 타입 정의
│   ├── sd-worker.ts    # 메인 스레드 워커 클래스
│   └── create-worker.ts # 워커 팩토리
└── index.ts            # 진입점
lib/
└── worker-dev-proxy.js # tsx 기반 TS 워커 실행용 프록시
```

## 주요 컴포넌트

### PathUtils (utils/path.ts)

| 함수 | 설명 |
|------|------|
| `posix(...args)` | POSIX 스타일 경로 (백슬래시 → 슬래시) |
| `norm(...paths)` | 정규화된 경로 (`NormPath` 반환) |
| `isChildPath(child, parent)` | 자식 경로 여부 확인 |
| `changeFileDirectory(file, from, to)` | 디렉토리 변경 |
| `removeExt(filePath)` | 확장자 제거 |

**NormPath**: 브랜드 타입으로 경로 정규화 보장

```typescript
const normalized: NormPath = PathUtils.norm("/some/path");
```

### FsUtils (utils/fs.ts)

| 함수 | 설명 |
|------|------|
| `exists(path)` | 파일/디렉토리 존재 확인 (동기) |
| `mkdir(path)` / `mkdirAsync(path)` | 디렉토리 생성 (recursive) |
| `rm(path)` / `rmAsync(path)` | 파일/디렉토리 삭제 |
| `copy(src, dest)` / `copyAsync(src, dest)` | 복사 |
| `read(path)` / `readAsync(path)` | 파일 읽기 (UTF-8) |
| `readBuffer(path)` / `readBufferAsync(path)` | 파일 읽기 (Buffer) |
| `write(path, data)` / `writeAsync(path, data)` | 파일 쓰기 |
| `readJson(path)` / `readJsonAsync(path)` | JSON 읽기 |
| `writeJson(path, data)` / `writeJsonAsync(path, data)` | JSON 쓰기 |
| `glob(pattern)` / `globAsync(pattern)` | 글로브 패턴 매칭 |
| `readdir(path)` / `readdirAsync(path)` | 디렉토리 읽기 |
| `stat(path)` / `statAsync(path)` | 파일 정보 |

### SdFsWatcher (utils/fs-watcher.ts)

chokidar 기반 파일 감시 래퍼.

```typescript
const watcher = await SdFsWatcher.watchAsync(["src/**/*.ts"]);
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
  }
});
```

**이벤트 병합**: 짧은 시간 내 발생한 이벤트를 병합하여 콜백 호출.

### Worker 유틸리티 (worker/)

타입 안전한 워커 통신.

**메인 스레드**:
```typescript
const worker = new SdWorker<MyWorkerType>("./worker.ts");
const result = await worker.run("methodName", [arg1, arg2]);
worker.on("eventName", (data) => { ... });
await worker.killAsync();
```

**워커 스레드**:
```typescript
const sender = createSdWorker<MyWorkerType>({
  methodName: async (arg1, arg2) => {
    return result;
  }
});

sender.send("eventName", data);
```

## 외부 의존성

| 패키지 | 용도 |
|--------|------|
| `chokidar@5` | 파일 감시 |
| `glob@13` | 파일 글로빙 |
| `pino@10` | 로깅 |
| `tsx@4` | 개발 환경 TS 워커 실행 |

## core-common 의존성

| 항목 | 위치 |
|------|------|
| `JsonConvert` | FsUtils |
| `SdError` | FsUtils |
| `SdAsyncFnDebounceQueue` | SdFsWatcher |
| `TransferableConvert` | Worker |
| `Uuid` | Worker |
| `Array.parallelAsync()` | FsUtils |
| `Array.groupBy()` | FsUtils |
| `Map.getOrCreate()` | SdFsWatcher |

## sd-core-node과의 차이

### 제거됨

| 항목 | 이유 |
|------|------|
| `HashUtils` | 7줄 래퍼, 직접 `crypto.createHash()` 사용 |
| `SdProcess` | `execa` 패키지로 대체 |
| `SdLogger` | `pino` + `ora`로 대체 |

### 개선됨

| 항목 | 변경 내용 |
|------|----------|
| FsUtils 함수명 | 단순화 (`readFile` → `read`, `mkdirs` → `mkdir`) |
| Worker | 에러 핸들링 개선 |

## 테스트

```bash
# 전체 테스트
npx vitest run packages/core-node

# 특정 파일
npx vitest run packages/core-node/tests/utils/fs.spec.ts
```

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/core-node/tsconfig.json 2>&1 | grep "^packages/core-node/"

# ESLint
yarn run _sd-cli_ lint "packages/core-node/**/*.ts"

# 테스트
npx vitest run packages/core-node
```
