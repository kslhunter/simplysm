# @simplysm/capacitor-plugin-usb-storage

USB 저장 장치 열거·권한 확인/요청·디렉토리/파일 읽기를 제공하는 Capacitor 플러그인 래퍼.

## 사용 트리거 인덱스

- **UsbStorage** — 앱 코드에서 USB 저장 장치 목록·권한·디렉토리·파일 읽기를 수행할 때 쓰는 정적 메서드 진입점.
- **UsbDeviceFilter** — 권한 확인/요청, 디렉토리 읽기, 파일 읽기에서 대상 USB 장치를 `vendorId`/`productId` 로 지정할 때 쓰는 입력 타입.
- **UsbDeviceInfo** — `UsbStorage.getDevices()` 결과로 연결된 USB 장치 정보를 받고, 이후 호출용 filter 값을 만들 때 쓰는 항목 타입.
- **UsbFileInfo** — `UsbStorage.readdir()` 결과로 디렉토리 안의 파일/디렉토리 항목을 판별할 때 쓰는 항목 타입.
- **UsbStoragePlugin** — Capacitor 플러그인 저수준 계약의 옵션 객체·래핑 반환 타입을 확인해야 할 때 쓰는 인터페이스.

## USB 저장소 접근

### UsbStorage

USB 저장 장치 접근용 정적 메서드 모음. Android 는 libaums 기반 USB Mass Storage 접근, Browser 는 IndexedDB 기반 가상 USB 저장소 에뮬레이션으로 설명되어 있다.

```ts
abstract class UsbStorage {
  static getDevices(): Promise<UsbDeviceInfo[]>;
  static requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

- `getDevices(): Promise<UsbDeviceInfo[]>` — 연결된 USB 장치 목록 조회. 내부 플러그인의 `{ devices }` 결과에서 `devices` 배열만 반환한다.
- `requestPermissions(filter: UsbDeviceFilter): Promise<boolean>` — `filter` 로 지정한 USB 장치 접근 권한 요청. 내부 플러그인의 `{ granted }` 결과에서 `granted` boolean 만 반환한다.
- `checkPermissions(filter: UsbDeviceFilter): Promise<boolean>` — `filter` 로 지정한 USB 장치 접근 권한 보유 여부 확인. 내부 플러그인의 `{ granted }` 결과에서 `granted` boolean 만 반환한다.
- `readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>` — `filter` 장치에서 `dirPath` 디렉토리 내용을 읽는다. 내부 호출은 `{ ...filter, path: dirPath }` 를 넘기고 `{ files }` 결과에서 `files` 배열만 반환한다.
- `readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>` — `filter` 장치에서 `filePath` 파일을 읽는다. 내부 플러그인의 `data` 가 `null` 이면 `undefined`, 아니면 `bytes.fromBase64(data)` 결과를 반환한다.
- `filter: UsbDeviceFilter` — 대상 USB 장치의 `vendorId` 및 `productId`. 권한·읽기 호출에서 대상 장치를 지정한다.
- `dirPath: string` — 읽을 디렉토리 경로. `readdir` 호출에서 플러그인 옵션의 `path` 로 전달된다.
- `filePath: string` — 읽을 파일 경로. `readFile` 호출에서 플러그인 옵션의 `path` 로 전달된다.
- `Bytes | undefined` — 파일 데이터 반환 타입. `undefined` 는 플러그인 파일 데이터가 `null` 인 경우에만 반환된다.

### UsbDeviceFilter

```ts
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

- `vendorId: number` — 대상 USB 장치의 vendor ID. `requestPermissions`/`checkPermissions`/`readdir`/`readFile` 에서 장치 지정에 사용한다.
- `productId: number` — 대상 USB 장치의 product ID. `vendorId` 와 함께 `requestPermissions`/`checkPermissions`/`readdir`/`readFile` 의 장치 지정에 사용한다.

### UsbDeviceInfo

```ts
interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

- `deviceName: string` — 연결된 USB 장치 정보의 장치 이름 필드. `getDevices()` 결과 항목에 포함된다.
- `manufacturerName: string` — 연결된 USB 장치 정보의 제조사 이름 필드. `getDevices()` 결과 항목에 포함된다.
- `productName: string` — 연결된 USB 장치 정보의 제품 이름 필드. `getDevices()` 결과 항목에 포함된다.
- `vendorId: number` — 연결된 USB 장치 정보의 vendor ID. `UsbDeviceFilter.vendorId` 로 넘겨 이후 권한·읽기 호출의 대상 지정에 사용한다.
- `productId: number` — 연결된 USB 장치 정보의 product ID. `UsbDeviceFilter.productId` 로 넘겨 이후 권한·읽기 호출의 대상 지정에 사용한다.

### UsbFileInfo

```ts
interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

- `name: string` — 디렉토리 내용 읽기 결과의 파일/디렉토리 이름 필드. `readdir()` 결과 항목에 포함된다.
- `isDirectory: boolean` — 항목의 디렉토리 여부. `true` 는 디렉토리, `false` 는 디렉토리가 아닌 파일 항목을 뜻한다.

### UsbStoragePlugin

```ts
interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

- `getDevices(): Promise<{ devices: UsbDeviceInfo[] }>` — 연결된 USB 장치 목록을 `devices` 필드로 감싸 반환한다.
- `devices: UsbDeviceInfo[]` — 연결된 USB 장치 정보 배열. `UsbStorage.getDevices()` 는 이 필드만 꺼내 반환한다.
- `requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>` — `options` 장치 접근 권한 요청 결과를 `granted` 필드로 감싸 반환한다.
- `checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>` — `options` 장치 접근 권한 보유 여부를 `granted` 필드로 감싸 반환한다.
- `options: UsbDeviceFilter` — 대상 USB 장치의 `vendorId` 및 `productId`. 권한 확인/요청에서 장치 지정에 사용한다.
- `granted: boolean` — 권한 승인 또는 보유 여부. `UsbStorage.requestPermissions()` 와 `UsbStorage.checkPermissions()` 는 이 필드만 꺼내 반환한다.
- `readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>` — 대상 장치와 디렉토리 경로를 함께 받아 디렉토리 항목 목록을 `files` 필드로 감싸 반환한다.
- `files: UsbFileInfo[]` — 디렉토리 항목 배열. `UsbStorage.readdir()` 는 이 필드만 꺼내 반환한다.
- `readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>` — 대상 장치와 파일 경로를 함께 받아 파일 데이터를 `data` 필드로 감싸 반환한다.
- `path: string` — `readdir` 에서는 읽을 디렉토리 경로, `readFile` 에서는 읽을 파일 경로. `UsbStorage` 래퍼가 `dirPath` 또는 `filePath` 를 이 필드로 바꿔 전달한다.
- `data: string | null` — 파일 데이터의 base64 문자열 또는 `null`. `UsbStorage.readFile()` 은 `null` 을 `undefined` 로, 문자열을 `bytes.fromBase64(data)` 결과로 변환한다.
