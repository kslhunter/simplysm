# `AutoUpdate`

자동 업데이트 오케스트레이터. 서버 또는 외부 저장소에서 최신 APK를 확인하고 설치한다. 모든 메서드가 `static`이며 인스턴스화하지 않는다.

## When to use

- ✅ 앱 부트스트랩 시 서버에서 최신 APK를 자동 다운로드·설치할 때 → `run()`
- ✅ 네트워크 없이 외부 저장소(USB 등)에서 APK를 업데이트할 때 → `runByExternalStorage()`
- ❌ APK 설치 권한만 확인하거나 설치만 직접 수행 → [`ApkInstaller`](../apk-installer/apk-installer.md)

## Signature

```typescript
export abstract class AutoUpdate {
  static async run(opt: {
    log: (messageHtml: string) => void;
    serviceClient: ServiceClient;
  }): Promise<void>;

  static async runByExternalStorage(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }): Promise<void>;
}
```

## Members

| Member | Kind | Description |
|--------|------|-------------|
| `run` | static method | `AutoUpdateService.getLastVersion("android")`로 서버에서 최신 버전 정보를 조회한 뒤, 현재 버전보다 높으면 APK를 다운로드하여 설치한다. 업데이트 후 앱을 무한 대기 상태로 전환한다. |
| `runByExternalStorage` | static method | 외부 저장소의 `opt.dirPath` 디렉토리에서 숫자와 점으로만 구성된 이름의 `.apk` 파일(예: `1.2.3.apk`) 중 최신 semver 버전을 찾아 설치한다. |

## Parameters

### `run` opt

| Param | Type | Description |
|-------|------|-------------|
| `log` | `(messageHtml: string) => void` | 진행 상황 HTML을 받아 사용자에게 표시하는 콜백. 버튼 등 인터랙티브 HTML이 포함될 수 있다. |
| `serviceClient` | `ServiceClient` | `@simplysm/service-client`의 `ServiceClient` 인스턴스. 서버에서 버전 정보를 조회하는 데 사용된다. |

### `runByExternalStorage` opt

| Param | Type | Description |
|-------|------|-------------|
| `log` | `(messageHtml: string) => void` | 진행 상황 HTML을 받아 사용자에게 표시하는 콜백. |
| `dirPath` | `string` | 외부 저장소 루트(`FileSystem.getStoragePath("external")`) 기준 상대 경로. 해당 경로에 `1.2.3.apk` 형식 파일이 있어야 한다. |

## 동작 설명

**권한 처리**: 두 메서드 모두 내부적으로 `ApkInstaller.checkPermissions()`를 호출한다.
- `manifest: false` → 재설치 에러를 throw하고 앱을 무한 대기로 전환한다.
- `granted: false` → 권한 요청 후 최대 300초(1초 간격)간 승인을 폴링한다.

**버전 비교**: `semver` 라이브러리를 사용한다. `versionName`이 유효한 semver 형식이 아니면 업데이트 확인을 건너뛴다.

**업데이트 후 동작**: 업데이트가 실행되면 `new Promise(() => {})` 무한 대기로 전환된다. 사용자가 앱을 재시작해야 새 버전이 적용된다. 업데이트가 필요 없을 때만 정상 반환한다.

**에러 처리**: `try/catch`로 전체를 감싸며, 에러 발생 시 `opt.log()`로 HTML 에러 메시지를 표시한 뒤 무한 대기로 전환한다.

**`run` APK 저장 경로**: `FileSystem.getStoragePath("appCache")`에 `latest.apk`로 저장한다.

## Usage

### 최소 예제 — 서버 기반 자동 업데이트

앱 부트스트랩 시 호출한다. 업데이트가 없으면 정상 반환, 업데이트가 있으면 무한 대기로 전환된다.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import type { ServiceClient } from "@simplysm/service-client";

await AutoUpdate.run({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient, // 이미 연결된 ServiceClient 인스턴스
});
// 이 줄에 도달하면 업데이트가 불필요한 것이다.
```

### 전형 예제 — 외부 저장소(USB) 기반 업데이트

`opt.dirPath`는 외부 저장소 루트 기준 상대 경로다. 해당 경로에 `1.2.3.apk` 형식 파일이 있어야 한다.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "updates/my-app", // 외부 저장소 루트 기준 상대 경로
});
```

## 🚫 Anti-patterns

### `run()` 반환 후 업데이트 완료를 기대

```typescript
// ❌ run() 반환 후 "업데이트 완료" 처리
await AutoUpdate.run({ log, serviceClient });
showMessage("업데이트 완료!"); // 업데이트 시에는 이 줄에 도달하지 않음

// ✅ run()이 반환하면 업데이트가 불필요한 것
await AutoUpdate.run({ log, serviceClient });
// 정상적으로 앱 초기화 계속
initApp();
```

**근거**: 업데이트가 실행되면 APK 설치 후 `_freezeApp()`으로 무한 대기에 진입한다. `run()`이 정상 반환하는 경우는 업데이트가 필요 없을 때뿐이다.
