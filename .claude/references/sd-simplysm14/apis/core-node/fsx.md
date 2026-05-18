## @simplysm/core-node — fsx

`import { fsx } from "@simplysm/core-node"` — 파일/디렉토리 IO 헬퍼. 동기·비동기 쌍으로 제공. 모든 함수는 오류를 `SdError(원본, targetPath)` 로 wrap 해서 throw.

### 존재/생성/삭제

```ts
fsx.existsSync(p): boolean
fsx.exists(p): Promise<boolean>
fsx.mkdirSync(p): void                 // recursive
fsx.mkdir(p): Promise<void>            // recursive
fsx.rmSync(p): void                    // recursive, force, 재시도 없음
fsx.rm(p): Promise<void>               // recursive, force, 6회/500ms 재시도 (파일 잠금 대응)
```

동기 rm 은 재시도 없음 — Windows 잠금 가능성 있으면 비동기 `rm` 사용.

### 복사

```ts
fsx.copySync(src, dst, filter?): void
fsx.copy(src, dst, filter?): Promise<void>
```

- `src` 없으면 no-op.
- `filter(absolutePath): boolean` — 각 하위 항목 절대 경로로 호출. 최상위 `src` 자체는 필터 대상 아님. 디렉토리에 false 반환 시 그 하위 전체 스킵.
- 파일 복사 6회/500ms 재시도 (sync 는 busy-wait).

### 읽기/쓰기

```ts
fsx.readSync(p): string                          // utf-8
fsx.read(p): Promise<string>
fsx.readBytesSync(p): Uint8Array
fsx.readBytes(p): Promise<Uint8Array>
fsx.readJsonSync<T>(p): T                        // @simplysm/core-common json.parse
fsx.readJson<T>(p): Promise<T>

fsx.writeSync(p, data: string|Uint8Array): void  // 상위 디렉토리 자동 생성, flush:true
fsx.write(p, data): Promise<void>
fsx.writeJsonSync(p, data, { replacer?, space? }?): void
fsx.writeJson(p, data, { replacer?, space? }?): Promise<void>
```

JSON 파싱 실패 시 `SdError` 메시지에 파일 경로 + 본문 500자 미리보기 포함.

### 디렉토리/정보

```ts
fsx.readdirSync(p): string[]
fsx.readdir(p): Promise<string[]>
fsx.statSync(p): fs.Stats                        // 심볼릭 링크 따라감
fsx.stat(p): Promise<fs.Stats>
fsx.lstatSync(p): fs.Stats                       // 심볼릭 링크 따라가지 않음
fsx.lstat(p): Promise<fs.Stats>
```

### Glob / 트리 유틸

```ts
fsx.globSync(pattern, options?: GlobOptions): string[]      // 항상 절대 경로, 백슬래시 → 슬래시
fsx.glob(pattern, options?): Promise<string[]>

fsx.clearEmptyDirectory(dirPath): Promise<void>             // 빈 디렉토리 재귀 삭제

fsx.findAllParentChildPathsSync(childGlob, fromPath, rootPath?): string[]
fsx.findAllParentChildPaths(childGlob, fromPath, rootPath?): Promise<string[]>
```

`findAllParentChildPaths*`: `fromPath` 에서 루트 방향으로 부모를 순회하며 각 디렉토리에 `childGlob` 적용. `rootPath` 미지정 또는 `fromPath` 가 `rootPath` 하위가 아니면 파일 시스템 루트까지 진행. `pnpm-workspace.yaml` 같은 ancestor 설정 파일 탐색에 사용.

사용 예:

```ts
import { fsx } from "@simplysm/core-node";

await fsx.mkdir(path.resolve(out, "dist"));
const tsFiles = await fsx.glob("src/**/*.ts");
const cfg = await fsx.readJson<MyConfig>("sd.config.json");
await fsx.copy(src, dst, (p) => !p.includes(`${path.sep}node_modules${path.sep}`));
```
