# File System (fsx)

## `exists`

파일 또는 디렉토리가 존재하는지 확인 (비동기).

```typescript
export async function exists(targetPath: string): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 확인할 경로 |

**Return**: 파일/디렉토리가 존재하면 true, 없으면 false

---

## `existsSync`

파일 또는 디렉토리가 존재하는지 확인 (동기).

```typescript
export function existsSync(targetPath: string): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 확인할 경로 |

**Return**: 파일/디렉토리가 존재하면 true, 없으면 false

---

## `mkdir`

디렉토리를 생성한다 (재귀적, 비동기).

```typescript
export async function mkdir(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 생성할 디렉토리 경로 |

---

## `mkdirSync`

디렉토리를 생성한다 (재귀적, 동기).

```typescript
export function mkdirSync(targetPath: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 생성할 디렉토리 경로 |

---

## `rm`

파일 또는 디렉토리를 삭제한다 (비동기).

파일 잠금 등 일시적 오류에 대해 최대 6회(500ms 간격) 재시도한다.

```typescript
export async function rm(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 삭제할 경로 |

---

## `rmSync`

파일 또는 디렉토리를 삭제한다 (동기).

동기 버전은 재시도 없이 즉시 실패한다. 파일 잠금 등 일시적 오류가 발생할 수 있는 경우 `rm`을 사용하라.

```typescript
export function rmSync(targetPath: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 삭제할 경로 |

---

## `copy`

파일 또는 디렉토리를 복사한다 (비동기).

sourcePath가 존재하지 않으면 아무 작업도 수행하지 않고 반환한다.

```typescript
export async function copy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourcePath` | string | 복사할 원본 경로 |
| `targetPath` | string | 복사 대상 경로 |
| `filter` | function (optional) | 복사 여부를 결정하는 필터 함수. 각 파일/디렉토리의 절대 경로가 전달된다. true를 반환하면 복사, false를 반환하면 제외한다. 주의: 최상위 sourcePath는 필터링 대상이 아니며, 필터 함수는 모든 하위 항목(직접 및 간접)에 재귀적으로 적용된다. 디렉토리에 대해 false를 반환하면 해당 디렉토리와 모든 내용을 건너뛴다. |

---

## `copySync`

파일 또는 디렉토리를 복사한다 (동기).

sourcePath가 존재하지 않으면 아무 작업도 수행하지 않고 반환한다.

```typescript
export function copySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourcePath` | string | 복사할 원본 경로 |
| `targetPath` | string | 복사 대상 경로 |
| `filter` | function (optional) | 복사 여부를 결정하는 필터 함수. 각 파일/디렉토리의 절대 경로가 전달된다. true를 반환하면 복사, false를 반환하면 제외한다. 주의: 최상위 sourcePath는 필터링 대상이 아니며, 필터 함수는 모든 하위 항목(직접 및 간접)에 재귀적으로 적용된다. 디렉토리에 대해 false를 반환하면 해당 디렉토리와 모든 내용을 건너뛴다. |

---

## `read`

파일을 UTF-8 문자열로 읽는다 (비동기).

```typescript
export async function read(targetPath: string): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 읽을 파일 경로 |

**Return**: 파일의 UTF-8 문자열 내용

---

## `readSync`

파일을 UTF-8 문자열로 읽는다 (동기).

```typescript
export function readSync(targetPath: string): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 읽을 파일 경로 |

**Return**: 파일의 UTF-8 문자열 내용

---

## `readBytes`

파일을 Uint8Array로 읽는다 (비동기).

```typescript
export async function readBytes(targetPath: string): Promise<Uint8Array>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 읽을 파일 경로 |

**Return**: 파일의 바이너리 내용

---

## `readBytesSync`

파일을 Uint8Array로 읽는다 (동기).

```typescript
export function readBytesSync(targetPath: string): Uint8Array
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 읽을 파일 경로 |

**Return**: 파일의 바이너리 내용

---

## `readJson`

JSON 파일을 읽는다 (비동기, JsonConvert 사용).

```typescript
export async function readJson<TData = unknown>(targetPath: string): Promise<TData>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 읽을 JSON 파일 경로 |

**Return**: 파싱된 JSON 데이터

**Type Parameter**: `TData` - JSON 데이터의 타입

---

## `readJsonSync`

JSON 파일을 읽는다 (동기, JsonConvert 사용).

```typescript
export function readJsonSync<TData = unknown>(targetPath: string): TData
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 읽을 JSON 파일 경로 |

**Return**: 파싱된 JSON 데이터

**Type Parameter**: `TData` - JSON 데이터의 타입

---

## `write`

파일에 데이터를 쓴다 (비동기).

상위 디렉토리를 자동으로 생성한다.

```typescript
export async function write(targetPath: string, data: string | Uint8Array): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 쓸 파일 경로 |
| `data` | string \| Uint8Array | 쓸 데이터 |

---

## `writeSync`

파일에 데이터를 쓴다 (동기).

상위 디렉토리를 자동으로 생성한다.

```typescript
export function writeSync(targetPath: string, data: string | Uint8Array): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 쓸 파일 경로 |
| `data` | string \| Uint8Array | 쓸 데이터 |

---

## `writeJson`

JSON 파일에 데이터를 쓴다 (비동기, JsonConvert 사용).

```typescript
export async function writeJson(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 쓸 JSON 파일 경로 |
| `data` | unknown | 쓸 데이터 |
| `options` | object (optional) | JSON 직렬화 옵션 (replacer, space) |

---

## `writeJsonSync`

JSON 파일에 데이터를 쓴다 (동기, JsonConvert 사용).

```typescript
export function writeJsonSync(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 쓸 JSON 파일 경로 |
| `data` | unknown | 쓸 데이터 |
| `options` | object (optional) | JSON 직렬화 옵션 (replacer, space) |

---

## `readdir`

디렉토리의 내용을 읽는다 (비동기).

```typescript
export async function readdir(targetPath: string): Promise<string[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 읽을 디렉토리 경로 |

**Return**: 디렉토리 내 파일/폴더명 배열

---

## `readdirSync`

디렉토리의 내용을 읽는다 (동기).

```typescript
export function readdirSync(targetPath: string): string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 읽을 디렉토리 경로 |

**Return**: 디렉토리 내 파일/폴더명 배열

---

## `stat`

파일/디렉토리 정보를 가져온다 (심볼릭 링크를 따라감, 비동기).

```typescript
export async function stat(targetPath: string): Promise<fs.Stats>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 정보를 조회할 경로 |

**Return**: Node.js `fs.Stats` 객체

---

## `statSync`

파일/디렉토리 정보를 가져온다 (심볼릭 링크를 따라감, 동기).

```typescript
export function statSync(targetPath: string): fs.Stats
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 정보를 조회할 경로 |

**Return**: Node.js `fs.Stats` 객체

---

## `lstat`

파일/디렉토리 정보를 가져온다 (심볼릭 링크를 따라가지 않음, 비동기).

```typescript
export async function lstat(targetPath: string): Promise<fs.Stats>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 정보를 조회할 경로 |

**Return**: Node.js `fs.Stats` 객체

---

## `lstatSync`

파일/디렉토리 정보를 가져온다 (심볼릭 링크를 따라가지 않음, 동기).

```typescript
export function lstatSync(targetPath: string): fs.Stats
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 정보를 조회할 경로 |

**Return**: Node.js `fs.Stats` 객체

---

## `glob`

Glob 패턴을 사용하여 파일을 검색한다 (비동기).

```typescript
export async function glob(pattern: string, options?: GlobOptions): Promise<string[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | string | Glob 패턴 (예: "**/*.ts") |
| `options` | GlobOptions (optional) | glob 옵션 |

**Return**: 매칭된 파일의 절대 경로 배열

---

## `globSync`

Glob 패턴을 사용하여 파일을 검색한다 (동기).

```typescript
export function globSync(pattern: string, options?: GlobOptions): string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | string | Glob 패턴 (예: "**/*.ts") |
| `options` | GlobOptions (optional) | glob 옵션 |

**Return**: 매칭된 파일의 절대 경로 배열

---

## `clearEmptyDirectory`

지정된 디렉토리 하위의 빈 디렉토리를 재귀적으로 검색하여 삭제한다.

모든 하위 디렉토리가 삭제되어 상위 디렉토리가 비게 되면, 해당 디렉토리도 삭제된다.

```typescript
export async function clearEmptyDirectory(dirPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dirPath` | string | 정리할 디렉토리 경로 |

---

## `findAllParentChildPathsSync`

시작 경로에서 루트 방향으로 부모 디렉토리를 순회하며 glob 패턴에 매칭되는 파일을 검색한다.

각 디렉토리에서 childGlob 패턴에 매칭되는 모든 파일 경로를 수집한다.

```typescript
export function findAllParentChildPathsSync(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `childGlob` | string | 각 디렉토리에서 검색할 glob 패턴 |
| `fromPath` | string | 검색을 시작할 경로 |
| `rootPath` | string (optional) | 검색을 중단할 경로. 지정하지 않으면 파일 시스템 루트까지 검색. 주의: fromPath는 rootPath의 하위 경로여야 한다. 그렇지 않으면 파일 시스템 루트까지 검색한다. |

**Return**: 모든 매칭된 파일 경로 배열

---

## `findAllParentChildPaths`

시작 경로에서 루트 방향으로 부모 디렉토리를 순회하며 glob 패턴에 매칭되는 파일을 검색한다 (비동기).

각 디렉토리에서 childGlob 패턴에 매칭되는 모든 파일 경로를 수집한다.

```typescript
export async function findAllParentChildPaths(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): Promise<string[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `childGlob` | string | 각 디렉토리에서 검색할 glob 패턴 |
| `fromPath` | string | 검색을 시작할 경로 |
| `rootPath` | string (optional) | 검색을 중단할 경로. 지정하지 않으면 파일 시스템 루트까지 검색. 주의: fromPath는 rootPath의 하위 경로여야 한다. 그렇지 않으면 파일 시스템 루트까지 검색한다. |

**Return**: 모든 매칭된 파일 경로 배열
