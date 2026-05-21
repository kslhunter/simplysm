## @simplysm/core-node — fsx

`import { fsx } from "@simplysm/core-node"`. 모든 함수는 동기(`*Sync`) + 비동기 쌍 제공. 실패 시 경로 정보를 포함한 `SdError` throw.

### 존재 확인 / 디렉토리

- `existsSync(p) / exists(p): boolean | Promise<boolean>` — 파일·디렉토리 존재 여부.
- `mkdirSync(p) / mkdir(p): void | Promise<void>` — 재귀 생성. 이미 있으면 무시.
- `readdirSync(p) / readdir(p): string[]` — 자식 이름 배열(절대 경로 아님).

### 삭제

- `rmSync(p)` — 재귀+force. **재시도 없음**, 파일 잠금 시 즉시 실패.
- `rm(p)` — 재귀+force, **최대 6회 / 500ms 간격 재시도**. 일시적 잠금 회피용.

### 복사

- `copySync(src, dst, filter?) / copy(src, dst, filter?)` — 재귀 복사.
  - `src`: 원본 경로. 존재하지 않으면 no-op.
  - `dst`: 대상 경로. 상위 디렉토리 자동 생성.
  - `filter(absolutePath): boolean`: 하위 항목 1개에 대한 포함 여부. true=포함, false=제외. **최상위 src 는 적용 대상 아님**. 디렉토리에 false 반환 시 그 하위 전체 스킵.
  - 파일 복사 실패 시 최대 6회 / 500ms 재시도.

### 읽기 / 쓰기

- `readSync(p) / read(p): string` — UTF-8 텍스트.
- `readBytesSync(p) / readBytes(p): Uint8Array` — 바이너리.
- `readJsonSync<T>(p) / readJson<T>(p): T` — `@simplysm/core-common` 의 `json.parse` 사용. 파싱 실패 시 본문 앞 500자 미리보기 포함 에러.
- `writeSync(p, data) / write(p, data)` — `data: string | Uint8Array`. 상위 디렉토리 자동 생성, `flush: true`.
- `writeJsonSync(p, data, opts?) / writeJson(p, data, opts?)` — `opts.replacer`: JSON.stringify 와 동일한 replacer. `opts.space`: 들여쓰기(숫자=스페이스 수, 문자열=리터럴).

### Stats

- `statSync / stat` — `fs.Stats`. 심볼릭 링크 따라감.
- `lstatSync / lstat` — `fs.Stats`. 심볼릭 링크 안 따라감 (링크 자체 정보).

### Glob

- `globSync(pattern, options?) / glob(pattern, options?): string[]` — `glob` 패키지 래핑. 패턴 내 백슬래시는 슬래시로 치환 후 호출. 결과는 **항상 절대 경로**로 정규화.
- `options`: `glob` 패키지의 `GlobOptions`(예: `dot: true` 로 dotfile 포함).

### 트리 유틸

- `clearEmptyDirectory(dirPath)` — 하위까지 재귀 순회, 파일이 없는 디렉토리만 삭제. 파일이 하나라도 있으면 보존.
- `findAllParentChildPathsSync(childGlob, fromPath, rootPath?) / findAllParentChildPaths(...)` — `fromPath` 부터 루트 방향으로 부모 디렉토리를 따라가며 각 디렉토리에서 `childGlob` 패턴 매칭 파일을 수집. `rootPath` 도달 시 종료(지정 없으면 FS 루트까지). 모노레포 루트 탐색 등에 사용.

### 예

```ts
import { fsx } from "@simplysm/core-node";
await fsx.copy("src", "dist", (p) => !p.includes("node_modules"));
const cfg = await fsx.readJson<{ name: string }>("package.json");
```
