# @simplysm/capacitor-plugin-usb-storage

Capacitor USB 저장소 플러그인. Android에서 libaums 라이브러리를 통해 USB Mass Storage 장치를 열거하고 파일을 읽는다. 브라우저에서는 IndexedDB 기반 가상 USB 저장소로 에뮬레이션한다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

## API Overview

### USB 저장소 - 공개 API

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

`readFile()`의 반환 타입 `Bytes`는 `@simplysm/core-common`의 타입이다 (`Uint8Array` 별칭).

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

## Browser-Only Testing API (`UsbStorageWeb`)

브라우저 환경에서 테스트 및 개발 목적으로 사용하는 API. `UsbStorage` 정적 파사드로는 접근할 수 없으며, `UsbStorageWeb` 인스턴스를 직접 사용할 때만 호출 가능하다.

### `addVirtualDevice(device)`

가상 USB 장치를 IndexedDB에 등록한다. (테스트/개발용)

```typescript
async addVirtualDevice(device: {
  vendorId: number;
  productId: number;
  deviceName: string;
  manufacturerName: string;
  productName: string;
}): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `device.vendorId` | `number` | USB Vendor ID |
| `device.productId` | `number` | USB Product ID |
| `device.deviceName` | `string` | 장치 이름 |
| `device.manufacturerName` | `string` | 제조사 이름 |
| `device.productName` | `string` | 제품 이름 |

### `addVirtualFile(filter, filePath, data)`

가상 USB 장치에 파일을 추가한다. (테스트/개발용)

```typescript
async addVirtualFile(
  filter: UsbDeviceFilter,
  filePath: string,
  data: Uint8Array,
): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter.vendorId` | `number` | 대상 장치의 USB Vendor ID |
| `filter.productId` | `number` | 대상 장치의 USB Product ID |
| `filePath` | `string` | 파일 경로 (예: `/updates/config.json`) |
| `data` | `Uint8Array` | 파일 바이너리 데이터 |

**주의**: 파일이 위치할 부모 디렉토리가 존재하지 않으면 자동으로 생성된다.

### `addVirtualDirectory(filter, dirPath)`

가상 USB 장치에 디렉토리를 추가한다. (테스트/개발용)

```typescript
async addVirtualDirectory(
  filter: UsbDeviceFilter,
  dirPath: string,
): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter.vendorId` | `number` | 대상 장치의 USB Vendor ID |
| `filter.productId` | `number` | 대상 장치의 USB Product ID |
| `dirPath` | `string` | 생성할 디렉토리 경로 (예: `/updates`) |

---

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

### 브라우저 테스트 - 가상 USB 장치 설정

브라우저 환경에서 테스트할 때, `UsbStorageWeb`을 직접 import하여 가상 USB 저장소를 설정한다. `UsbStorageWeb`은 패키지 공개 API(`index.ts`)에서 export되지 않으므로, 소스 경로를 직접 참조한다.

```typescript
import { UsbStorageWeb } from "@simplysm/capacitor-plugin-usb-storage/src/web/UsbStorageWeb";
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const usbStorageWeb = new UsbStorageWeb();

// 가상 장치 등록
await usbStorageWeb.addVirtualDevice({
  vendorId: 1234,
  productId: 5678,
  deviceName: "Test Device",
  manufacturerName: "Test Manufacturer",
  productName: "Test Product",
});

// 가상 파일 추가
const fileData = new TextEncoder().encode("Hello, USB!");
await usbStorageWeb.addVirtualFile(
  { vendorId: 1234, productId: 5678 },
  "/updates/config.json",
  fileData,
);

// UsbStorage 정적 API로 접근 (Capacitor가 브라우저에서 UsbStorageWeb 인스턴스를 사용)
const files = await UsbStorage.readdir({ vendorId: 1234, productId: 5678 }, "/updates");
const data = await UsbStorage.readFile({ vendorId: 1234, productId: 5678 }, "/updates/config.json");
```
