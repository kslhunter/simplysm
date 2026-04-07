# @simplysm/capacitor-plugin-usb-storage

Capacitor USB 저장소 플러그인. Android에서 libaums 라이브러리를 통해 USB Mass Storage 장치를 열거하고 파일을 읽는다. 브라우저에서는 IndexedDB 기반 가상 USB 저장소로 에뮬레이션한다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

## API Overview

### USB 저장소

| API | Type | Description |
|-----|------|-------------|
| `UsbDeviceInfo` | interface | USB 장치 정보 (이름, 제조사, vendorId 등) |
| `UsbDeviceFilter` | interface | USB 장치 필터 (vendorId + productId) |
| `UsbFileInfo` | interface | USB 저장소 내 파일/디렉토리 정보 |
| `UsbStoragePlugin` | interface | Capacitor 네이티브 플러그인 인터페이스 |
| `UsbStorage` | abstract class | USB 저장 장치 접근 정적 파사드 |

---

## `UsbDeviceInfo`

연결된 USB 장치 정보를 나타내는 인터페이스.

```typescript
export interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `deviceName` | `string` | 장치 이름 |
| `manufacturerName` | `string` | 제조사 이름 |
| `productName` | `string` | 제품 이름 |
| `vendorId` | `number` | USB Vendor ID |
| `productId` | `number` | USB Product ID |

## `UsbDeviceFilter`

USB 장치를 식별하기 위한 필터 인터페이스. 모든 장치 접근 메서드의 첫 번째 파라미터로 사용된다.

```typescript
export interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `vendorId` | `number` | USB Vendor ID |
| `productId` | `number` | USB Product ID |

## `UsbFileInfo`

USB 저장소 내 파일 또는 디렉토리 정보를 나타내는 인터페이스.

```typescript
export interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 파일 또는 디렉토리 이름 |
| `isDirectory` | `boolean` | 디렉토리 여부 |

## `UsbStoragePlugin`

Capacitor 네이티브 플러그인 인터페이스. 직접 사용하지 않고 `UsbStorage` 파사드를 통해 접근한다.

```typescript
export interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getDevices` | 없음 | `Promise<{ devices: UsbDeviceInfo[] }>` | 연결된 USB 장치 목록 조회 |
| `requestPermissions` | `UsbDeviceFilter` | `Promise<{ granted: boolean }>` | USB 장치 접근 권한 요청 |
| `checkPermissions` | `UsbDeviceFilter` | `Promise<{ granted: boolean }>` | USB 장치 접근 권한 확인 |
| `readdir` | `UsbDeviceFilter & { path }` | `Promise<{ files: UsbFileInfo[] }>` | 디렉토리 내용 읽기 |
| `readFile` | `UsbDeviceFilter & { path }` | `Promise<{ data: string \| null }>` | 파일 읽기 (Base64). 파일이 없으면 `null` |

## `UsbStorage`

USB 저장 장치 접근 정적 파사드 클래스. Android에서는 libaums를 통해 USB Mass Storage에 접근하고, 브라우저에서는 IndexedDB 기반으로 에뮬레이션된다.

```typescript
export abstract class UsbStorage {
  static async getDevices(): Promise<UsbDeviceInfo[]>;
  static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getDevices` | 없음 | `Promise<UsbDeviceInfo[]>` | 연결된 USB Mass Storage 장치 목록 조회 |
| `requestPermissions` | `filter: UsbDeviceFilter` | `Promise<boolean>` | USB 장치 접근 권한 요청. 승인 여부 반환 |
| `checkPermissions` | `filter: UsbDeviceFilter` | `Promise<boolean>` | USB 장치 접근 권한 보유 여부 확인 |
| `readdir` | `filter: UsbDeviceFilter, dirPath: string` | `Promise<UsbFileInfo[]>` | USB 저장 장치의 디렉토리 내용 읽기 |
| `readFile` | `filter: UsbDeviceFilter, filePath: string` | `Promise<Bytes \| undefined>` | USB 저장 장치에서 파일 읽기. 파일이 없으면 `undefined` 반환. 최대 100MB |

## Usage Examples

### USB 장치 열거 및 권한 요청

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const devices = await UsbStorage.getDevices();
if (devices.length > 0) {
  const device = devices[0];
  const filter = { vendorId: device.vendorId, productId: device.productId };

  const granted = await UsbStorage.checkPermissions(filter);
  if (!granted) {
    await UsbStorage.requestPermissions(filter);
  }
}
```

### USB 저장소 파일 읽기

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";
import type { UsbDeviceFilter } from "@simplysm/capacitor-plugin-usb-storage";

const filter: UsbDeviceFilter = { vendorId: 1234, productId: 5678 };

// 디렉토리 목록 조회
const files = await UsbStorage.readdir(filter, "/updates");

// 파일 읽기 (Bytes | undefined 반환)
const data = await UsbStorage.readFile(filter, "/updates/config.json");
if (data != null) {
  const text = new TextDecoder().decode(data);
}
```
