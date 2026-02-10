# @simplysm/capacitor-plugin-usb-storage

USB Mass Storage 장치에 접근하기 위한 Capacitor 플러그인이다. Android에서는 [libaums](https://github.com/magnusja/libaums) 라이브러리를 통해 USB 저장장치의 파일시스템에 직접 접근하며, 웹 환경에서는 IndexedDB 기반의 가상 USB 저장소를 제공하여 개발 및 테스트를 지원한다.

## 설치

```bash
pnpm add @simplysm/capacitor-plugin-usb-storage
npx cap sync
```

### 피어 의존성

| 패키지 | 버전 |
|--------|------|
| `@capacitor/core` | `^7.4.4` |

### 내부 의존성

| 패키지 | 설명 |
|--------|------|
| `@simplysm/core-common` | Base64 변환, `Bytes` 타입 등 공통 유틸리티 |

## 지원 플랫폼

| 플랫폼 | 지원 여부 | 구현 방식 |
|--------|-----------|-----------|
| Android | 지원 | libaums 0.9.1을 통한 USB Mass Storage 접근 |
| Web | 지원 (에뮬레이션) | IndexedDB 기반 가상 USB 저장소 |
| iOS | 미지원 | -- |

### Android 요구사항

- `compileSdk`: 35
- `minSdk`: 23 (Android 6.0 이상)
- 파일 최대 읽기 크기: 100MB

## 주요 API

### UsbStorage (정적 클래스)

플러그인의 주요 진입점이다. 모든 메서드는 정적(static)이며 비동기로 동작한다.

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `getDevices()` | `Promise<IUsbDeviceInfo[]>` | 연결된 USB 장치 목록을 조회한다 |
| `requestPermission(filter)` | `Promise<boolean>` | USB 장치 접근 권한을 요청한다 |
| `hasPermission(filter)` | `Promise<boolean>` | USB 장치 접근 권한 보유 여부를 확인한다 |
| `readdir(filter, dirPath)` | `Promise<IUsbFileInfo[]>` | 디렉토리 내 파일/폴더 목록을 읽는다 |
| `read(filter, filePath)` | `Promise<Bytes \| undefined>` | 파일 내용을 바이너리로 읽는다 |

### 인터페이스

#### IUsbDeviceInfo

USB 장치 정보를 나타낸다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `deviceName` | `string` | 장치 이름 (시스템 경로) |
| `manufacturerName` | `string` | 제조사 이름 |
| `productName` | `string` | 제품 이름 |
| `vendorId` | `number` | USB Vendor ID |
| `productId` | `number` | USB Product ID |

#### IUsbDeviceFilter

특정 USB 장치를 식별하기 위한 필터이다. `vendorId`와 `productId` 조합으로 장치를 지정한다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `vendorId` | `number` | USB Vendor ID |
| `productId` | `number` | USB Product ID |

#### IUsbFileInfo

파일 또는 디렉토리 정보를 나타낸다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `name` | `string` | 파일/디렉토리 이름 |
| `isDirectory` | `boolean` | 디렉토리 여부 |

## 사용 예시

### 장치 목록 조회 및 권한 요청

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

// 연결된 USB 장치 목록 조회
const devices = await UsbStorage.getDevices();
console.log("연결된 장치:", devices);

if (devices.length > 0) {
  const device = devices[0];
  const filter = { vendorId: device.vendorId, productId: device.productId };

  // 권한 확인
  const hasPerm = await UsbStorage.hasPermission(filter);
  if (!hasPerm) {
    // 권한 요청 (Android에서 시스템 다이얼로그 표시)
    const granted = await UsbStorage.requestPermission(filter);
    if (!granted) {
      console.log("USB 장치 접근 권한이 거부되었습니다.");
      return;
    }
  }
}
```

### 디렉토리 내용 읽기

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const filter = { vendorId: 1234, productId: 5678 };

// 루트 디렉토리 읽기
const rootFiles = await UsbStorage.readdir(filter, "/");
for (const file of rootFiles) {
  const type = file.isDirectory ? "[DIR]" : "[FILE]";
  console.log(`${type} ${file.name}`);
}

// 하위 디렉토리 읽기
const subFiles = await UsbStorage.readdir(filter, "/Documents");
```

### 파일 읽기

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const filter = { vendorId: 1234, productId: 5678 };

// 파일을 바이너리(Bytes)로 읽기
const data = await UsbStorage.read(filter, "/data/config.json");
if (data != null) {
  // Bytes를 문자열로 변환
  const text = new TextDecoder().decode(data);
  console.log("파일 내용:", text);
}
```

### 전체 흐름 예시

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";
import type { IUsbDeviceFilter } from "@simplysm/capacitor-plugin-usb-storage";

async function readUsbFile(filePath: string): Promise<string | undefined> {
  // 1. 장치 검색
  const devices = await UsbStorage.getDevices();
  if (devices.length === 0) {
    throw new Error("USB 장치가 연결되어 있지 않습니다.");
  }

  const device = devices[0];
  const filter: IUsbDeviceFilter = {
    vendorId: device.vendorId,
    productId: device.productId,
  };

  // 2. 권한 확보
  const hasPerm = await UsbStorage.hasPermission(filter);
  if (!hasPerm) {
    const granted = await UsbStorage.requestPermission(filter);
    if (!granted) {
      throw new Error("USB 장치 접근 권한이 필요합니다.");
    }
  }

  // 3. 파일 읽기
  const data = await UsbStorage.read(filter, filePath);
  if (data == null) {
    return undefined;
  }

  return new TextDecoder().decode(data);
}
```

## 웹 에뮬레이션 (개발/테스트용)

웹 환경에서는 `UsbStorageWeb` 클래스가 자동으로 사용되며, IndexedDB 기반의 가상 USB 저장소를 제공한다. 권한 요청은 항상 승인으로 처리된다.

`UsbStorageWeb`은 개발 및 테스트 목적으로 가상 장치와 파일을 추가할 수 있는 메서드를 제공한다.

| 메서드 | 설명 |
|--------|------|
| `addVirtualDevice(device)` | 가상 USB 장치를 등록한다 |
| `addVirtualFile(filter, filePath, data)` | 가상 장치에 파일을 추가한다 (상위 디렉토리 자동 생성) |
| `addVirtualDirectory(filter, dirPath)` | 가상 장치에 디렉토리를 추가한다 |

### 웹 에뮬레이션 사용 예시

```typescript
import { UsbStorageWeb } from "@simplysm/capacitor-plugin-usb-storage/dist/web/UsbStorageWeb";

const web = new UsbStorageWeb();

// 가상 장치 추가
await web.addVirtualDevice({
  vendorId: 1234,
  productId: 5678,
  deviceName: "Virtual USB",
  manufacturerName: "Test Manufacturer",
  productName: "Test USB Drive",
});

const filter = { vendorId: 1234, productId: 5678 };

// 가상 파일 추가
const content = new TextEncoder().encode("Hello, USB!");
await web.addVirtualFile(filter, "/test/hello.txt", content);

// 가상 디렉토리 추가
await web.addVirtualDirectory(filter, "/test/subdir");
```

## Android 네이티브 구현 상세

Android 네이티브 레이어는 `libaums` 라이브러리를 사용하여 USB Mass Storage 프로토콜을 직접 처리한다. 주요 동작은 다음과 같다.

- **장치 검색**: `UsbMassStorageDevice.getMassStorageDevices()`로 연결된 USB Mass Storage 장치를 조회한다.
- **권한 관리**: Android의 `UsbManager`를 통해 USB 장치 접근 권한을 요청하고 확인한다. Android 12(API 31) 이상에서는 `PendingIntent.FLAG_MUTABLE`을 사용하며, Android 13(API 33) 이상에서는 `RECEIVER_NOT_EXPORTED` 플래그를 적용한다.
- **파일시스템 접근**: 첫 번째 파티션의 파일시스템을 마운트하여 디렉토리 탐색 및 파일 읽기를 수행한다.
- **데이터 전송**: 파일 데이터는 Base64로 인코딩하여 JavaScript 레이어로 전달된다.

## 라이선스

MIT

