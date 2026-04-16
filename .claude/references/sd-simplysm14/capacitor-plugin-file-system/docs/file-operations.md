# File Operations

## `FileSystem.readdir`

디렉토리의 파일과 폴더 목록을 조회합니다.

```typescript
static async readdir(dirPath: string): Promise<FileInfo[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dirPath` | string | 조회할 디렉토리의 절대 경로 |

**Return**: 디렉토리 내 파일/폴더 목록 (각 항목은 name과 isDirectory 포함)

**Throws**: 디렉토리가 존재하지 않거나 허용되지 않는 경로일 경우 Error

```typescript
const files = await FileSystem.readdir("/storage/emulated/0/Documents");
for (const file of files) {
  console.log(`${file.name} ${file.isDirectory ? "[DIR]" : ""}`);
}
```

## `FileSystem.writeFile`

파일을 작성합니다. 문자열 또는 Bytes(Uint8Array) 데이터를 지원합니다.

```typescript
static async writeFile(filePath: string, data: string | Bytes): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | 쓸 파일의 절대 경로 |
| `data` | string \| Bytes | 파일 내용 (문자열 또는 Uint8Array) |

**Behavior**:
- 문자열인 경우: UTF-8 인코딩으로 저장 (encoding: "utf8")
- Bytes인 경우: Base64 인코딩으로 저장 (encoding: "base64")
- 상위 디렉토리가 없으면 자동 생성 (웹 환경에서만)

**Throws**: 쓰기 권한 없을 경우 Error

```typescript
// 문자열 쓰기
await FileSystem.writeFile("/storage/emulated/0/Documents/notes.txt", "Hello, World!");

// Bytes 쓰기 (예: PNG 이미지)
const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
await FileSystem.writeFile("/storage/emulated/0/Pictures/image.png", pngData);
```

## `FileSystem.readFile`

파일을 읽습니다. 기본적으로 Bytes를 반환하며, encoding 파라미터로 문자열 반환을 지정할 수 있습니다.

```typescript
static async readFile(filePath: string): Promise<Bytes>;
static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | 읽을 파일의 절대 경로 |
| `encoding` | "utf8" (optional) | "utf8"일 경우 string 반환, 생략 시 Bytes 반환 |

**Return**:
- encoding 생략: `Promise<Bytes>` (Uint8Array)
- encoding="utf8": `Promise<string>`

**Throws**: 파일이 없거나 읽기 권한이 없을 경우 Error

```typescript
// Bytes로 읽기 (기본)
const imageData = await FileSystem.readFile("/storage/emulated/0/Pictures/photo.jpg");
console.log(imageData instanceof Uint8Array); // true

// 문자열로 읽기
const config = await FileSystem.readFile("/storage/emulated/0/Documents/config.json", "utf8");
const obj = JSON.parse(config);
```

## `FileSystem.remove`

파일 또는 디렉토리를 삭제합니다. 디렉토리인 경우 재귀적으로 삭제됩니다.

```typescript
static async remove(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 삭제할 파일/디렉토리의 절대 경로 |

**Behavior**:
- 파일: 즉시 삭제
- 디렉토리: 하위의 모든 파일/폴더 포함하여 재귀 삭제
- 웹 환경: 경로 프리픽스로 모든 관련 항목 삭제

**Throws**: 대상이 존재하지 않거나 권한 없을 경우 Error

```typescript
// 파일 삭제
await FileSystem.remove("/storage/emulated/0/Documents/temp.txt");

// 디렉토리 재귀 삭제
await FileSystem.remove("/storage/emulated/0/Documents/old_backup");
```

## `FileSystem.mkdir`

디렉토리를 생성합니다. 상위 경로가 없는 경우 자동으로 생성됩니다 (재귀 생성).

```typescript
static async mkdir(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 생성할 디렉토리의 절대 경로 |

**Behavior**:
- 중간 경로가 없어도 자동 생성
- 이미 존재하면 아무 동작 없음

**Throws**: 권한 없을 경우 Error

```typescript
// 중간 경로 자동 생성
await FileSystem.mkdir("/storage/emulated/0/Documents/projects/2025/Q1");
```

## `FileSystem.exists`

파일 또는 디렉토리의 존재 여부를 확인합니다.

```typescript
static async exists(targetPath: string): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | string | 확인할 파일/디렉토리의 절대 경로 |

**Return**: true (존재), false (존재하지 않음)

```typescript
const exists = await FileSystem.exists("/storage/emulated/0/Documents/config.json");
if (!exists) {
  await FileSystem.writeFile("/storage/emulated/0/Documents/config.json", "{}");
}
```
