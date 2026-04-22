# fsx

파일 시스템 작업을 위한 유틸리티 네임스페이스. 모든 연산은 동기(`*Sync`)와 비동기 쌍으로 제공된다.
비동기 버전을 기본으로 사용하고, CLI 초기화 등 동기가 반드시 필요한 경우에만 동기 버전을 사용한다.

```typescript
import { fsx } from "@simplysm/core-node";
```

## Members

### 존재 여부 확인

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `exists` | function | `(targetPath: string) => Promise<boolean>` | 파일 또는 디렉토리가 존재하는지 확인 (비동기) |
| `existsSync` | function | `(targetPath: string) => boolean` | 파일 또는 디렉토리가 존재하는지 확인 (동기) |

### 디렉토리 생성

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `mkdir` | function | `(targetPath: string) => Promise<void>` | 디렉토리를 재귀적으로 생성 (비동기) |
| `mkdirSync` | function | `(targetPath: string) => void` | 디렉토리를 재귀적으로 생성 (동기) |

### 삭제

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `rm` | function | `(targetPath: string) => Promise<void>` | 파일/디렉토리 삭제. 파일 잠금 오류 시 최대 6회(500ms 간격) 재시도 (비동기) |
| `rmSync` | function | `(targetPath: string) => void` | 파일/디렉토리 삭제. 재시도 없이 즉시 실패 (동기) |

### 복사

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `copy` | function | `(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean) => Promise<void>` | 파일/디렉토리 복사. sourcePath가 없으면 아무것도 하지 않음 (비동기) |
| `copySync` | function | `(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean) => void` | 파일/디렉토리 복사 (동기) |

### 파일 읽기

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `read` | function | `(targetPath: string) => Promise<string>` | 파일을 UTF-8 문자열로 읽음 (비동기) |
| `readSync` | function | `(targetPath: string) => string` | 파일을 UTF-8 문자열로 읽음 (동기) |
| `readBytes` | function | `(targetPath: string) => Promise<Uint8Array>` | 파일을 Uint8Array로 읽음 (비동기) |
| `readBytesSync` | function | `(targetPath: string) => Uint8Array` | 파일을 Uint8Array로 읽음 (동기) |
| `readJson` | function | `<TData = unknown>(targetPath: string) => Promise<TData>` | JSON 파일 읽기, `@simplysm/core-common`의 `json.parse` 사용 (비동기) |
| `readJsonSync` | function | `<TData = unknown>(targetPath: string) => TData` | JSON 파일 읽기 (동기) |

### 파일 쓰기

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `write` | function | `(targetPath: string, data: string \| Uint8Array) => Promise<void>` | 파일에 데이터 쓰기. 상위 디렉토리 자동 생성 (비동기) |
| `writeSync` | function | `(targetPath: string, data: string \| Uint8Array) => void` | 파일에 데이터 쓰기. 상위 디렉토리 자동 생성 (동기) |
| `writeJson` | function | `(targetPath: string, data: unknown, options?: { replacer?: ...; space?: string \| number }) => Promise<void>` | JSON 파일 쓰기, `@simplysm/core-common`의 `json.stringify` 사용 (비동기) |
| `writeJsonSync` | function | `(targetPath: string, data: unknown, options?: { replacer?: ...; space?: string \| number }) => void` | JSON 파일 쓰기 (동기) |

### 디렉토리 읽기

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `readdir` | function | `(targetPath: string) => Promise<string[]>` | 디렉토리 내용 읽기 (비동기) |
| `readdirSync` | function | `(targetPath: string) => string[]` | 디렉토리 내용 읽기 (동기) |

### 파일 정보

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `stat` | function | `(targetPath: string) => Promise<fs.Stats>` | 파일/디렉토리 정보 조회. 심볼릭 링크를 따라감 (비동기) |
| `statSync` | function | `(targetPath: string) => fs.Stats` | 파일/디렉토리 정보 조회. 심볼릭 링크를 따라감 (동기) |
| `lstat` | function | `(targetPath: string) => Promise<fs.Stats>` | 파일/디렉토리 정보 조회. 심볼릭 링크를 따라가지 않음 (비동기) |
| `lstatSync` | function | `(targetPath: string) => fs.Stats` | 파일/디렉토리 정보 조회. 심볼릭 링크를 따라가지 않음 (동기) |

### Glob

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `glob` | function | `(pattern: string, options?: GlobOptions) => Promise<string[]>` | Glob 패턴으로 파일 검색. 절대 경로 배열 반환 (비동기) |
| `globSync` | function | `(pattern: string, options?: GlobOptions) => string[]` | Glob 패턴으로 파일 검색 (동기) |

### 유틸리티

| Member | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `clearEmptyDirectory` | function | `(dirPath: string) => Promise<void>` | 지정 디렉토리 하위의 빈 디렉토리를 재귀적으로 삭제 |
| `findAllParentChildPaths` | function | `(childGlob: string, fromPath: string, rootPath?: string) => Promise<string[]>` | 시작 경로에서 루트 방향으로 부모 디렉토리를 순회하며 glob 패턴에 매칭되는 파일 검색 (비동기) |
| `findAllParentChildPathsSync` | function | `(childGlob: string, fromPath: string, rootPath?: string) => string[]` | 시작 경로에서 루트 방향으로 부모 디렉토리를 순회하며 glob 패턴에 매칭되는 파일 검색 (동기) |

## `copy` / `copySync` — filter 파라미터

- 각 파일/디렉토리의 **절대 경로**가 전달된다
- `true` 반환 시 복사, `false` 반환 시 제외
- 최상위 `sourcePath`는 필터링 대상이 아니다. 필터는 모든 하위 항목(직접 및 간접)에 재귀적으로 적용된다
- 디렉토리에 대해 `false`를 반환하면 해당 디렉토리와 모든 내용을 건너뛴다

## `findAllParentChildPaths` / `findAllParentChildPathsSync` — rootPath 주의

- `fromPath`는 `rootPath`의 하위 경로여야 한다. 그렇지 않으면 파일 시스템 루트까지 검색한다

## Usage

```typescript
import { fsx } from "@simplysm/core-node";

// 파일 존재 확인
const exists = await fsx.exists("/path/to/file.txt");

// 읽기/쓰기
const content = await fsx.read("/path/to/file.txt");
await fsx.write("/path/to/new-file.txt", "Hello, World!");

// JSON 읽기/쓰기
const data = await fsx.readJson<{ name: string }>("/config.json");
await fsx.writeJson("/config.json", { name: "test" });

// 복사 (필터 적용)
await fsx.copy("/src/dir", "/dst/dir", (filePath) => !filePath.includes("node_modules"));

// Glob 검색
const tsFiles = await fsx.glob("src/**/*.ts");

// 빈 디렉토리 정리
await fsx.clearEmptyDirectory("/output");

// 부모 디렉토리에서 파일 검색
const configs = await fsx.findAllParentChildPaths("package.json", "/project/src/components");
```
