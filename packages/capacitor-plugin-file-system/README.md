# @simplysm/capacitor-plugin-file-system

Capacitor 기반의 파일 시스템 접근 플러그인이다. Android에서는 네이티브 파일 시스템에 직접 접근하며, 웹 환경에서는 IndexedDB 기반의 가상 파일 시스템으로 동작한다.

## 설치

```bash
npm install @simplysm/capacitor-plugin-file-system
npx cap sync
```

### 피어 의존성

| 패키지 | 버전 |
|--------|------|
| `@capacitor/core` | `^7.4.4` |

### 내부 의존성

| 패키지 | 설명 |
|--------|------|
| `@simplysm/core-common` | base64 변환, `Bytes` 타입 등 공통 유틸리티 |

## 지원 플랫폼

| 플랫폼 | 지원 여부 | 구현 방식 |
|--------|----------|----------|
| Android | 지원 | 네이티브 Java (API 23+) |
| Web | 지원 | IndexedDB 기반 가상 파일 시스템 |
| iOS | 미지원 | - |

### Android 권한

Android 버전에 따라 다른 권한 모델을 사용한다.

| Android 버전 | 권한 | 동작 |
|-------------|------|------|
| Android 11+ (API 30+) | `MANAGE_EXTERNAL_STORAGE` | 설정 화면으로 이동하여 전체 파일 접근 권한 부여 |
| Android 10 이하 | `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | 런타임 권한 다이얼로그 표시 |

플러그인이 `AndroidManifest.xml`에 필요한 권한을 자동으로 선언하므로, 앱의 매니페스트에 별도로 추가할 필요가 없다.

## 주요 API

모든 API는 `FileSystem` 클래스의 정적 메서드로 제공된다.

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
```

### 메서드 목록

| 메서드 | 반환 타입 | 설명 |
|--------|----------|------|
| `hasPermission()` | `Promise<boolean>` | 파일 시스템 접근 권한 보유 여부 확인 |
| `requestPermission()` | `Promise<void>` | 파일 시스템 접근 권한 요청 |
| `readdir(dirPath)` | `Promise<IFileInfo[]>` | 디렉토리 내 파일/폴더 목록 조회 |
| `getStoragePath(type)` | `Promise<string>` | 저장소 유형별 절대 경로 반환 |
| `getFileUri(filePath)` | `Promise<string>` | FileProvider URI 반환 (Android) / Blob URL 반환 (Web) |
| `writeFile(filePath, data)` | `Promise<void>` | 파일 쓰기 (문자열 또는 바이너리) |
| `readFileString(filePath)` | `Promise<string>` | 파일을 UTF-8 문자열로 읽기 |
| `readFileBytes(filePath)` | `Promise<Bytes>` | 파일을 바이너리(`Uint8Array`)로 읽기 |
| `remove(targetPath)` | `Promise<void>` | 파일 또는 디렉토리 재귀 삭제 |
| `mkdir(targetPath)` | `Promise<void>` | 디렉토리 재귀 생성 |
| `exists(targetPath)` | `Promise<boolean>` | 파일 또는 디렉토리 존재 여부 확인 |

### 타입 정의

#### `TStorage`

저장소 유형을 나타내는 문자열 리터럴 타입이다.

| 값 | Android 경로 | 설명 |
|----|-------------|------|
| `"external"` | `Environment.getExternalStorageDirectory()` | 외부 저장소 루트 |
| `"externalFiles"` | `Context.getExternalFilesDir(null)` | 앱 전용 외부 파일 디렉토리 |
| `"externalCache"` | `Context.getExternalCacheDir()` | 앱 전용 외부 캐시 디렉토리 |
| `"externalMedia"` | `Context.getExternalMediaDirs()[0]` | 앱 전용 외부 미디어 디렉토리 |
| `"appData"` | `ApplicationInfo.dataDir` | 앱 데이터 디렉토리 |
| `"appFiles"` | `Context.getFilesDir()` | 앱 내부 파일 디렉토리 |
| `"appCache"` | `Context.getCacheDir()` | 앱 내부 캐시 디렉토리 |

#### `IFileInfo`

```typescript
interface IFileInfo {
  name: string;        // 파일 또는 디렉토리 이름
  isDirectory: boolean; // 디렉토리 여부
}
```

## 사용 예시

### 권한 확인 및 요청

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function ensurePermission(): Promise<boolean> {
  const granted = await FileSystem.hasPermission();
  if (!granted) {
    await FileSystem.requestPermission();
    // Android 11+에서는 설정 화면으로 이동하므로,
    // 앱으로 복귀한 후 다시 확인해야 한다.
    return await FileSystem.hasPermission();
  }
  return true;
}
```

### 텍스트 파일 읽기/쓰기

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function textFileExample(): Promise<void> {
  const storagePath = await FileSystem.getStoragePath("appFiles");
  const filePath = storagePath + "/config.json";

  // 파일 쓰기
  const config = { theme: "dark", lang: "ko" };
  await FileSystem.writeFile(filePath, JSON.stringify(config, null, 2));

  // 파일 읽기
  const content = await FileSystem.readFileString(filePath);
  const parsed = JSON.parse(content);
  console.log(parsed.theme); // "dark"
}
```

### 바이너리 파일 읽기/쓰기

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function binaryFileExample(): Promise<void> {
  const storagePath = await FileSystem.getStoragePath("appFiles");
  const filePath = storagePath + "/data.bin";

  // Uint8Array로 쓰기
  const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  await FileSystem.writeFile(filePath, bytes);

  // 바이너리로 읽기
  const readBytes = await FileSystem.readFileBytes(filePath);
  console.log(readBytes.length); // 5
}
```

### 디렉토리 관리

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function directoryExample(): Promise<void> {
  const storagePath = await FileSystem.getStoragePath("appFiles");
  const dirPath = storagePath + "/logs/2024";

  // 디렉토리 재귀 생성
  await FileSystem.mkdir(dirPath);

  // 파일 생성
  await FileSystem.writeFile(dirPath + "/app.log", "시작됨\n");

  // 디렉토리 목록 조회
  const files = await FileSystem.readdir(dirPath);
  for (const file of files) {
    console.log(`${file.name} (디렉토리: ${file.isDirectory})`);
  }

  // 존재 여부 확인
  const dirExists = await FileSystem.exists(dirPath);
  console.log(dirExists); // true

  // 디렉토리 재귀 삭제
  await FileSystem.remove(dirPath);
}
```

### FileProvider URI 얻기

Android에서 다른 앱과 파일을 공유할 때 `content://` URI가 필요하다.

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function shareFile(filePath: string): Promise<string> {
  // Android: content:// URI 반환
  // Web: blob: URL 반환 (사용 후 URL.revokeObjectURL() 호출 필요)
  const uri = await FileSystem.getFileUri(filePath);
  return uri;
}
```

> **주의**: 웹 환경에서 `getFileUri()`가 반환하는 Blob URL은 사용 후 반드시 `URL.revokeObjectURL(uri)`를 호출하여 메모리를 해제해야 한다.

## Android 설정

### FileProvider

플러그인은 자체 `FileSystemProvider`를 포함하고 있으며, authority는 `${applicationId}.filesystem.provider` 형식으로 자동 설정된다. 공유 가능한 경로는 다음과 같다:

- 외부 저장소 (`external-path`)
- 앱 전용 외부 파일 (`external-files-path`)
- 앱 전용 외부 캐시 (`external-cache-path`)
- 앱 내부 파일 (`files-path`)
- 앱 내부 캐시 (`cache-path`)

### 최소 SDK 버전

- `minSdkVersion`: 23 (Android 6.0)
- `compileSdkVersion`: 35

## 웹 환경 동작

웹 환경에서는 IndexedDB 기반의 가상 파일 시스템(`VirtualFileSystem`)으로 동작한다.

- 데이터베이스 이름: `capacitor_web_virtual_fs`
- 권한 관련 메서드(`hasPermission`, `requestPermission`)는 항상 성공으로 처리된다.
- `getStoragePath()`는 `/webfs/{type}` 형태의 가상 경로를 반환한다.
- `getFileUri()`는 Blob URL을 반환하며, 사용 후 `URL.revokeObjectURL()`로 해제해야 한다.
- 파일 데이터는 base64로 인코딩되어 IndexedDB에 저장된다.

## 라이선스

MIT
