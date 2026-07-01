# @simplysm/capacitor-plugin-usb-storage

Capacitor 플러그인. USB Mass Storage 장치(USB 메모리 등)를 열거하고, 접근 권한을 요청/확인하며, 장치 내 디렉토리·파일을 읽음. Android는 libaums 라이브러리 기반 실제 동작, 웹은 alert 안내 후 빈 값 반환(no-op).

## 사용 트리거 인덱스

- **UsbStorage** — USB 저장장치 장치 목록 조회, 권한 요청/확인, 디렉토리 나열, 파일 읽기가 필요할 때 쓰는 정적 클래스(인스턴스화 불가).
- **IUsbDeviceInfo** — `getDevices()` 결과로 받는 USB 장치 식별 정보 구조. `vendorId`/`productId`를 추출해 이후 권한·읽기 호출의 filter로 넘길 때 참조.
- **IUsbDeviceFilter** — 권한·읽기 호출에서 대상 장치를 지정하는 `{ vendorId, productId }` 형태(메서드 인자에 inline 사용).

## UsbStorage (정적 클래스)

모든 메서드 `static async`. 호출 대상 장치는 `vendorId`+`productId` 조합으로 지정. 웹 환경에서는 `getDevices`는 빈 배열, `hasPermission`은 `false`, `requestPermission`/`readdir`/`read`는 alert 후 각각 `false`/빈 배열/`undefined` 반환.

- `UsbStorage.getDevices(): Promise<IUsbDeviceInfo[]>`
  연결된 USB 장치 정보 배열을 반환. 내부적으로 플러그인 결과의 `.devices`를 풀어 반환. 빈 배열이면 연결된 장치 없음(또는 웹 환경).

- `UsbStorage.requestPermission(filter: { vendorId: number; productId: number }): Promise<boolean>`
  지정 장치의 접근 권한을 OS에 요청. 반환 `true`=권한 승인, `false`=거부(웹 환경은 alert 후 항상 `false`). 디렉토리·파일 읽기 전 권한 확보용.

- `UsbStorage.hasPermission(filter: { vendorId: number; productId: number }): Promise<boolean>`
  지정 장치에 이미 접근 권한이 있는지 확인(요청 없이 조회만). 반환 `true`=권한 보유, `false`=미보유(웹 환경은 항상 `false`). `requestPermission` 호출 여부를 분기할 때 사용.

- `UsbStorage.readdir(filter: { vendorId: number; productId: number }, dirPath: string): Promise<string[]>`
  지정 장치의 `dirPath` 디렉토리 내 파일/폴더 이름 배열을 반환. 내부적으로 플러그인에 `{ ...filter, path: dirPath }`로 전달하고 결과의 `.files`를 풀어 반환(웹 환경은 alert 후 빈 배열).

- `UsbStorage.read(filter: { vendorId: number; productId: number }, filePath: string): Promise<Buffer | undefined>`
  지정 장치의 `filePath` 파일 내용을 읽어 `Buffer`로 반환. 플러그인은 base64 문자열(`data`)을 돌려주며, `data`가 `null`이면 `undefined` 반환(파일 없음/웹 환경), 값이 있으면 `Buffer.from(data, "base64")`로 디코드. 인자는 `{ ...filter, path: filePath }`로 전달.

## IUsbDeviceInfo

`getDevices()`가 반환하는 장치당 정보. 전 필드 필수.

- `deviceName: string` — OS가 부여한 장치 노드/식별 이름(표시·구분용).
- `manufacturerName: string` — USB 디스크립터의 제조사명 문자열.
- `productName: string` — USB 디스크립터의 제품명 문자열.
- `vendorId: number` — USB 공급업체 ID. 이후 filter의 `vendorId`로 그대로 사용.
- `productId: number` — USB 제품 ID. 이후 filter의 `productId`로 그대로 사용.

## IUsbDeviceFilter

권한·읽기 메서드에서 대상 장치를 한정하는 키. `getDevices()` 결과의 동명 필드를 복사해 넘김.

- `vendorId: number` — 대상 장치의 USB 공급업체 ID.
- `productId: number` — 대상 장치의 USB 제품 ID.
