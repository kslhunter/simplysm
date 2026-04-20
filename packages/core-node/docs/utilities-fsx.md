# Utilities — fsx

`fsx`는 `@simplysm/core-node`에서 네임스페이스로 re-export되는 파일 시스템 유틸리티 모음이다.

```typescript
import { fsx } from "@simplysm/core-node";
```

---

## `exists`

파일 또는 디렉토리가 존재하는지 확인한다 (비동기).

```typescript
export async function exists(targetPath: string): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 확인할 경로 |

---

## `existsSync`

파일 또는 디렉토리가 존재하는지 확인한다 (동기).

```typescript
export function existsSync(targetPath: string): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 확인할 경로 |

---

## `mkdir`

디렉토리를 재귀적으로 생성한다 (비동기).

```typescript
export async function mkdir(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 생성할 디렉토리 경로 |

---

## `mkdirSync`

디렉토리를 재귀적으로 생성한다 (동기).

```typescript
export function mkdirSync(targetPath: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 생성할 디렉토리 경로 |

---

## `rm`

파일 또는 디렉토리를 삭제한다 (비동기). 파일 잠금 등 일시적 오류에 대해 최대 6회(500ms 간격) 재시도한다.

```typescript
export async function rm(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 삭제할 경로 |

---

## `rmSync`

파일 또는 디렉토리를 삭제한다 (동기). 재시도 없이 즉시 실패한다.

```typescript
export function rmSync(targetPath: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 삭제할 경로 |

---

## `copy`

파일 또는 디렉토리를 복사한다 (비동기). sourcePath가 존재하지 않으면 아무 작업도 수행하지 않는다.

```typescript
export async function copy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourcePath` | `string` | 복사할 원본 경로 |
| `targetPath` | `string` | 복사 대상 경로 |
| `filter` | `(absolutePath: string) => boolean` | 복사 여부를 결정하는 필터 함수. 각 파일/디렉토리의 절대 경로가 전달된다. 최상위 sourcePath는 필터 대상이 아니다. |

---

## `copySync`

파일 또는 디렉토리를 복사한다 (동기). sourcePath가 존재하지 않으면 아무 작업도 수행하지 않는다.

```typescript
export function copySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourcePath` | `string` | 복사할 원본 경로 |
| `targetPath` | `string` | 복사 대상 경로 |
| `filter` | `(absolutePath: string) => boolean` | 복사 여부를 결정하는 필터 함수 |

---

## `read`

파일을 UTF-8 문자열로 읽는다 (비동기).

```typescript
export async function read(targetPath: string): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 읽을 파일 경로 |

---

## `readSync`

파일을 UTF-8 문자열로 읽는다 (동기).

```typescript
export function readSync(targetPath: string): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 읽을 파일 경로 |

---

## `readBytes`

파일을 Uint8Array로 읽는다 (비동기).

```typescript
export async function readBytes(targetPath: string): Promise<Uint8Array>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 읽을 파일 경로 |

---

## `readBytesSync`

파일을 Uint8Array로 읽는다 (동기).

```typescript
export function readBytesSync(targetPath: string): Uint8Array
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 읽을 파일 경로 |

---

## `readJson`

JSON 파일을 읽는다 (비동기). `@simplysm/core-common`의 `json.parse`를 사용한다.

```typescript
export async function readJson<TData = unknown>(targetPath: string): Promise<TData>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 읽을 JSON 파일 경로 |

---

## `readJsonSync`

JSON 파일을 읽는다 (동기). `@simplysm/core-common`의 `json.parse`를 사용한다.

```typescript
export function readJsonSync<TData = unknown>(targetPath: string): TData
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 읽을 JSON 파일 경로 |

---

## `write`

파일에 데이터를 쓴다 (비동기). 상위 디렉토리를 자동으로 생성한다.

```typescript
export async function write(targetPath: string, data: string | Uint8Array): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 쓸 파일 경로 |
| `data` | `string \| Uint8Array` | 쓸 데이터 |

---

## `writeSync`

파일에 데이터를 쓴다 (동기). 상위 디렉토리를 자동으로 생성한다.

```typescript
export function writeSync(targetPath: string, data: string | Uint8Array): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 쓸 파일 경로 |
| `data` | `string \| Uint8Array` | 쓸 데이터 |

---

## `writeJson`

JSON 파일에 데이터를 쓴다 (비동기). `@simplysm/core-common`의 `json.stringify`를 사용한다.

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
| `targetPath` | `string` | 쓸 JSON 파일 경로 |
| `data` | `unknown` | 쓸 데이터 |
| `options.replacer` | `function` | JSON 직렬화 커스텀 replacer |
| `options.space` | `string \| number` | 들여쓰기 지정 |

---

## `writeJsonSync`

JSON 파일에 데이터를 쓴다 (동기). `@simplysm/core-common`의 `json.stringify`를 사용한다.

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
| `targetPath` | `string` | 쓸 JSON 파일 경로 |
| `data` | `unknown` | 쓸 데이터 |
| `options.replacer` | `function` | JSON 직렬화 커스텀 replacer |
| `options.space` | `string \| number` | 들여쓰기 지정 |

---

## `readdir`

디렉토리의 내용을 읽는다 (비동기).

```typescript
export async function readdir(targetPath: string): Promise<string[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 읽을 디렉토리 경로 |

**반환**: 디렉토리 내 항목 이름 배열 (상대 이름, 절대 경로 아님)

---

## `readdirSync`

디렉토리의 내용을 읽는다 (동기).

```typescript
export function readdirSync(targetPath: string): string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 읽을 디렉토리 경로 |

**반환**: 디렉토리 내 항목 이름 배열 (상대 이름, 절대 경로 아님)

---

## `stat`

파일/디렉토리 정보를 가져온다 (비동기). 심볼릭 링크를 따라간다.

```typescript
export async function stat(targetPath: string): Promise<fs.Stats>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 정보를 조회할 경로 |

---

## `statSync`

파일/디렉토리 정보를 가져온다 (동기). 심볼릭 링크를 따라간다.

```typescript
export function statSync(targetPath: string): fs.Stats
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 정보를 조회할 경로 |

---

## `lstat`

파일/디렉토리 정보를 가져온다 (비동기). 심볼릭 링크를 따라가지 않는다.

```typescript
export async function lstat(targetPath: string): Promise<fs.Stats>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 정보를 조회할 경로 |

---

## `lstatSync`

파일/디렉토리 정보를 가져온다 (동기). 심볼릭 링크를 따라가지 않는다.

```typescript
export function lstatSync(targetPath: string): fs.Stats
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | 정보를 조회할 경로 |

---

## `glob`

Glob 패턴을 사용하여 파일을 검색한다 (비동기).

```typescript
export async function glob(pattern: string, options?: GlobOptions): Promise<string[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | `string` | Glob 패턴 (예: `"**/*.ts"`) |
| `options` | `GlobOptions` | glob 패키지 옵션 |

**반환**: 매칭된 파일의 절대 경로 배열

---

## `globSync`

Glob 패턴을 사용하여 파일을 검색한다 (동기).

```typescript
export function globSync(pattern: string, options?: GlobOptions): string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | `string` | Glob 패턴 (예: `"**/*.ts"`) |
| `options` | `GlobOptions` | glob 패키지 옵션 |

**반환**: 매칭된 파일의 절대 경로 배열

---

## `clearEmptyDirectory`

지정된 디렉토리 하위의 빈 디렉토리를 재귀적으로 삭제한다. 모든 하위 디렉토리가 삭제되어 상위 디렉토리가 비게 되면 해당 디렉토리도 삭제된다.

```typescript
export async function clearEmptyDirectory(dirPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dirPath` | `string` | 빈 디렉토리를 정리할 루트 디렉토리 경로 |

---

## `findAllParentChildPaths`

시작 경로에서 루트 방향으로 부모 디렉토리를 순회하며 glob 패턴에 매칭되는 파일을 검색한다 (비동기).

```typescript
export async function findAllParentChildPaths(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): Promise<string[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `childGlob` | `string` | 각 디렉토리에서 검색할 glob 패턴 |
| `fromPath` | `string` | 검색을 시작할 경로 |
| `rootPath` | `string` | 검색을 중단할 경로. 미지정 시 파일 시스템 루트까지 검색. fromPath는 rootPath의 하위 경로여야 한다 |

---

## `findAllParentChildPathsSync`

시작 경로에서 루트 방향으로 부모 디렉토리를 순회하며 glob 패턴에 매칭되는 파일을 검색한다 (동기).

```typescript
export function findAllParentChildPathsSync(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `childGlob` | `string` | 각 디렉토리에서 검색할 glob 패턴 |
| `fromPath` | `string` | 검색을 시작할 경로 |
| `rootPath` | `string` | 검색을 중단할 경로. 미지정 시 파일 시스템 루트까지 검색 |
