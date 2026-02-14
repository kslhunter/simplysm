# CLI Worker 구조 리팩토링 설계서

## 1. 문제점

### 일관성 부족

현재 같은 작업이 모드(dev/build)에 따라 다른 방식으로 처리됨:

| 작업              | 프로덕션 (`build`)   | 개발 (`dev/watch`)       |
| ----------------- | -------------------- | ------------------------ |
| Client (Vite)     | 메인 스레드에서 직접 | `watch.worker.ts`        |
| Library (esbuild) | `build.worker.ts`    | `watch.worker.ts`        |
| Server (esbuild)  | `build.worker.ts`    | `server-build.worker.ts` |
| DTS 생성          | `dts.worker.ts`      | `dts.worker.ts`          |

---

## 2. 설계 방향

**빌드 타입별 Worker 통일**: 같은 타입(client/library/server)은 하나의 Worker 파일에서 dev/build 모두 처리

---

## 3. Worker 파일 구조 변경

### 현재 구조

```
workers/
├── build.worker.ts         # 프로덕션 Library/Server 빌드
├── dts.worker.ts           # .d.ts 생성 + 타입체크
├── typecheck.worker.ts     # typecheck 명령어 전용
├── watch.worker.ts         # 개발 모드 Client/Library
├── server-build.worker.ts  # 개발 모드 Server 빌드
└── server-runtime.worker.ts # 서버 실행 + 프록시
```

### 변경 후 구조

```
workers/
├── client.worker.ts        # Client(Vite) build + devServer
├── library.worker.ts       # Library(esbuild) build + watch
├── server.worker.ts        # Server(esbuild) build + watch
├── dts.worker.ts           # .d.ts 생성 + 타입체크 (emit 옵션)
└── server-runtime.worker.ts # 서버 실행 + 프록시 (유지)
```

### 삭제 파일

- `build.worker.ts` → `library.worker.ts`, `server.worker.ts`로 분리
- `watch.worker.ts` → `client.worker.ts`, `library.worker.ts`로 분리
- `typecheck.worker.ts` → `dts.worker.ts`에 통합
- `server-build.worker.ts` → `server.worker.ts`로 통합

---

## 4. Worker 인터페이스

### 공통 메서드

```typescript
interface BuildWorker {
  build(info: BuildInfo): Promise<BuildResult>; // 프로덕션 1회 빌드
  startWatch(info: WatchInfo): Promise<void>; // 개발 모드 watch 시작
  stopWatch(): Promise<void>; // watch 중지
}

interface BuildResult {
  success: boolean;
  errors?: string[];
}
```

### 공통 이벤트 (watch 모드)

```typescript
interface BuildWorkerEvents {
  buildStart: {};
  build: BuildResult;
  error: { message: string };
}
```

### 타입별 확장

**client.worker.ts 추가 이벤트:**

```typescript
interface ClientWorkerEvents extends BuildWorkerEvents {
  serverReady: { port: number };
}
```

**dts.worker.ts 옵션:**

```typescript
interface DtsBuildInfo extends BuildInfo {
  emit: boolean; // true: .d.ts 생성 + 타입체크, false: 타입체크만
}
```

---

## 5. 각 Worker 역할

### client.worker.ts (Vite)

| 메서드         | 동작                                        |
| -------------- | ------------------------------------------- |
| `build()`      | `vite.build()` 호출, 프로덕션 번들 생성     |
| `startWatch()` | `vite.createServer()` 호출, dev server 시작 |
| `stopWatch()`  | dev server 종료                             |

### library.worker.ts (esbuild)

| 메서드         | 동작                                            |
| -------------- | ----------------------------------------------- |
| `build()`      | `esbuild.build()` 호출, 1회 빌드                |
| `startWatch()` | `esbuild.context()` + `watch()`, 파일 변경 감지 |
| `stopWatch()`  | context dispose                                 |

### server.worker.ts (esbuild)

| 메서드         | 동작                                                              |
| -------------- | ----------------------------------------------------------------- |
| `build()`      | `esbuild.build()` 호출, 1회 빌드                                  |
| `startWatch()` | `esbuild.context()` + `watch()`, 빌드 완료 시 `build` 이벤트 emit |
| `stopWatch()`  | context dispose                                                   |

### dts.worker.ts (TypeScript)

| 메서드                   | 동작                                            |
| ------------------------ | ----------------------------------------------- |
| `build({ emit: true })`  | `.d.ts` 생성 + 타입체크                         |
| `build({ emit: false })` | 타입체크만 (noEmit)                             |
| `startWatch()`           | `ts.createWatchProgram()`, incremental 타입체크 |
| `stopWatch()`            | watch program 종료                              |

---

## 6. Commands → Worker 호출 매핑

### build.ts (프로덕션 빌드)

```
Library 패키지  → library.worker.build()
                → dts.worker.build({ emit: true })

Server 패키지  → server.worker.build()

Client 패키지  → client.worker.build()
                → dts.worker.build({ emit: false })  // 타입체크만
```

### dev.ts (개발 모드)

```
Library 패키지  → library.worker.startWatch()
                → dts.worker.startWatch({ emit: true })

Server 패키지  → server.worker.startWatch()
                → server-runtime.worker.start()

Client 패키지  → client.worker.startWatch()
                → dts.worker.startWatch({ emit: false })
```

### watch.ts

```
→ WatchOrchestrator → dev.ts와 동일 (서버 제외)
```

### typecheck.ts

```
모든 패키지  → dts.worker.build({ emit: false })
```

---

## 7. 공통 설정 모듈

Vite/esbuild 설정 중복을 제거하기 위해 공통 설정 생성 함수 추출:

```
utils/
├── vite-config.ts      # Vite 설정 생성
├── esbuild-config.ts   # esbuild 설정 생성
└── ... (기존 유틸)
```

### vite-config.ts

```typescript
export function createViteConfig(options: {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  env?: Record<string, string>;
  mode: "build" | "dev";
}): ViteUserConfig;
```

### esbuild-config.ts

```typescript
export function createEsbuildConfig(options: {
  pkgDir: string;
  entryPoints: string[];
  outDir: string;
  external?: string[];
  watch: boolean;
}): esbuild.BuildOptions;
```

---

## 8. 파일 변경 요약

### 생성

| 파일                        | 역할                        |
| --------------------------- | --------------------------- |
| `workers/client.worker.ts`  | Client(Vite) 빌드/watch     |
| `workers/library.worker.ts` | Library(esbuild) 빌드/watch |
| `workers/server.worker.ts`  | Server(esbuild) 빌드/watch  |
| `utils/vite-config.ts`      | Vite 설정 생성              |
| `utils/esbuild-config.ts`   | esbuild 설정 생성           |

### 수정

| 파일                    | 변경 내용                             |
| ----------------------- | ------------------------------------- |
| `workers/dts.worker.ts` | `emit` 옵션 추가, typecheck 로직 통합 |
| `commands/build.ts`     | 새 Worker 호출로 변경                 |
| `commands/dev.ts`       | 새 Worker 호출로 변경                 |
| `commands/watch.ts`     | 새 Worker 호출로 변경                 |
| `commands/typecheck.ts` | `dts.worker` 호출로 변경              |

### 삭제

| 파일                             |
| -------------------------------- |
| `workers/build.worker.ts`        |
| `workers/watch.worker.ts`        |
| `workers/server-build.worker.ts` |
| `workers/typecheck.worker.ts`    |

---

## 9. 예상 효과

1. **일관성 확보** - 같은 빌드 타입은 하나의 Worker에서 처리
2. **코드 중복 제거** - Vite/esbuild 설정 공유 모듈로 추출
3. **유지보수성 향상** - 빌드 타입별로 로직이 분리되어 추적 용이
4. **확장성** - 새 빌드 타입 추가 시 Worker 하나만 추가
