# CLAUDE.md

> 이 패키지의 사용법 및 지침은 `.claude/references/sd-simplysm-v14/capacitor-plugin-usb-storage/README.md`를 참조한다.

## Package Overview

`@simplysm/capacitor-plugin-usb-storage` -- Android USB Mass Storage 접근 플러그인. libaums 라이브러리를 통해 USB 장치를 열거하고 파일을 읽는다. 브라우저 환경에서는 IndexedDB 기반 가상 USB 저장소로 에뮬레이션한다. TypeScript 소스 5개 파일.

의존성:
- `@simplysm/core-browser` -- `IndexedDbStore`, `IndexedDbVirtualFs`, `VirtualFsEntry`
- `@simplysm/core-common` -- `bytes` (Base64 변환), `Bytes` 타입

## Architecture

```
src/
├── UsbStoragePlugin.ts    <- Capacitor 플러그인 인터페이스 및 타입
│                            (UsbDeviceInfo, UsbDeviceFilter, UsbFileInfo, UsbStoragePlugin)
├── UsbStorage.ts          <- 플러그인 등록 및 정적 파사드 클래스
├── web/
│   ├── UsbStorageWeb.ts   <- 브라우저 폴백 (WebPlugin 상속, VirtualUsbStorage 사용)
│   └── VirtualUsbStorage.ts <- IndexedDB 기반 가상 USB 저장소 어댑터
└── index.ts               <- public API re-exports
android/
└── src/main/kotlin/kr/co/simplysm/capacitor/usbstorage/
    └── UsbStoragePlugin.kt <- Android 네이티브 구현 (Kotlin, libaums 사용)
```

## Key Patterns

### 레이어 구조

플러그인은 항상 3계층으로 구성된다:

1. **`*Plugin.ts`** -- Capacitor 플러그인 인터페이스와 타입만 정의 (로직 없음)
2. **`*.ts` (파사드)** -- `registerPlugin()`으로 플러그인을 등록하고, `abstract class`로 정적 메서드를 노출
3. **`web/*.ts`** -- `WebPlugin`을 상속하는 브라우저 폴백

```typescript
// 1. 플러그인 인터페이스 (UsbStoragePlugin.ts)
export interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}

// 2. 파사드 (UsbStorage.ts)
const usbStoragePlugin = registerPlugin<UsbStoragePlugin>("UsbStorage", {
  web: async () => {
    const { UsbStorageWeb } = await import("./web/UsbStorageWeb");
    return new UsbStorageWeb();
  },
});

export abstract class UsbStorage {
  static async getDevices(): Promise<UsbDeviceInfo[]>;
  static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

### UsbDeviceFilter 패턴

모든 장치 접근 메서드는 `UsbDeviceFilter`(`vendorId` + `productId`)를 첫 번째 파라미터로 받는다. 경로가 필요한 메서드(`readdir`, `readFile`)는 플러그인 레벨로 전달할 때 스프레드(`...filter`)로 병합한다. 경로가 없는 메서드(`requestPermissions`, `checkPermissions`)는 필터를 그대로 전달한다.

```typescript
static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]> {
  const result = await usbStoragePlugin.readdir({ ...filter, path: dirPath });
  return result.files;
}
```

### VirtualUsbStorage (브라우저 어댑터)

`VirtualUsbStorage`는 `core-browser`의 `IndexedDbVirtualFs`를 감싼다. 장치별로 파일을 격리하기 위해 `fullKey = "{vendorId}:{productId}:{path}"` 복합 키를 사용한다.

```typescript
async getEntry(deviceKey: string, path: string): Promise<VirtualFsEntry | undefined> {
  const fullKey = `${deviceKey}:${path}`;
  return this._vfs.getEntry(fullKey);
}
```

IndexedDB 데이터베이스명은 `"capacitor_usb_virtual_storage"`이며, `"devices"`와 `"files"` 두 개의 오브젝트 스토어를 사용한다.

### 테스트/개발용 가상 장치 API

`UsbStorageWeb`에는 테스트와 개발 목적의 헬퍼 메서드가 있다:

- `addVirtualDevice(device)` -- 가상 USB 장치 등록
- `addVirtualFile(filter, filePath, data)` -- 가상 파일 추가
- `addVirtualDirectory(filter, dirPath)` -- 가상 디렉토리 추가

이 메서드들은 `UsbStoragePlugin` 인터페이스에 없으므로 `UsbStorage` 파사드를 통해서는 접근할 수 없다. 테스트 코드에서 `UsbStorageWeb` 인스턴스를 직접 사용할 때만 호출한다.

### Bytes 파일 읽기

`readFile()`은 파일이 없으면 `undefined`를 반환한다. 플러그인 레벨에서 `{ data: string | null }`로 반환되며, `null` 체크 후 `bytes.fromBase64()`로 변환한다.

## Android 네이티브

- 파일: `android/src/main/kotlin/kr/co/simplysm/capacitor/usbstorage/UsbStoragePlugin.kt`
- 라이브러리: `libaums` (USB Mass Storage 접근)
- 권한: USB 장치 접근 권한은 `vendorId`/`productId` 기준으로 요청하며, Android UsbManager를 통해 관리된다. Android 12+(API 31+)에서는 `PendingIntent.FLAG_MUTABLE`, Android 13+(API 33+)에서는 `RECEIVER_NOT_EXPORTED` 플래그를 사용한다.
- `getDevices()`: 연결된 USB Mass Storage 장치 목록을 반환한다.
- `requestPermissions()`: USB 장치 접근 권한을 요청한다. `vendorId`/`productId`로 장치를 식별한다.
- `checkPermissions()`: USB 장치 접근 권한 보유 여부를 확인한다.
- `readdir()`: 디렉토리가 존재하지 않으면 reject한다.
- `readFile()`: 파일 데이터를 Base64로 인코딩하여 반환한다. 파일이 없으면 `{ data: null }`을 반환한다. 최대 파일 크기는 100MB이다.

## 컴파일러 설정 (패키지 고유)

`tsconfig.json`에 `"lib": ["ESNext", "DOM", "DOM.Iterable"]`이 설정되어 있다. `IndexedDB` 등 브라우저 스토리지 API를 사용하므로 DOM lib가 필수다.
