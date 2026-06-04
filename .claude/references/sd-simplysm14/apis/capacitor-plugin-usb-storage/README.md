# @simplysm/capacitor-plugin-usb-storage

Capacitor 플러그인. 연결된 USB Mass Storage 장치를 열거하고 권한을 얻은 뒤 디렉토리/파일을 읽는다. Android 는 libaums 네이티브 구현, 브라우저는 IndexedDB 기반 가상 USB 저장소로 에뮬레이션된다. entry 가 노출하는 심볼은 정적 클래스 `UsbStorage` 와 입출력 타입 4종.

## 사용 트리거 인덱스

- **UsbStorage** — USB 저장 장치 접근의 진입점. "장치 목록 조회 → 권한 확인/요청 → readdir/readFile" 흐름을 정적 메서드로 호출할 때.
- **UsbDeviceInfo / UsbDeviceFilter / UsbFileInfo / UsbStoragePlugin** — 위 메서드의 입출력 타입. 장치 식별(vendorId/productId), 반환 항목(`name`/`isDirectory`) 형태를 다룰 때 참조.

## UsbStorage

`abstract class` 이며 모든 멤버가 `static` — 인스턴스화하지 않고 `UsbStorage.메서드()` 로 호출한다. 내부적으로 `registerPlugin<UsbStoragePlugin>("UsbStorage")` 로 얻은 네이티브(Android)/웹 구현에 위임하고, 래퍼 객체(`{ devices }`·`{ granted }`·`{ files }`·`{ data }`)에서 값을 꺼내 평탄화해 반환한다. 대상 장치는 항상 `UsbDeviceFilter`(= `{ vendorId, productId }`) 로 지정하며 readdir/readFile 도 매 호출마다 filter 를 받는다(상태 없음).

- `static getDevices(): Promise<UsbDeviceInfo[]>` — 현재 연결된 USB 장치 목록 조회. 권한과 무관하게 열거되며, 반환 항목의 `vendorId`/`productId` 를 추려 이후 호출의 filter 로 사용. 흐름의 첫 단계.
- `static requestPermissions(filter: UsbDeviceFilter): Promise<boolean>` — 지정 장치 접근 권한을 사용자에게 요청(다이얼로그). 반환 true=승인, false=거부(이때 읽기 중단). 권한이 없을 때 읽기 직전 호출. 브라우저 웹 구현은 항상 true 를 반환.
- `static checkPermissions(filter: UsbDeviceFilter): Promise<boolean>` — 다이얼로그 없이 현재 권한 보유 여부만 확인. true=이미 보유(requestPermissions 생략 가능), false=미보유(요청 필요). 권한이 이미 있을 때 요청을 건너뛰려는 분기 기준. 브라우저 웹 구현은 항상 true 를 반환.
- `static readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>` — 지정 장치의 `dirPath`(읽을 디렉토리 경로, 루트는 `"/"`) 바로 아래 항목 목록 조회. 각 항목은 `name`+`isDirectory` 로 파일/폴더 구분. 트리를 순회하려면 `isDirectory === true` 인 항목을 다시 readdir. 웹 구현은 장치가 없거나 대상이 디렉토리가 아니면 빈 배열.
- `static readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>` — 지정 장치의 `filePath`(읽을 파일 경로) 내용을 `Bytes`(`@simplysm/core-common`) 로 읽음. 파일이 없거나 네이티브가 데이터 없음(`null`)을 주면 `undefined` 반환 — "빈 파일" 과 "없음" 을 구분하려면 이 `undefined` 를 그대로 검사(`""`·기본값 치환 금지). 내부에서 base64 응답을 `bytes.fromBase64` 로 복원.

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
  const data = await UsbStorage.readFile(filter, `/${entry.name}`);
  if (data === undefined) continue; // 파일 없음/데이터 없음
  // data: Bytes 사용
}
```

## 입출력 타입

`UsbStoragePlugin` 은 Capacitor 가 `registerPlugin<UsbStoragePlugin>("UsbStorage")` 로 등록하는 네이티브 측 계약이며, 위 `UsbStorage` 정적 메서드가 이를 1:1 로 감싸 쓰기 쉬운 형태(배열·boolean·Bytes)로 변환한다. 보통 직접 호출하지 않고 타입 참조용으로만 본다.

- `UsbDeviceInfo` — `getDevices()` 가 돌려주는 장치 정보 1건.
  - `deviceName: string` — OS 가 부여한 장치 시스템 이름. 화면 표시·로그용.
  - `manufacturerName: string` — 제조사 이름. 사용자에게 장치를 식별시키거나 동일 제품명을 구분할 때.
  - `productName: string` — 제품 이름. 사용자에게 어떤 장치인지 보여줄 때.
  - `vendorId: number` — USB 벤더 ID. 이후 filter 의 `vendorId` 로 그대로 사용.
  - `productId: number` — USB 제품 ID. `vendorId` 와 조합해 장치를 유일하게 지정, 이후 filter 의 `productId` 로 그대로 사용.
- `UsbDeviceFilter` — 접근 대상 장치를 지정하는 키. 권한·읽기 메서드 모두 이 형태를 받음. 보통 `UsbDeviceInfo` 에서 두 ID 만 추려 만듦.
  - `vendorId: number` — 대상 장치 벤더 ID. `UsbDeviceInfo.vendorId` 를 그대로 넘김.
  - `productId: number` — 대상 장치 제품 ID. `UsbDeviceInfo.productId` 를 그대로 넘김.
- `UsbFileInfo` — `readdir()` 가 돌려주는 디렉토리 항목 1건.
  - `name: string` — 파일/폴더 이름(경로가 아닌 단일 세그먼트). readFile/하위 readdir 경로를 만들 때 부모 경로에 이어붙임.
  - `isDirectory: boolean` — 디렉토리 여부. true 면 폴더(다시 readdir 대상), false 면 파일(readFile 대상). 트리 순회·파일 필터링의 분기 기준.
- `UsbStoragePlugin` — Capacitor `registerPlugin` 대상 인터페이스. `UsbStorage` 가 평탄화하기 전의 원형 시그니처로, 메서드는 옵션 객체 입력 / 래퍼 객체 출력을 가짐.
  - `getDevices(): Promise<{ devices: UsbDeviceInfo[] }>` — 장치 목록을 `devices` 키로 반환.
  - `requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>` — 권한 요청 결과를 `granted` 로 반환.
  - `checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>` — 권한 보유 여부를 `granted` 로 반환.
  - `readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>` — filter 에 `path`(대상 디렉토리 경로)를 합친 입력으로 항목을 `files` 로 반환.
  - `readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>` — filter 에 `path`(대상 파일 경로)를 합친 입력으로 파일을 base64 문자열 `data` 로 반환. 데이터 없으면 `null`(상위 `UsbStorage.readFile` 가 `undefined` 로 변환).
