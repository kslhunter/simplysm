# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/capacitor-plugin-usb-storage/README.md`를 참조한다.

## Package Overview

`@simplysm/capacitor-plugin-usb-storage`는 Capacitor USB Mass Storage 접근 플러그인이다. Android에서는 `libaums`로 USB 저장 장치를 열거하고 파일을 읽으며, 브라우저에서는 IndexedDB 기반 가상 USB 저장소로 동작한다. TypeScript 소스는 5개 파일이다.

패키지 고유 의존성:

- `@capacitor/core` — `registerPlugin`, `WebPlugin`
- `@simplysm/core-browser` — 브라우저 가상 파일 시스템용 `IndexedDbStore`, `IndexedDbVirtualFs`
- `@simplysm/core-common` — 파일 데이터 Base64 변환용 `bytes`, `Bytes`

## Architecture

```text
src/
├── index.ts
├── UsbStorage.ts
├── UsbStoragePlugin.ts
└── web/
    ├── UsbStorageWeb.ts
    └── VirtualUsbStorage.ts

android/
└── src/main/kotlin/kr/co/simplysm/capacitor/usbstorage/
    └── UsbStoragePlugin.kt
```

- `src/index.ts`는 공개 API로 `UsbStoragePlugin` 타입들과 `UsbStorage` 파사드를 re-export한다.
- `src/UsbStoragePlugin.ts`는 Capacitor 플러그인 인터페이스와 공개 타입만 정의한다.
- `src/UsbStorage.ts`는 `registerPlugin<UsbStoragePlugin>("UsbStorage")`로 플러그인을 등록하고 정적 파사드를 제공한다.
- `src/web/UsbStorageWeb.ts`는 브라우저 폴백 구현이며 테스트·개발용 가상 장치 메서드를 추가로 제공한다.
- `src/web/VirtualUsbStorage.ts`는 장치별 가상 파일 시스템을 IndexedDB에 저장한다.
- `android/.../UsbStoragePlugin.kt`는 Android 네이티브 구현이며 `libaums`를 사용한다.

## Key Patterns

### Capacitor 플러그인 3계층

플러그인은 타입 인터페이스, 공개 파사드, 플랫폼별 구현으로 나뉜다.

```typescript
export interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

```typescript
const usbStoragePlugin = registerPlugin<UsbStoragePlugin>("UsbStorage", {
  web: async () => {
    const { UsbStorageWeb } = await import("./web/UsbStorageWeb");
    return new UsbStorageWeb();
  },
});
```

`registerPlugin`의 `web` factory는 Capacitor가 요구하는 지연 로딩 형태라 동적 `import()`를 사용한다. 일반 패키지 내부 import와 달리 이 위치는 플랫폼 폴백 등록 코드로 취급한다.

### 정적 파사드 반환값 정리

`UsbStorage`는 플러그인 원시 반환 객체를 소비자가 쓰기 쉬운 값으로 바꾼다.

```typescript
static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined> {
  const result = await usbStoragePlugin.readFile({ ...filter, path: filePath });
  if (result.data == null) {
    return undefined;
  }
  return bytes.fromBase64(result.data);
}
```

- 플러그인 레벨의 `{ devices }`, `{ granted }`, `{ files }`, `{ data }` 래퍼를 제거한다.
- 파일 데이터는 Android와 Web 구현에서 Base64 문자열로 전달하고, 파사드에서 `Bytes`로 변환한다.
- 플러그인이 `null` 데이터를 반환하면 공개 파사드는 `undefined`를 반환한다.

### `UsbDeviceFilter`로 장치 식별

장치 접근 API는 `vendorId`와 `productId`를 묶은 `UsbDeviceFilter`를 첫 번째 인자로 받는다. 경로가 필요한 메서드는 플러그인 호출 직전에 `{ ...filter, path }` 형태로 합친다.

```typescript
static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]> {
  const result = await usbStoragePlugin.readdir({ ...filter, path: dirPath });
  return result.files;
}
```

Android 구현도 같은 두 값으로 `UsbMassStorageDevice.getMassStorageDevices(context)` 결과를 필터링한다.

### 브라우저 가상 저장소 키 구성

브라우저 구현은 IndexedDB 데이터베이스 `capacitor_usb_virtual_storage`에 장치와 파일을 분리해 저장한다. 파일 엔트리는 장치 키와 경로를 합친 `"{vendorId}:{productId}:{path}"` 형식의 `fullKey`를 사용한다.

```typescript
async getEntry(deviceKey: string, path: string): Promise<VirtualFsEntry | undefined> {
  const fullKey = `${deviceKey}:${path}`;
  return this._vfs.getEntry(fullKey);
}
```

`UsbStorageWeb`의 `addVirtualDevice`, `addVirtualFile`, `addVirtualDirectory`는 공개 `UsbStorage` 파사드가 아니라 브라우저 구현 인스턴스에서만 호출한다.

## Android Native

- `android/build.gradle`은 Android library, Kotlin Android 플러그인을 사용한다.
- Android namespace는 `kr.co.simplysm.capacitor.usbstorage`이다.
- `minSdk` 기본값은 23, `compileSdk` 기본값은 35이다.
- Java/Kotlin toolchain은 21이다.
- 네이티브 USB Mass Storage 구현은 `me.jahnen.libaums:core:0.9.1`에 의존한다.
- `readFile`은 100MB를 초과하는 파일을 reject한다.
- `requestPermissions`는 Android 12 이상에서 `PendingIntent.FLAG_MUTABLE`, Android 13 이상에서 `Context.RECEIVER_NOT_EXPORTED`를 사용한다.

## Package Compiler Settings

`tsconfig.json`은 루트 설정을 확장하고 패키지 고유 옵션으로 DOM 라이브러리를 추가한다. 브라우저 폴백에서 IndexedDB와 DOM 타입을 사용하므로 `["ESNext", "DOM", "DOM.Iterable"]`이 필요하다.
