# @simplysm/capacitor-plugin-usb-storage

USB Mass Storage 접근용 Capacitor 플러그인 (Android: libaums, Browser: IndexedDB 가상 USB 에뮬레이션).

## 사용 트리거 인덱스

- **`UsbStorage`** — 정적 메서드로 장치 목록·권한·디렉토리·파일 읽기. USB 저장 장치에서 데이터를 가져올 때.
- **`UsbDeviceInfo` / `UsbDeviceFilter` / `UsbFileInfo`** — 인자·반환 타입. 호출부 타입 선언에.
- **`UsbStoragePlugin`** — 원시 Capacitor 플러그인 인터페이스. `UsbStorage` 래퍼로 충분하면 직접 사용 X.

## UsbStorage

모든 메서드 `static async`. 장치 식별은 `{ vendorId, productId }` (`UsbDeviceFilter`)로 한다.

```ts
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const devices = await UsbStorage.getDevices();                 // UsbDeviceInfo[]
const filter = { vendorId: devices[0].vendorId, productId: devices[0].productId };

if (!(await UsbStorage.checkPermissions(filter))) {
  if (!(await UsbStorage.requestPermissions(filter))) return;  // boolean
}

const files = await UsbStorage.readdir(filter, "/");           // UsbFileInfo[]
const data = await UsbStorage.readFile(filter, "/a.txt");      // Bytes | undefined
```

- `getDevices()` — 연결된 USB 장치 전체 반환.
- `requestPermissions(filter)` / `checkPermissions(filter)` — 권한 승인/보유 여부 `boolean`.
- `readdir(filter, dirPath)` — 디렉토리 항목 목록 (`name`, `isDirectory`).
- `readFile(filter, filePath)` — 파일 바이트. 없으면 `undefined`. 내부에서 base64 → `Bytes`(@simplysm/core-common) 변환.

## 타입

- `UsbDeviceInfo` — `deviceName`, `manufacturerName`, `productName`, `vendorId`, `productId`.
- `UsbDeviceFilter` — `vendorId`, `productId`.
- `UsbFileInfo` — `name`, `isDirectory`.
- `UsbStoragePlugin` — Capacitor `registerPlugin` 원시 인터페이스. 메서드 반환이 `{ devices }`/`{ granted }`/`{ files }`/`{ data: string | null }` 형태의 base64 raw 응답.
