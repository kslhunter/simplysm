# @simplysm/capacitor-plugin-usb-storage

연결된 USB Mass Storage 장치를 열거하고, 장치별 접근 권한을 확인·요청한 뒤 디렉토리·파일을 읽는 Capacitor 플러그인. Android 는 libaums 라이브러리로 USB Mass Storage 에 접근하고, 웹은 IndexedDB 기반 가상 USB 저장소(`capacitor_usb_virtual_storage` DB)로 동일 API 를 에뮬레이션한다. 모든 호출은 `vendorId`/`productId` 조합(`UsbDeviceFilter`)으로 대상 장치를 지정하며, `UsbStorage` 정적 메서드가 진입점이다.

## 사용 트리거 인덱스

- **UsbStorage** — 앱에서 USB 저장 장치를 다룰 때의 진입점. 장치 목록 조회·권한 확인/요청·디렉토리 나열·파일 읽기 전반. 모든 메서드가 `static async` 이며 인스턴스화 불필요(abstract class).
- **UsbDeviceFilter** — `requestPermissions`/`checkPermissions`/`readdir`/`readFile` 의 대상 장치 지정 인자. `getDevices` 로 얻은 장치 중 하나를 vendorId/productId 로 가리킬 때.
- **UsbDeviceInfo** — `getDevices` 결과 항목 타입. 연결된 장치를 표시·선택하거나 거기서 filter 를 만들 때.
- **UsbFileInfo** — `readdir` 결과 항목 타입. 디렉토리 나열 결과를 순회·필터할 때.
- **UsbStoragePlugin** — 저수준 Capacitor 플러그인 인터페이스(옵션 객체 기반 원형). 보통 직접 쓰지 않고 `UsbStorage` 래퍼를 쓰며, 커스텀 네이티브/web 구현이나 옵션·반환 타입 참조가 필요할 때만 사용.

## UsbStorage

모든 USB 저장 작업의 진입점. 추상 클래스의 정적 메서드 모음이라 `new` 없이 `UsbStorage.메서드()` 로 호출한다. 내부적으로 `registerPlugin<UsbStoragePlugin>("UsbStorage")` 로 얻은 네이티브 구현(웹은 `UsbStorageWeb`)에 위임하고, 플러그인의 `{ ... }` 래퍼 결과를 평탄화해 반환한다. 대상 장치는 항상 `UsbDeviceFilter`(`{ vendorId, productId }`) 로 지정하며 readdir/readFile 도 매 호출마다 filter 를 받는다(상태 없음).

- `static getDevices(): Promise<UsbDeviceInfo[]>` — 현재 연결된 USB 장치 목록 조회. 플러그인의 `{ devices }` 를 배열로 풀어 반환하며, 반환 항목의 `vendorId`/`productId` 를 추려 이후 호출의 filter 로 사용. 목록 UI 를 채우거나 흐름의 첫 단계에서 호출.
- `static checkPermissions(filter: UsbDeviceFilter): Promise<boolean>` — `filter` 장치의 접근 권한 보유 여부 확인. 플러그인의 `{ granted }` 를 boolean 으로 풀어 반환. true = 보유, false = 미보유(이때 `requestPermissions` 필요). 웹 구현은 항상 true. `readdir`/`readFile` 전 게이트로 호출.
- `static requestPermissions(filter: UsbDeviceFilter): Promise<boolean>` — `filter` 장치 접근 권한을 사용자에게 요청. 플러그인의 `{ granted }` 를 boolean 으로 풀어 반환. true = 승인, false = 거부(이때 읽기 중단). 웹 구현은 항상 true. `checkPermissions` 가 false 일 때 호출.
- `static readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>` — `filter` 장치의 `dirPath` 디렉토리 항목 나열. 플러그인의 `{ files }` 를 배열로 풀어 반환. 각 항목은 `UsbFileInfo`(이름·디렉토리 여부)로, 트리를 순회하려면 `isDirectory === true` 인 항목을 다시 readdir. 루트는 `"/"`.
- `static readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>` — `filter` 장치의 `filePath` 파일 읽기. 플러그인이 base64 문자열로 준 `data` 를 `bytes.fromBase64` 로 `Bytes`(`@simplysm/core-common`)로 디코드해 반환. 플러그인의 `data` 가 `null` 이면(파일 없음/데이터 없음) `undefined` 반환 — 결측을 빈 값으로 치환하지 않고 그대로 전파.

사용 예:

```ts
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const [device] = await UsbStorage.getDevices();
if (!device) return;
const filter = { vendorId: device.vendorId, productId: device.productId };

if (!(await UsbStorage.checkPermissions(filter))) {
  if (!(await UsbStorage.requestPermissions(filter))) return; // 거부 시 중단
}

for (const entry of await UsbStorage.readdir(filter, "/")) {
  if (entry.isDirectory) continue; // 폴더면 하위 readdir 로 순회
  const data = await UsbStorage.readFile(filter, `/${entry.name}`); // Bytes | undefined
  if (data === undefined) continue; // 파일 없음/데이터 없음
  // data: Bytes 사용
}
```

## UsbDeviceFilter

권한 메서드와 `readdir`/`readFile` 가 대상 장치를 가리키는 데 쓰는 식별 인자. 보통 `getDevices` 결과 항목의 `vendorId`/`productId` 를 그대로 옮겨 만든다.

```ts
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

- `vendorId: number` — 대상 USB 장치 벤더 ID. `UsbDeviceInfo.vendorId` 를 그대로 넘김. 같은 제조사여도 모델 구분은 `productId` 로.
- `productId: number` — 대상 USB 장치 제품 ID. `UsbDeviceInfo.productId` 를 그대로 넘김. `vendorId` 와 조합해 하나의 장치를 특정(웹 구현은 `${vendorId}:${productId}` 를 장치 키로 사용).

## UsbDeviceInfo

`getDevices` 가 반환하는 연결 장치 1건. 표시·선택용 메타데이터에 더해 `UsbDeviceFilter` 를 만들 두 ID 를 포함한다.

```ts
interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

- `deviceName: string` — 장치 시스템 이름(식별 문자열). 디버깅·로그·표시용.
- `manufacturerName: string` — 제조사 표시명. 사람이 읽는 장치 라벨을 만들 때.
- `productName: string` — 제품 표시명. 목록 UI 의 장치 항목 라벨에 사용.
- `vendorId: number` — 벤더 ID. 이 값을 `UsbDeviceFilter.vendorId` 로 옮겨 권한·읽기 호출에 사용.
- `productId: number` — 제품 ID. 이 값을 `UsbDeviceFilter.productId` 로 옮겨 권한·읽기 호출에 사용.

## UsbFileInfo

`readdir` 가 반환하는 디렉토리 항목 1건.

```ts
interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

- `name: string` — 항목 이름(경로가 아닌 단일 세그먼트의 파일/디렉토리명). readFile·하위 readdir 경로를 만들 때 부모 경로에 이어붙임.
- `isDirectory: boolean` — 디렉토리 여부. true = 하위 디렉토리(다시 readdir 대상), false = 파일(readFile 대상). 트리 순회·파일 필터링의 분기 기준.

## UsbStoragePlugin

저수준 Capacitor 플러그인 인터페이스. `UsbStorage` 정적 메서드가 내부에서 위임하는 원형으로, 메서드가 옵션 객체(`UsbDeviceFilter`, 또는 거기에 `path` 를 더한 형태)를 받고 결과도 래핑 객체(`{ devices }`·`{ granted }`·`{ files }`·`{ data }`)로 반환한다. 보통 직접 호출하지 않으며, 커스텀 web 구현(`UsbStoragePlugin` 구현)을 작성하거나 옵션/반환 타입을 참조해야 할 때만 사용한다.

- `getDevices(): Promise<{ devices: UsbDeviceInfo[] }>` — 연결 장치 목록을 `devices` 로 반환.
- `requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>` — `options` 장치의 권한 요청 결과를 `granted` 로 반환(true=승인).
- `checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>` — `options` 장치의 권한 보유 여부를 `granted` 로 반환(true=보유).
- `readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>` — filter 에 `path`(나열할 디렉토리 경로)를 합친 입력으로 항목 목록을 `files` 로 반환.
- `readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>` — filter 에 `path`(읽을 파일 경로)를 합친 입력으로 파일을 base64 문자열 `data` 로 반환. 파일이 없거나 데이터 없음이면 `data` 가 `null`(래퍼 `UsbStorage.readFile` 이 이를 `undefined` 로 변환).
