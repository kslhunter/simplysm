# @simplysm/capacitor-plugin-usb-storage

USB Mass Storage 접근용 Capacitor 플러그인 (Android: libaums, Browser: IndexedDB 가상 USB 에뮬레이션).

## 사용 트리거 인덱스

- **`UsbStorage`** — 정적 메서드로 장치 목록·권한·디렉토리·파일 읽기. USB 저장 장치에서 데이터를 가져올 때.
- **`UsbDeviceInfo` / `UsbDeviceFilter` / `UsbFileInfo`** — 인자·반환 타입. 호출부 타입 선언에.
- **`UsbStoragePlugin`** — 원시 Capacitor 플러그인 인터페이스. `UsbStorage` 래퍼로 충분하면 직접 사용 X.

## UsbStorage

모든 메서드 `static async`. 장치 식별은 `{ vendorId, productId }` (`UsbDeviceFilter`) 로 한다.

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
- `requestPermissions(filter)` — 해당 장치 접근 권한 요청. `true` = 사용자가 승인, `false` = 거부. 사용자 인터랙션 유발.
- `checkPermissions(filter)` — 현재 권한 보유 여부 조회. 인터랙션 없음. `true` 면 곧바로 read 호출 가능.
- `readdir(filter, dirPath)` — 디렉토리 항목 목록 (`UsbFileInfo[]`).
- `readFile(filter, filePath)` — 파일 바이트. 없으면 `undefined`. 내부에서 base64 → `Bytes`(@simplysm/core-common) 변환.

## 타입

`UsbDeviceInfo` — `getDevices()` 반환 원소.
- `deviceName` — OS 가 부여한 장치 노드 이름 (예: `/dev/bus/usb/001/002`).
- `manufacturerName` — 제조사 문자열.
- `productName` — 제품명 문자열.
- `vendorId` / `productId` — USB VID/PID 정수. 다른 메서드의 `filter` 로 그대로 사용.

`UsbDeviceFilter` — 장치 식별 인자. `vendorId`, `productId` 두 정수만.

`UsbFileInfo` — `readdir` 반환 원소.
- `name` — 항목 이름 (디렉토리 내 상대명, 경로 X).
- `isDirectory` — `true` = 하위 디렉토리(다시 `readdir` 호출 대상), `false` = 파일(`readFile` 호출 대상).

`UsbStoragePlugin` — Capacitor `registerPlugin` 원시 인터페이스. 메서드 반환이 `{ devices }`/`{ granted }`/`{ files }`/`{ data: string | null }` 형태의 base64 raw 응답. `UsbStorage` 가 이를 풀어 `Bytes`·`boolean` 등으로 변환해 노출.
