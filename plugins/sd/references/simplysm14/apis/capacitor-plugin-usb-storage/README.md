# @simplysm/capacitor-plugin-usb-storage

USB Mass Storage 장치 열거·권한 확인/요청·디렉토리/파일 읽기를 제공하는 Capacitor 플러그인 래퍼. Android 는 libaums 라이브러리를 통한 USB Mass Storage 접근, Browser 는 IndexedDB 기반 가상 USB 저장소 에뮬레이션으로 동작.

## 사용 트리거 인덱스

- **UsbStorage** — 앱 코드에서 USB 장치 목록 조회, 권한 확인/요청, 디렉토리/파일 읽기를 수행할 때 쓰는 정적 메서드 진입점.
- **UsbDeviceFilter** — USB 장치 권한 확인/요청·디렉토리/파일 읽기 시 대상 장치를 식별할 때 쓰는 입력 타입.
- **UsbDeviceInfo** — `UsbStorage.getDevices()` 결과에서 연결 장치 정보를 받아, `UsbDeviceFilter` 값을 구성하거나 장치 목록을 표시할 때 쓰는 타입.
- **UsbFileInfo** — `UsbStorage.readdir()` 결과에서 디렉토리/파일 항목 정보를 받아, 파일 여부를 판별하거나 항목을 표시할 때 쓰는 타입.
- **UsbStoragePlugin** — 저수준 Capacitor 플러그인 계약. `UsbStorage` 래퍼가 감싸는 플러그인 메서드 시그니처와 반환 포맷을 확인해야 할 때 쓰는 타입.

## USB 저장소 접근

### UsbStorage

USB 저장 장치 접근용 정적 메서드 모음. `abstract class` 로 인스턴스화 불가.

```ts
abstract class UsbStorage {
  static getDevices(): Promise<UsbDeviceInfo[]>;
  static requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

- `getDevices(): Promise<UsbDeviceInfo[]>` — 현재 연결된 USB 장치 목록 조회. 빈 배열은 연결된 장치가 없음을 의미.
- `requestPermissions(filter): Promise<boolean>` — `filter` 로 지정한 USB 장치에 대한 접근 권한을 요청. 반환 `true` 면 권한 승인, `false` 면 거부됨. Android 에서는 시스템 권한 다이얼로그를 표시, Browser 에서는 항상 `true` 반환.
- `checkPermissions(filter): Promise<boolean>` — `filter` 로 지정한 USB 장치에 대한 권한 보유 여부 확인. 반환 `true` 면 권한 보유, `false` 면 미보유 또는 미요청.
- `readdir(filter, dirPath): Promise<UsbFileInfo[]>` — `filter` 로 지정한 USB 장치의 `dirPath` 디렉토리 내용 읽기. 빈 배열은 디렉토리가 비어있거나 경로가 존재하지 않음을 의미. 경로는 슬래시(`/`) 구분자 사용.
- `readFile(filter, filePath): Promise<Bytes | undefined>` — `filter` 로 지정한 USB 장치의 `filePath` 파일 데이터 읽기. 반환 `Bytes` 는 파일 바이트 시퀀스이며, `undefined` 는 파일이 존재하지 않거나 읽기 실패를 의미. 반환 데이터는 `@simplysm/core-common` 의 `Bytes` 타입.
- `filter: UsbDeviceFilter` — 대상 USB 장치. `getDevices()` 결과의 `vendorId`·`productId` 를 사용해 구성.
- `dirPath: string` — 읽을 디렉토리 경로. 슬래시(`/`) 구분자 사용. 루트는 `"/"`.
- `filePath: string` — 읽을 파일 경로. 슬래시(`/`) 구분자 사용.

### UsbDeviceFilter

```ts
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

- `vendorId: number` — 대상 USB 장치의 Vendor ID (십진 정수). `UsbStorage` 메서드의 장치 지정에 필수.
- `productId: number` — 대상 USB 장치의 Product ID (십진 정수). `vendorId` 와 함께 같은 메서드들의 장치 지정에 필수.

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

- `deviceName: string` — USB 장치 이름. Android 에서는 `libaums` 로부터 읽은 장치명.
- `manufacturerName: string` — 제조사 이름. USB 기술 사양에 정의된 제조사 문자열.
- `productName: string` — 제품 모델명. USB 기술 사양에 정의된 제품명 문자열.
- `vendorId: number` — 장치의 Vendor ID. `UsbDeviceFilter` 를 구성해 권한·읽기 호출에 전달.
- `productId: number` — 장치의 Product ID. `vendorId` 와 함께 `UsbDeviceFilter` 를 구성해 권한·읽기 호출에 전달.

### UsbFileInfo

```ts
interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

- `name: string` — 디렉토리 항목의 이름 (파일명 또는 폴더명). 경로가 아니라 이름만 포함.
- `isDirectory: boolean` — 항목이 디렉토리인지 여부. `true` 면 디렉토리, `false` 면 파일.

### UsbStoragePlugin

저수준 Capacitor 플러그인 계약. `UsbStorage` 래퍼가 이 인터페이스 메서드들을 호출하며, 반환값은 모두 단일 필드 객체로 래핑됨.

```ts
interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

- `getDevices(): Promise<{ devices: UsbDeviceInfo[] }>` — 연결 장치 목록을 `devices` 필드로 래핑해 반환. `UsbStorage.getDevices()` 는 이 `devices` 필드만 추출해 반환.
- `requestPermissions(options): Promise<{ granted: boolean }>` — 권한 요청 결과를 `granted` 필드로 래핑해 반환. `UsbStorage.requestPermissions()` 는 이 `granted` 필드만 추출해 반환.
- `checkPermissions(options): Promise<{ granted: boolean }>` — 권한 보유 여부를 `granted` 필드로 래핑해 반환. `UsbStorage.checkPermissions()` 는 이 `granted` 필드만 추출해 반환.
- `readdir(options): Promise<{ files: UsbFileInfo[] }>` — 디렉토리 항목 목록을 `files` 필드로 래핑해 반환. `UsbStorage.readdir()` 는 이 `files` 필드만 추출해 반환.
- `readFile(options): Promise<{ data: string | null }>` — 파일 데이터를 `data` 필드로 래핑해 반환. 데이터는 base64 인코딩 문자열 또는 `null`. `UsbStorage.readFile()` 은 `null` 을 `undefined` 로, 문자열을 `bytes.fromBase64(data)` 로 변환해 반환.
- `options: UsbDeviceFilter` — `requestPermissions`·`checkPermissions` 의 입력. 장치 `vendorId`·`productId` 포함.
- `options: UsbDeviceFilter & { path: string }` — `readdir`·`readFile` 의 입력. `UsbDeviceFilter` 와 `path` 필드(`dirPath` 또는 `filePath`) 포함.
- `devices: UsbDeviceInfo[]` — 연결 장치 정보 배열.
- `granted: boolean` — 권한 승인/보유 여부.
- `files: UsbFileInfo[]` — 디렉토리 항목 배열.
- `data: string | null` — 파일 base64 인코딩 데이터 또는 파일 부재/읽기 실패 시 `null`.
