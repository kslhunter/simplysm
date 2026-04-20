# Permissions

## `FileSystem.checkPermissions`

파일 시스템 접근 권한 여부를 확인합니다.

```typescript
static async checkPermissions(): Promise<boolean>
```

**Return**: true (권한 허용), false (권한 거부)

**플랫폼별 동작**:
- **Android**: 현재 권한 상태 확인 (MANAGE_EXTERNAL_STORAGE 또는 READ/WRITE_EXTERNAL_STORAGE)
- **Web**: 항상 true (권한 개념 없음)

```typescript
const hasPermission = await FileSystem.checkPermissions();
if (hasPermission) {
  // 파일 접근 가능
  const files = await FileSystem.readdir("/storage/emulated/0/Documents");
} else {
  // 권한 요청 필요
  await FileSystem.requestPermissions();
}
```

## `FileSystem.requestPermissions`

파일 시스템 접근 권한을 요청합니다.

```typescript
static async requestPermissions(): Promise<void>
```

**플랫폼별 동작**:
- **Android 11+ (API 30+)**:
  - `MANAGE_EXTERNAL_STORAGE` 권한 요청
  - 설정 화면으로 이동하여 사용자가 수동으로 허용
  - 권한 대화상자가 표시되지 않음
- **Android 10 이하 (API 29-)**:
  - `READ_EXTERNAL_STORAGE` + `WRITE_EXTERNAL_STORAGE` 요청
  - 표준 권한 대화상자 표시
- **Web**: 아무 동작 없음

```typescript
async function ensureFileSystemAccess() {
  const hasPermission = await FileSystem.checkPermissions();
  
  if (!hasPermission) {
    try {
      await FileSystem.requestPermissions();
      console.log("Permission granted");
    } catch (error) {
      console.error("Permission request failed:", error);
    }
  }
}

// 앱 시작 시 권한 확인
await ensureFileSystemAccess();

// 외부 저장소 접근
const externalPath = await FileSystem.getStoragePath("external");
const files = await FileSystem.readdir(externalPath);
```

## 권한 관련 주의사항

### Android 11+ (Scoped Storage)

- `MANAGE_EXTERNAL_STORAGE` 권한은 특수 권한이며, 일반 권한 대화상자로 요청할 수 없습니다.
- 권한 요청 시 설정 앱으로 이동하므로 사용자가 직접 허용/거부를 선택해야 합니다.
- AndroidManifest.xml에 `android.permission.MANAGE_EXTERNAL_STORAGE`를 선언해야 합니다.

### Android 10 이하

- `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` 권한이 필요합니다.
- 이 권한들은 위험한(Dangerous) 권한으로 분류되어 런타임 권한 요청이 필요합니다.

### 웹 환경

- 권한 개념이 없으며, IndexedDB 기반 가상 파일 시스템을 사용합니다.
- 사용자는 브라우저 저장소 한도에만 제한됩니다.
