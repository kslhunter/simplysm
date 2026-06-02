# @simplysm/capacitor-plugin-usb-storage

USB Mass Storage 장치를 읽는 Capacitor 플러그인. Android 는 libaums 로 실제 USB 저장소에 접근하고, 브라우저(web)는 IndexedDB 기반 가상 USB 저장소로 에뮬레이션함. 외부 노출 심볼은 정적 클래스 `UsbStorage`, 타입 정의 3종, 네이티브 인터페이스 `UsbStoragePlugin`.

## 사용 트리거 인덱스

- **UsbStorage** — USB 장치 목록 조회·권한 요청/확인·디렉토리/파일 읽기를 할 때 쓰는 정적 진입점. 모든 동작이 `vendorId`/`productId` 로 대상 장치를 지정.
- **UsbDeviceFilter / UsbDeviceInfo / UsbFileInfo** — 위 메서드의 인자·반환 타입. 장치 식별·열거·항목 분기 시 함께 참조.
- **UsbStoragePlugin** — `UsbStorage` 가 내부적으로 감싸는 Capacitor 네이티브 인터페이스. 보통 직접 호출하지 않음.

## UsbStorage (정적 클래스)

모든 메서드 정적, 인스턴스화 불필요. 장치 지정은 항상 `UsbDeviceFilter`(vendorId+productId).

`static getDevices(): Promise<UsbDeviceInfo[]>`
- 현재 연결된 USB 장치 목록을 반환. 권한 요청 전 장치의 `vendorId`/`productId` 를 알아내는 용도.

`static requestPermissions(filter: UsbDeviceFilter): Promise<boolean>`
- `filter` 장치의 접근 권한을 OS 에 요청. 반환 `true`=승인, `false`=거부. web 구현은 항상 `true`. readdir/readFile 전 권한 확보용.

`static checkPermissions(filter: UsbDeviceFilter): Promise<boolean>`
- 권한 요청 다이얼로그 없이 현재 보유 권한만 확인. `true`=이미 보유, `false`=미보유(이때 `requestPermissions` 필요). web 구현은 항상 `true`.

`static readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>`
- `filter` 장치의 `dirPath` 디렉토리 하위 항목 목록을 반환. `dirPath`=읽을 디렉토리 경로(루트는 `"/"`).

`static readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>`
- `filter` 장치의 `filePath` 파일 내용을 `Bytes`(`@simplysm/core-common`)로 반환. `filePath`=읽을 파일 경로. 네이티브가 데이터 없음(null)을 주면 `undefined` 반환 — 결측을 빈 Bytes 로 치환하지 않고 그대로 전파. 내부적으로 base64 → `bytes.fromBase64` 변환.

사용 예:

```ts
const devices = await UsbStorage.getDevices();
const filter = { vendorId: devices[0].vendorId, productId: devices[0].productId };
if (!(await UsbStorage.checkPermissions(filter))) {
  if (!(await UsbStorage.requestPermissions(filter))) return; // 거부 시 중단
}
const files = await UsbStorage.readdir(filter, "/");
const data = await UsbStorage.readFile(filter, "/data.bin"); // Bytes | undefined
```

## 타입 정의

`interface UsbDeviceFilter` — 권한·읽기 메서드의 장치 식별 키
- `vendorId: number` — 대상 USB 장치의 벤더 ID. 장치 특정 키의 일부.
- `productId: number` — 대상 USB 장치의 제품 ID. `vendorId` 와 조합해 장치를 유일하게 지정.

`interface UsbDeviceInfo` — `getDevices` 반환 배열 요소
- `deviceName: string` — OS 가 보고하는 장치 시스템 이름.
- `manufacturerName: string` — 제조사 이름.
- `productName: string` — 제품 이름.
- `vendorId: number` — 벤더 ID. 그대로 `UsbDeviceFilter.vendorId` 구성에 사용.
- `productId: number` — 제품 ID. 그대로 `UsbDeviceFilter.productId` 구성에 사용.

`interface UsbFileInfo` — `readdir` 반환 배열 요소
- `name: string` — 항목(파일/폴더) 이름.
- `isDirectory: boolean` — `true`=디렉토리(하위 readdir 가능), `false`=파일(readFile 대상). 재귀 탐색·파일 필터링 분기에 사용.

## UsbStoragePlugin (네이티브 인터페이스)

`registerPlugin<UsbStoragePlugin>("UsbStorage")` 로 등록되는 Capacitor 인터페이스. `UsbStorage` 정적 메서드가 이를 감싸며 `{ ... }` 래퍼 객체에서 값을 꺼내므로 보통 직접 호출 불필요. 직접 다뤄야 할 때만 참조.

- `getDevices(): Promise<{ devices: UsbDeviceInfo[] }>` — 장치 목록을 `devices` 키로 반환.
- `requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>` — 권한 요청 결과를 `granted` 로 반환.
- `checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>` — 권한 보유 여부를 `granted` 로 반환.
- `readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>` — `path` 디렉토리 항목을 `files` 로 반환. `options` 는 필터에 `path`(대상 경로)를 합친 형태.
- `readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>` — `path` 파일을 base64 문자열 `data` 로 반환. 데이터 없으면 `null`(상위 `UsbStorage.readFile` 가 `undefined` 로 변환).
