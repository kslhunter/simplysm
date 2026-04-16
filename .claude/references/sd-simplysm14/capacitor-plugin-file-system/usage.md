# @simplysm/capacitor-plugin-file-system

Capacitor 플러그인으로 Android 파일 시스템 접근을 제공합니다. 외부 저장소 전체 접근 및 앱 전용 디렉토리 접근을 지원하며, 브라우저 환경에서는 IndexedDB 기반 가상 파일 시스템으로 에뮬레이션합니다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

## API Overview

### Core File System Operations

| API | Type | Description |
|-----|------|-------------|
| `FileSystem.readdir` | function | 디렉토리의 파일/폴더 목록 조회 |
| `FileSystem.writeFile` | function | 파일 쓰기 (문자열 또는 Bytes) |
| `FileSystem.readFile` | function | 파일 읽기 (기본: Bytes, encoding="utf8" 시: string) |
| `FileSystem.remove` | function | 파일/디렉토리 삭제 (재귀) |
| `FileSystem.mkdir` | function | 디렉토리 생성 (재귀) |
| `FileSystem.exists` | function | 파일/디렉토리 존재 여부 확인 |

→ See [docs/file-operations.md](./docs/file-operations.md) for details.

### Storage & Paths

| API | Type | Description |
|-----|------|-------------|
| `FileSystem.getStoragePath` | function | 저장소 유형별 경로 조회 (external, externalFiles, appCache 등) |
| `FileSystem.getUri` | function | 파일 URI 조회 (FileProvider Blob URL) |
| `StorageType` | type | 저장소 유형 (external, externalFiles, externalCache, externalMedia, appData, appFiles, appCache) |

→ See [docs/storage-paths.md](./docs/storage-paths.md) for details.

### Permissions

| API | Type | Description |
|-----|------|-------------|
| `FileSystem.checkPermissions` | function | 파일 시스템 접근 권한 확인 |
| `FileSystem.requestPermissions` | function | 파일 시스템 접근 권한 요청 |

→ See [docs/permissions.md](./docs/permissions.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `FileInfo` | interface | 파일/디렉토리 정보 (name, isDirectory) |

→ See [docs/types.md](./docs/types.md) for details.

## Usage Examples

### 권한 확인 후 파일 읽기

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function readAppFile() {
  // 권한 확인
  const hasPermission = await FileSystem.checkPermissions();
  if (!hasPermission) {
    await FileSystem.requestPermissions();
  }

  // 앱 파일 디렉토리 경로 조회
  const appFilesPath = await FileSystem.getStoragePath("appFiles");

  // 파일 읽기 (문자열)
  const content = await FileSystem.readFile(appFilesPath + "/config.json", "utf8");
  console.log(content);
}
```

### Bytes 데이터 쓰기

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
import { bytes } from "@simplysm/core-common";

async function writeAppDataAsBytes() {
  const appCachePath = await FileSystem.getStoragePath("appCache");
  
  // Uint8Array로 작성
  const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
  await FileSystem.writeFile(appCachePath + "/image.png", data);
}
```

### 디렉토리 탐색

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function listDirectory(dirPath: string) {
  const files = await FileSystem.readdir(dirPath);
  
  for (const file of files) {
    console.log(`${file.name} ${file.isDirectory ? "(dir)" : "(file)"}`);
  }
  
  // 삭제 전 존재 여부 확인
  const exists = await FileSystem.exists(dirPath);
  if (exists) {
    await FileSystem.remove(dirPath);
  }
}
```

### 브라우저에서 Blob URL 사용

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function showImageInBrowser() {
  const appFilesPath = await FileSystem.getStoragePath("appFiles");
  const imagePath = appFilesPath + "/photo.jpg";
  
  // Blob URL 획득
  const uri = await FileSystem.getUri(imagePath);
  
  // DOM에서 사용
  const img = document.createElement("img");
  img.src = uri;
  document.body.appendChild(img);
  
  // 사용 완료 후 URL 해제 (메모리 누수 방지)
  img.onload = () => {
    URL.revokeObjectURL(uri);
  };
}
```
