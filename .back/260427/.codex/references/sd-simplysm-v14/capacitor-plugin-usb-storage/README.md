# @simplysm/capacitor-plugin-usb-storage

> Capacitor USB 저장소 플러그인. Android에서 `libaums`로 USB Mass Storage 장치를 열거하고 파일을 읽는다. 브라우저에서는 IndexedDB 기반 가상 USB 저장소로 에뮬레이션한다. `@capacitor/core ^7`이 필요하다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

## 하려는 작업 → 읽을 파일

### USB 저장 장치 읽기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 연결된 USB Mass Storage 장치를 찾고 장치 식별값을 얻어야 할 때 | 이 문서의 [`UsbStorage`](#usbstorage) |
| USB 장치 접근 권한을 확인하거나 요청해야 할 때 | 이 문서의 [`UsbStorage`](#usbstorage) |
| USB 장치의 디렉토리 목록을 읽거나 파일 데이터를 가져와야 할 때 | 이 문서의 [`UsbStorage`](#usbstorage) |

### 타입 맞추기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 장치 정보, 장치 필터, 파일 목록 항목 타입을 소비자 코드에 선언해야 할 때 | 이 문서의 [`UsbStorage` 관련 타입](#related-types) |
| Capacitor 플러그인 원시 인터페이스를 타입으로 참조해야 할 때 | 이 문서의 [`UsbStoragePlugin`](#usbstorageplugin) |

### 브라우저 테스트

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 브라우저 환경에서 공개 `UsbStorage` API가 어떤 가상 저장소 위에서 동작하는지 확인해야 할 때 | 이 문서의 [Browser-only testing API](#browser-only-testing-api) |

## `UsbStorage`

> **읽어야 하는 상황**: 앱 코드에서 USB Mass Storage 장치를 열거하고 권한을 확인한 뒤 디렉토리나 파일을 읽어야 할 때. 일반 앱 파일 시스템 접근은 `@simplysm/capacitor-plugin-file-system`을 사용한다.

### When to use

- Android에서 USB Mass Storage 장치의 파일을 읽는다.
- 연결된 USB 장치를 열거하고 `vendorId`와 `productId`를 얻는다.
- 브라우저에서 같은 공개 API를 IndexedDB 기반 가상 저장소로 실행한다.
- USB 장치에 파일을 쓰는 작업에는 사용하지 않는다. 공개 API는 읽기 전용 메서드만 제공한다.

### Signature

```typescript
export abstract class UsbStorage {
  static getDevices(): Promise<UsbDeviceInfo[]>;
  static requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

### Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `getDevices` | static method | `() => Promise<UsbDeviceInfo[]>` | 연결된 USB 장치 정보 배열을 반환한다. |
| `requestPermissions` | static method | `(filter: UsbDeviceFilter) => Promise<boolean>` | `vendorId`와 `productId`로 식별한 장치의 접근 권한을 요청하고 승인 여부를 반환한다. |
| `checkPermissions` | static method | `(filter: UsbDeviceFilter) => Promise<boolean>` | `vendorId`와 `productId`로 식별한 장치의 접근 권한 보유 여부를 반환한다. |
| `readdir` | static method | `(filter: UsbDeviceFilter, dirPath: string) => Promise<UsbFileInfo[]>` | USB 저장 장치의 디렉토리 내용 배열을 반환한다. |
| `readFile` | static method | `(filter: UsbDeviceFilter, filePath: string) => Promise<Bytes \| undefined>` | USB 저장 장치의 파일 데이터를 `Bytes`로 반환한다. 파일이 없거나 Web 가상 장치에서 항목이 파일이 아니면 `undefined`를 반환한다. |

### Usage

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";
import type { UsbDeviceFilter } from "@simplysm/capacitor-plugin-usb-storage";

const devices = await UsbStorage.getDevices();
if (devices.length === 0) {
  throw new Error("USB 장치가 연결되어 있지 않습니다.");
}

const filter: UsbDeviceFilter = {
  vendorId: devices[0].vendorId,
  productId: devices[0].productId,
};

const granted = await UsbStorage.checkPermissions(filter);
if (!granted) {
  const accepted = await UsbStorage.requestPermissions(filter);
  if (!accepted) {
    throw new Error("USB 장치 접근 권한이 거부되었습니다.");
  }
}

const files = await UsbStorage.readdir(filter, "/");
const data = await UsbStorage.readFile(filter, "/updates/config.json");
if (data != null) {
  const text = new TextDecoder().decode(data);
}
```

### Anti-patterns

#### `readFile()` 반환값을 체크하지 않고 디코딩

```typescript
// 잘못된 예: 파일이 없으면 undefined가 반환된다.
const data = await UsbStorage.readFile(filter, "/file.txt");
const text = new TextDecoder().decode(data);

// 올바른 예
const data = await UsbStorage.readFile(filter, "/file.txt");
if (data != null) {
  const text = new TextDecoder().decode(data);
}
```

**근거**: 공개 파사드는 플러그인의 `{ data: null }` 결과를 `undefined`로 변환한다.

#### USB 쓰기 API로 사용

```typescript
// 잘못된 예: UsbStorage에는 writeFile 메서드가 없다.
await UsbStorage.writeFile(filter, "/file.txt", data);
```

**근거**: 공개 `UsbStorage` 클래스는 `getDevices`, `requestPermissions`, `checkPermissions`, `readdir`, `readFile`만 제공한다.

### Related Types

#### `UsbDeviceInfo`

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
| `deviceName` | `string` | Android USB 장치 이름 또는 Web 가상 장치 이름이다. |
| `manufacturerName` | `string` | 제조사 이름이다. |
| `productName` | `string` | 제품 이름이다. |
| `vendorId` | `number` | USB Vendor ID이다. |
| `productId` | `number` | USB Product ID이다. |

#### `UsbDeviceFilter`

```typescript
export interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `vendorId` | `number` | 대상 USB 장치의 Vendor ID이다. |
| `productId` | `number` | 대상 USB 장치의 Product ID이다. |

#### `UsbFileInfo`

```typescript
export interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 디렉토리 안의 파일 또는 하위 디렉토리 이름이다. |
| `isDirectory` | `boolean` | 항목이 디렉토리이면 `true`이다. |

## `UsbStoragePlugin`

> **읽어야 하는 상황**: Capacitor 플러그인 구현 또는 테스트에서 원시 플러그인 계약 타입을 맞춰야 할 때. 일반 앱 코드는 [`UsbStorage`](#usbstorage) 파사드를 사용한다.

### When to use

- Capacitor 네이티브 또는 Web 구현이 맞춰야 하는 원시 메서드 반환 형태를 확인한다.
- 앱 코드에서 USB 저장소를 읽을 때는 이 인터페이스를 직접 호출하지 않고 `UsbStorage`를 사용한다.

### Signature

```typescript
export interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

## Browser-only testing API

> **읽어야 하는 상황**: 브라우저 폴백이 IndexedDB 기반 가상 장치와 파일을 어떻게 구성하는지 확인해야 할 때. 이 API는 패키지 공개 entrypoint에서 export되지 않으므로 소비자 코드는 직접 import하지 않는다.

`UsbStorageWeb`은 `WebPlugin`을 상속하고 `UsbStoragePlugin`을 구현한다. 추가 테스트 메서드는 `UsbStorage` 정적 파사드에 노출되지 않는다.

```typescript
class UsbStorageWeb extends WebPlugin implements UsbStoragePlugin {
  addVirtualDevice(device: {
    vendorId: number;
    productId: number;
    deviceName: string;
    manufacturerName: string;
    productName: string;
  }): Promise<void>;

  addVirtualFile(filter: UsbDeviceFilter, filePath: string, data: Uint8Array): Promise<void>;

  addVirtualDirectory(filter: UsbDeviceFilter, dirPath: string): Promise<void>;
}
```

## 이 패키지를 쓰지 말아야 할 때

- 앱 내부 파일 시스템이나 일반 디렉토리를 읽고 써야 할 때는 `@simplysm/capacitor-plugin-file-system`을 사용한다.
- USB 저장 장치에 파일을 써야 할 때는 이 패키지를 사용하지 않는다. 공개 API는 파일 쓰기 메서드를 제공하지 않는다.
