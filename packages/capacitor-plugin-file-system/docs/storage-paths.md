# Storage & Paths

## `FileSystem.getStoragePath`

저장소 유형별로 기기의 실제 경로(Android) 또는 가상 경로(웹)를 반환합니다.

```typescript
static async getStoragePath(type: StorageType): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | StorageType | 저장소 유형 |

**Return**: 절대 경로 문자열

**StorageType 종류**:

| Type | Android Path | Web Path | 설명 |
|------|--------------|----------|------|
| `external` | `Environment.getExternalStorageDirectory()` | `/webfs/external` | 외부 저장소 루트 (공유 저장소) |
| `externalFiles` | `getExternalFilesDir(null)` | `/webfs/externalFiles` | 앱 전용 외부 파일 디렉토리 |
| `externalCache` | `externalCacheDir` | `/webfs/externalCache` | 앱 전용 외부 캐시 디렉토리 |
| `externalMedia` | `externalMediaDirs[0]` | `/webfs/externalMedia` | 앱 전용 외부 미디어 디렉토리 |
| `appData` | `applicationInfo.dataDir` | `/webfs/appData` | 앱 데이터 디렉토리 (내부) |
| `appFiles` | `filesDir` | `/webfs/appFiles` | 앱 파일 디렉토리 (내부) |
| `appCache` | `cacheDir` | `/webfs/appCache` | 앱 캐시 디렉토리 (내부) |

```typescript
// 앱 캐시 디렉토리에 임시 파일 작성
const cachePath = await FileSystem.getStoragePath("appCache");
await FileSystem.writeFile(cachePath + "/temp.dat", "temporary data");

// 외부 파일 디렉토리에 문서 저장
const filesPath = await FileSystem.getStoragePath("externalFiles");
await FileSystem.mkdir(filesPath + "/documents");
await FileSystem.writeFile(filesPath + "/documents/report.pdf", pdfBytes);
```

## `FileSystem.getUri`

파일의 URI를 조회합니다. 주로 Blob URL(웹) 또는 FileProvider URI(Android)로 반환됩니다.

```typescript
static async getUri(filePath: string): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | 파일의 절대 경로 |

**Return**: URI 문자열
- Android: `content://` scheme의 FileProvider URI
- Web: `blob://` scheme의 Blob URL

**Web 환경 주의사항**:
반환된 Blob URL은 사용 후 반드시 `URL.revokeObjectURL(uri)`로 해제해야 합니다. 해제하지 않으면 메모리 누수가 발생할 수 있습니다.

```typescript
// 웹 환경: Blob URL 사용 후 해제
const imagePath = await FileSystem.getStoragePath("appFiles");
const imageFile = imagePath + "/photo.jpg";

const uri = await FileSystem.getUri(imageFile);

const img = document.createElement("img");
img.src = uri;
img.onload = () => {
  URL.revokeObjectURL(uri); // 메모리 해제
};

// Android 환경: FileProvider URI를 다른 앱과 공유
const documentPath = await FileSystem.getStoragePath("externalFiles");
const documentFile = documentPath + "/report.pdf";
const contentUri = await FileSystem.getUri(documentFile);

// contentUri를 Intent의 data로 사용하여 다른 앱 실행
const intent = new Intent(Intent.ACTION_VIEW);
intent.setDataAndType(Uri.parse(contentUri), "application/pdf");
startActivity(intent);
```

## `StorageType`

저장소 유형을 나타내는 union type입니다.

```typescript
type StorageType =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";
```

**사용 가이드**:
- **내부 저장소 (앱 전용)**:
  - `appData`: 앱 상태 데이터 (자동 백업 대상)
  - `appFiles`: 일반 파일 저장
  - `appCache`: 임시 캐시 (시스템이 필요 시 삭제 가능)
- **외부 저장소 (공유 또는 앱 전용)**:
  - `external`: 전체 외부 저장소 (권한 필요)
  - `externalFiles`: 앱 전용 외부 파일 (권한 필요)
  - `externalCache`: 앱 전용 외부 캐시 (권한 필요)
  - `externalMedia`: 앱 전용 외부 미디어 (권한 필요)
