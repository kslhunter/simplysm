# @simplysm/capacitor-plugin-usb-storage

> Capacitor USB 저장소 플러그인. Android에서 libaums 라이브러리를 통해 USB Mass Storage 장치를 열거하고 파일을 읽는다. 브라우저에서는 IndexedDB 기반 가상 USB 저장소로 에뮬레이션한다. `@capacitor/core ^7` peerDependency.

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| USB 장치 열거 및 권한 요청 | 이 문서의 `UsbStorage` 섹션 |
| USB 장치에서 파일 읽기 | 이 문서의 `UsbStorage.readFile` |
| 브라우저에서 가상 USB 테스트 | 이 문서의 `Browser-Only Testing API` 섹션 |

## API Overview

### `UsbStorage`

USB 저장 장치 접근 정적 파사드 클래스. 모든 장치 접근 메서드는 `UsbDeviceFilter`(`vendorId` + `productId`)로 대상 장치를 식별한다.

#### When to use

- ✅ Android에서 USB Mass Storage 장치의 파일을 읽을 때
- ✅ 연결된 USB 장치를 열거하고 권한을 관리할 때
- ❌ 일반 파일 시스템 접근 → [`@simplysm/capacitor-plugin-file-system`](../capacitor-plugin-file-system/README.md)
- ❌ USB 장치에 파일 쓰기 → 현재 지원하지 않는다 (읽기 전용)

#### Signature

```typescript
export abstract class UsbStorage {
  static async getDevices(): Promise<UsbDeviceInfo[]>;
  static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

#### Members

| Member | Kind | Return | Description |
|--------|------|--------|-------------|
| `getDevices` | static method | `Promise<UsbDeviceInfo[]>` | 연결된 USB Mass Storage 장치 목록 조회 |
| `requestPermissions` | static method | `Promise<boolean>` | USB 장치 접근 권한 요청. 승인 여부 반환 |
| `checkPermissions` | static method | `Promise<boolean>` | USB 장치 접근 권한 보유 여부 확인 |
| `readdir` | static method | `Promise<UsbFileInfo[]>` | USB 저장 장치의 디렉토리 내용 읽기 |
| `readFile` | static method | `Promise<Bytes \| undefined>` | USB 저장 장치에서 파일 읽기. 파일이 없으면 `undefined`. 최대 100MB |

`Bytes`는 `@simplysm/core-common`의 타입이다 (`Uint8Array` 별칭).

#### Usage

##### 최소 예제

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const devices = await UsbStorage.getDevices();
if (devices.length > 0) {
  const { vendorId, productId } = devices[0];
  const files = await UsbStorage.readdir({ vendorId, productId }, "/");
}
```

##### 전형 예제 — 권한 확인 후 파일 읽기

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

const data = await UsbStorage.readFile(filter, "/updates/config.json");
if (data != null) {
  const text = new TextDecoder().decode(data);
}
```

#### 🚫 Anti-patterns

##### `readFile()` 반환값을 null 체크 없이 사용

```typescript
// ❌ 파일이 없으면 undefined이므로 decode 실패
const data = await UsbStorage.readFile(filter, "/file.txt");
const text = new TextDecoder().decode(data); // TypeError if undefined

// ✅ null 체크 후 사용
const data = await UsbStorage.readFile(filter, "/file.txt");
if (data != null) {
  const text = new TextDecoder().decode(data);
}
```

**근거**: USB 장치에서 파일이 없거나 읽기 실패 시 `undefined`를 반환한다. throw하지 않으므로 반드시 null 체크가 필요하다.

---

### `UsbDeviceInfo`

연결된 USB 장치 정보 인터페이스.

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

---

### `UsbDeviceFilter`

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

---

### `UsbFileInfo`

USB 저장소 내 파일 또는 디렉토리 정보 인터페이스.

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

---

### `UsbStoragePlugin`

Capacitor 네이티브 플러그인 인터페이스. 직접 사용하지 않고 `UsbStorage` 파사드를 통해 접근한다. 타입 참조 목적으로만 export된다.

```typescript
export interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

---

## Browser-Only Testing API (`UsbStorageWeb`)

브라우저 환경에서 테스트 및 개발 목적으로 사용하는 API. `UsbStorage` 정적 파사드로는 접근할 수 없으며, `UsbStorageWeb` 인스턴스를 직접 사용할 때만 호출 가능하다. `UsbStorageWeb`은 패키지 공개 API(`index.ts`)에서 export되지 않으므로 소스 경로를 직접 참조해야 한다.

### `addVirtualDevice(device)`

가상 USB 장치를 IndexedDB에 등록한다.

```typescript
async addVirtualDevice(device: {
  vendorId: number;
  productId: number;
  deviceName: string;
  manufacturerName: string;
  productName: string;
}): Promise<void>
```

### `addVirtualFile(filter, filePath, data)`

가상 USB 장치에 파일을 추가한다. 부모 디렉토리가 없으면 자동 생성된다.

```typescript
async addVirtualFile(filter: UsbDeviceFilter, filePath: string, data: Uint8Array): Promise<void>
```

### `addVirtualDirectory(filter, dirPath)`

가상 USB 장치에 디렉토리를 추가한다.

```typescript
async addVirtualDirectory(filter: UsbDeviceFilter, dirPath: string): Promise<void>
```

### 테스트 설정 예시

```typescript
import { UsbStorageWeb } from "@simplysm/capacitor-plugin-usb-storage/src/web/UsbStorageWeb";

const web = new UsbStorageWeb();
await web.addVirtualDevice({
  vendorId: 1234,
  productId: 5678,
  deviceName: "Test Device",
  manufacturerName: "Test Manufacturer",
  productName: "Test Product",
});

const fileData = new TextEncoder().encode("Hello, USB!");
await web.addVirtualFile({ vendorId: 1234, productId: 5678 }, "/data/config.json", fileData);
```

## 이 패키지를 쓰지 말아야 할 때

- 일반 파일 시스템 접근 → [`@simplysm/capacitor-plugin-file-system`](../capacitor-plugin-file-system/README.md)
- USB 장치에 파일 쓰기 → 현재 미지원. 읽기 전용 접근만 제공한다.
