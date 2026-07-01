# @simplysm/capacitor-plugin-usb-storage

USB Mass Storage 장치 열거·권한 확인/요청·디렉토리/파일 읽기를 제공하는 Capacitor 플러그인 래퍼. `UsbStorage` 정적 메서드가 소비자 진입점이고, Android 는 libaums 기반 USB Mass Storage 접근, Browser 는 IndexedDB 기반 가상 USB 저장소 에뮬레이션으로 동작한다(클래스 JSDoc 근거).

## 사용 트리거 인덱스

- **UsbStorage** — 앱 코드에서 USB 장치 목록·권한·디렉토리/파일 읽기를 수행할 때 쓰는 정적 메서드 진입점.
- **UsbDeviceFilter** — 권한 확인/요청·디렉토리/파일 읽기에서 대상 장치를 `vendorId`/`productId` 로 지정할 때 쓰는 입력 타입.
- **UsbDeviceInfo** — `UsbStorage.getDevices()` 결과 항목 타입. 이후 호출용 filter 값을 만들 때 쓴다.
- **UsbFileInfo** — `UsbStorage.readdir()` 결과 항목 타입. 디렉토리/파일 항목을 판별할 때 쓴다.
- **UsbStoragePlugin** — 저수준 Capacitor 플러그인 계약. 옵션 객체·래핑 반환 형태를 확인해야 할 때 쓴다(`UsbStorage` 래퍼가 이 계약을 감싼다).

## USB 저장소 접근

### UsbStorage

USB 저장 장치 접근용 정적 메서드 모음(`abstract class`, 인스턴스화 불가). 내부 플러그인의 래핑 결과에서 실제 값만 꺼내 반환한다.

```ts
abstract class UsbStorage {
  static getDevices(): Promise<UsbDeviceInfo[]>;
  static requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

- `getDevices(): Promise<UsbDeviceInfo[]>` — 연결된 USB 장치 목록 조회. 플러그인의 `{ devices }` 에서 `devices` 배열만 반환한다.
- `requestPermissions(filter): Promise<boolean>` — `filter` 장치 접근 권한 요청. 플러그인의 `{ granted }` 에서 `granted` 만 반환하며, `true` 면 승인됨.
- `checkPermissions(filter): Promise<boolean>` — `filter` 장치 접근 권한 보유 여부 확인. 플러그인의 `{ granted }` 에서 `granted` 만 반환하며, `true` 면 권한 보유.
- `readdir(filter, dirPath): Promise<UsbFileInfo[]>` — `filter` 장치의 `dirPath` 디렉토리 내용 읽기. 내부적으로 `{ ...filter, path: dirPath }` 를 넘기고 `{ files }` 에서 `files` 배열만 반환한다.
- `readFile(filter, filePath): Promise<Bytes | undefined>` — `filter` 장치의 `filePath` 파일 읽기. 내부적으로 `{ ...filter, path: filePath }` 를 넘기고, 플러그인 `data` 가 `null` 이면 `undefined`, 아니면 `bytes.fromBase64(data)` 결과를 반환한다.
- `filter: UsbDeviceFilter` — 대상 USB 장치의 `vendorId`/`productId`. 권한·읽기 호출에서 장치를 지정한다.
- `dirPath: string` — 읽을 디렉토리 경로. `readdir` 에서 플러그인 옵션의 `path` 로 전달된다.
- `filePath: string` — 읽을 파일 경로. `readFile` 에서 플러그인 옵션의 `path` 로 전달된다.
- `Bytes` — `@simplysm/core-common` 의 바이트 시퀀스 타입. base64 문자열에서 디코딩한 파일 데이터를 담으며, `undefined` 는 플러그인 데이터가 `null` 일 때만 반환된다.

### UsbDeviceFilter

```ts
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

- `vendorId: number` — 대상 USB 장치의 vendor ID. `requestPermissions`/`checkPermissions`/`readdir`/`readFile` 의 장치 지정에 쓴다.
- `productId: number` — 대상 USB 장치의 product ID. `vendorId` 와 함께 같은 호출들의 장치 지정에 쓴다.

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

- `deviceName: string` — USB 장치 이름. `getDevices()` 결과 항목에 포함된다.
- `manufacturerName: string` — 제조사 이름. `getDevices()` 결과 항목에 포함된다.
- `productName: string` — 제품 이름. `getDevices()` 결과 항목에 포함된다.
- `vendorId: number` — vendor ID. `UsbDeviceFilter.vendorId` 로 넘겨 이후 권한·읽기 호출의 대상 지정에 쓴다.
- `productId: number` — product ID. `UsbDeviceFilter.productId` 로 넘겨 이후 권한·읽기 호출의 대상 지정에 쓴다.

### UsbFileInfo

```ts
interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

- `name: string` — 디렉토리 항목의 파일/디렉토리 이름. `readdir()` 결과 항목에 포함된다.
- `isDirectory: boolean` — 항목의 디렉토리 여부. `true` 면 디렉토리, `false` 면 파일이다.

### UsbStoragePlugin

저수준 Capacitor 플러그인 계약. `registerPlugin<UsbStoragePlugin>("UsbStorage", ...)` 로 등록되며 `UsbStorage` 래퍼가 이 메서드들을 감싸 호출한다. 반환은 모두 단일 필드로 래핑된 객체이다.

```ts
interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

- `getDevices(): Promise<{ devices: UsbDeviceInfo[] }>` — 연결된 장치 목록을 `devices` 필드로 감싸 반환한다.
- `requestPermissions(options): Promise<{ granted: boolean }>` — `options` 장치 권한 요청 결과를 `granted` 필드로 감싸 반환한다.
- `checkPermissions(options): Promise<{ granted: boolean }>` — `options` 장치 권한 보유 여부를 `granted` 필드로 감싸 반환한다.
- `readdir(options): Promise<{ files: UsbFileInfo[] }>` — 장치 filter 와 `path` 를 함께 받아 디렉토리 항목 목록을 `files` 필드로 감싸 반환한다.
- `readFile(options): Promise<{ data: string | null }>` — 장치 filter 와 `path` 를 함께 받아 파일 데이터를 `data` 필드로 감싸 반환한다.
- `options: UsbDeviceFilter` — 권한 확인/요청 대상 장치의 `vendorId`/`productId`.
- `options: UsbDeviceFilter & { path: string }` — `readdir`/`readFile` 입력. filter 에 더해 읽을 경로 `path` 를 포함한다(`UsbStorage` 래퍼가 `dirPath`/`filePath` 를 이 `path` 로 옮겨 넣는다).
- `devices: UsbDeviceInfo[]` — 연결 장치 정보 배열. `UsbStorage.getDevices()` 가 이 필드만 꺼내 반환한다.
- `granted: boolean` — 권한 승인/보유 여부. `UsbStorage.requestPermissions()`·`checkPermissions()` 가 이 필드만 꺼내 반환한다.
- `files: UsbFileInfo[]` — 디렉토리 항목 배열. `UsbStorage.readdir()` 가 이 필드만 꺼내 반환한다.
- `data: string | null` — 파일 데이터의 base64 문자열 또는 `null`. `UsbStorage.readFile()` 이 `null` 을 `undefined` 로, 문자열을 `bytes.fromBase64(data)` 결과로 변환한다.
