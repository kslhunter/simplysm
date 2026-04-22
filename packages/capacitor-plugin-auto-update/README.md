# @simplysm/capacitor-plugin-auto-update

심플리즘 패키지 - Capacitor 자동 업데이트 플러그인. 서버 버전 비교 후 APK 다운로드·설치를 처리하며, 외부 저장소(USB 등)에서도 업데이트할 수 있다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

피어 의존성으로 `@capacitor/core ^7`이 필요하다. Android 네이티브 플러그인이 포함되어 있으므로 `npx cap sync` 후 사용한다.

## API Overview

### APK 설치

| Entry | Kind | Description |
|-------|------|-------------|
| [`ApkInstaller`](./docs/apk-installer/apk-installer.md) | abstract class | APK 설치 플러그인 정적 파사드 — 권한 확인/요청, 설치, 버전 조회. `VersionInfo`, `ApkInstallerPlugin` 타입 포함. |

### 자동 업데이트

| Entry | Kind | Description |
|-------|------|-------------|
| [`AutoUpdate`](./docs/auto-update/auto-update.md) | abstract class | 자동 업데이트 오케스트레이터 — 서버 또는 외부 저장소에서 최신 APK를 확인하고 설치 |

## Usage Examples

### 서버 기반 자동 업데이트

앱 부트스트랩 시 `AutoUpdate.run()`을 호출한다. `AutoUpdateService`는 `@simplysm/service-common`의 서비스 인터페이스다.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import type { ServiceClient } from "@simplysm/service-client";

async function checkForUpdate(serviceClient: ServiceClient) {
  const statusEl = document.getElementById("status")!;

  await AutoUpdate.run({
    log: (messageHtml) => {
      statusEl.innerHTML = messageHtml;
    },
    serviceClient,
  });

  // 업데이트가 없을 때만 이 줄에 도달한다.
  // 업데이트가 실행되면 _freezeApp()으로 무한 대기 전환되므로 이 줄에 도달하지 않는다.
  statusEl.innerHTML = "";
}
```

### 외부 저장소(USB) 기반 업데이트

`opt.dirPath`는 외부 저장소 루트 기준 상대 경로다. 해당 경로에 `1.2.3.apk` 형식 파일이 있어야 한다.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "updates/my-app",
});
```

### APK 설치 직접 제어

`AutoUpdate`를 사용하지 않고 `ApkInstaller`를 직접 제어하는 경우:

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const { granted, manifest } = await ApkInstaller.checkPermissions();
if (!manifest) throw new Error("앱을 재설치해야 합니다.");
if (!granted) await ApkInstaller.requestPermissions();

const apkUri = await FileSystem.getUri("/path/to/latest.apk");
await ApkInstaller.install(apkUri);
```
