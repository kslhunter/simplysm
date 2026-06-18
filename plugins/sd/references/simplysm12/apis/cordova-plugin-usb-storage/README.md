# @simplysm/cordova-plugin-usb-storage

Android Cordova 환경에서 USB 저장장치를 vendorId/productId로 지정해 권한 요청·디렉토리 조회·파일 읽기를 수행하는 플러그인. (DEPRECATED: Capacitor로 전환됨, Android 전용)

## 사용 트리거 인덱스

- **CordovaUsbStorage** — Android 앱에서 연결된 USB 저장장치를 열거하고, 접근 권한을 요청/확인하고, 그 장치의 디렉토리·파일을 읽을 때.

## CordovaUsbStorage

`abstract` 클래스, 모든 메서드는 `static async`이며 `cordova.exec`를 Promise로 감싼다. 실패 시 `Error("CORDOVA: ERROR: " + err)`로 reject. 장치 지정은 `filter: { vendorId: number; productId: number }` 객체로 한다 (USB 장치를 식별하는 제조사/제품 ID 쌍). 일반 흐름: `getDevices`로 ID 확인 → `hasPermission`/`requestPermission` → `readdir`/`read`.

- `static getDevices(): Promise<{ deviceName: string; manufacturerName: string; productName: string; vendorId: number; productId: number }[]>`
  현재 연결된 USB 장치 목록을 반환. 대상 장치의 vendorId/productId를 알아내는 진입점. 각 항목 필드:
  - `deviceName: string` — OS가 부여한 장치 노드 이름.
  - `manufacturerName: string` — 제조사 이름.
  - `productName: string` — 제품 이름.
  - `vendorId: number` — 제조사 식별 ID. 이후 다른 메서드의 `filter.vendorId`로 사용.
  - `productId: number` — 제품 식별 ID. 이후 다른 메서드의 `filter.productId`로 사용.

- `static requestPermission(filter): Promise<boolean>`
  지정 장치에 대한 접근 권한을 사용자에게 요청하고 승인 여부를 반환(`true`=승인). read/readdir 전에 권한이 없으면 먼저 호출.

- `static hasPermission(filter): Promise<boolean>`
  지정 장치의 접근 권한 보유 여부를 반환(`true`=보유). 권한 요청 다이얼로그를 띄우지 않고 상태만 확인할 때 사용.

- `static readdir(filter, dirPath: string): Promise<string[]>`
  `dirPath` 디렉토리 내 항목(파일/폴더) 이름 배열을 반환. `dirPath`는 USB 저장장치 내부의 디렉토리 경로.

- `static read(filter, filePath: string): Promise<Buffer | undefined>`
  `filePath` 파일 내용을 읽어 `Buffer`로 반환. 네이티브가 `ArrayBuffer`를 주면 `Buffer.from`으로 변환하고, 결과 값이 없으면 `undefined` 반환.
