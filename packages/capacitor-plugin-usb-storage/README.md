# @simplysm/capacitor-plugin-usb-storage

Capacitor USB Mass Storage 플러그인. Android에서 USB 저장장치를 열거하고, 권한을 관리하며, 파일을 읽는다.

## 설치

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

**의존성:** `@simplysm/core-common` (Bytes, bytes 유틸), `@simplysm/core-browser` (IndexedDbStore, IndexedDbVirtualFs)
**Peer:** `@capacitor/core` ^7.4.4
**Android 네이티브:** `me.jahnen:libaums:core:0.9.1` (USB Mass Storage 라이브러리)

## Export 목록

```typescript
// index.ts
export type { UsbStoragePlugin, UsbDeviceInfo, UsbDeviceFilter, UsbFileInfo } from "./UsbStoragePlugin";
export { UsbStorage } from "./UsbStorage";
```

## 주요 사용법

### 기기 목록 조회

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const devices = await UsbStorage.getDevices();
// UsbDeviceInfo[] = [{
//   deviceName: "USB Storage",
//   manufacturerName: "SanDisk",
//   productName: "Ultra",
//   vendorId: 1234,
//   productId: 5678,
// }]
```

### 권한 관리

기기별로 `vendorId`/`productId` 조합으로 권한을 확인/요청한다.

```typescript
import type { UsbDeviceFilter } from "@simplysm/capacitor-plugin-usb-storage";

const filter: UsbDeviceFilter = { vendorId: 1234, productId: 5678 };

const granted = await UsbStorage.checkPermissions(filter); // boolean
if (!granted) {
  const result = await UsbStorage.requestPermissions(filter); // boolean
}
```

### 디렉토리 읽기

```typescript
const filter: UsbDeviceFilter = { vendorId: 1234, productId: 5678 };

const files = await UsbStorage.readdir(filter, "/documents");
// UsbFileInfo[] = [{ name: "report.pdf", isDirectory: false }]
```

### 파일 읽기

```typescript
import type { Bytes } from "@simplysm/core-common";

const filter: UsbDeviceFilter = { vendorId: 1234, productId: 5678 };
const data: Bytes | undefined = await UsbStorage.readFile(filter, "/documents/report.pdf");
// 파일이 없으면 undefined, 있으면 Bytes (Uint8Array)
```

Android에서 최대 파일 크기는 100MB이다.

## API 레퍼런스

### `UsbStorage` (abstract class, static 메서드)

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `getDevices` | `() => Promise<UsbDeviceInfo[]>` | 연결된 USB 기기 목록 |
| `checkPermissions` | `(filter: UsbDeviceFilter) => Promise<boolean>` | 권한 확인 |
| `requestPermissions` | `(filter: UsbDeviceFilter) => Promise<boolean>` | 권한 요청 (다이얼로그 표시) |
| `readdir` | `(filter: UsbDeviceFilter, dirPath: string) => Promise<UsbFileInfo[]>` | 디렉토리 목록 |
| `readFile` | `(filter: UsbDeviceFilter, filePath: string) => Promise<Bytes \| undefined>` | 파일 읽기 (base64 디코딩) |

### `UsbDeviceFilter` (interface)

```typescript
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

### `UsbDeviceInfo` (interface)

```typescript
interface UsbDeviceInfo {
  deviceName: string;       // USB 디바이스 경로명
  manufacturerName: string; // 제조사
  productName: string;      // 제품명
  vendorId: number;         // USB Vendor ID
  productId: number;        // USB Product ID
}
```

### `UsbFileInfo` (interface)

```typescript
interface UsbFileInfo {
  name: string;        // 파일/디렉토리 이름
  isDirectory: boolean;
}
```

## 플랫폼 지원

| 기능 | Android | Web |
|------|---------|-----|
| 기기 열거 | UsbManager + libaums | 가상 기기 (IndexedDB) |
| 권한 관리 | USB 권한 다이얼로그 (PendingIntent) | 항상 granted |
| 디렉토리 읽기 | libaums `UsbFile.listFiles()` | IndexedDB 가상 스토리지 |
| 파일 읽기 | libaums `UsbFileInputStream` (최대 100MB) | IndexedDB base64 데이터 |

## Web 테스트용 가상 기기

`UsbStorageWeb` 클래스에는 개발/테스트용 메서드가 있다. Capacitor의 `registerPlugin`을 통해 Web 환경에서 자동으로 사용된다.

```typescript
import type { UsbDeviceFilter } from "@simplysm/capacitor-plugin-usb-storage";

// Web 환경에서만 UsbStorageWeb 인스턴스의 메서드를 직접 호출해야 함
// 일반적으로 Capacitor plugin 등록 시 자동으로 Web 구현체가 사용됨

// 가상 기기 추가
await usbStorageWeb.addVirtualDevice({
  vendorId: 1234,
  productId: 5678,
  deviceName: "Test USB",
  manufacturerName: "Test",
  productName: "Drive",
});

// 가상 파일 추가
const filter: UsbDeviceFilter = { vendorId: 1234, productId: 5678 };
await usbStorageWeb.addVirtualFile(filter, "/test.txt", new Uint8Array([72, 101, 108, 108, 111]));

// 가상 디렉토리 추가
await usbStorageWeb.addVirtualDirectory(filter, "/docs");
```

Web 가상 스토리지는 `VirtualUsbStorage` 클래스를 사용하며, IndexedDB(`capacitor_usb_virtual_storage`)에 기기와 파일 데이터를 저장한다.
- 스토어: `devices` (keyPath: `key`, key = `vendorId:productId`), `files` (keyPath: `fullKey`, fullKey = `deviceKey:path`)

## Android 네이티브 구현

- **패키지:** `kr.co.simplysm.capacitor.usbstorage`
- **플러그인명:** `UsbStorage`
- **라이브러리:** `me.jahnen:libaums:core:0.9.1`
- `getDevices`: `UsbMassStorageDevice.getMassStorageDevices(context)`
- `requestPermissions`: `UsbManager.requestPermission` + BroadcastReceiver 콜백 (Android 13+: `RECEIVER_NOT_EXPORTED`, Android 12+: `PendingIntent.FLAG_MUTABLE`)
- `readdir`/`readFile`: 기기 init -> 첫 번째 파티션의 FileSystem -> `root.search(path)` -> 작업 -> `device.close()`
- `readFile`: `UsbFileInputStream`으로 읽고 base64 인코딩, 최대 100MB 제한
- **퍼미션 액션:** `kr.co.simplysm.capacitor.usbstorage.USB_PERMISSION`
