# AutoUpdate

자동 업데이트 오케스트레이터. 서버 또는 외부 저장소에서 최신 APK를 확인하고 설치한다. 모든 메서드가 `static`이며 인스턴스화하지 않는다. Android 환경 전용이며, 비-Android에서 호출하면 에러를 표시하고 앱을 무한 대기 상태로 전환한다.

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

| Member | Kind | Parameters | Description |
|--------|------|-----------|-------------|
| `run` | static method | `opt.log`, `opt.serviceClient` | `AutoUpdateService.getLastVersion("android")`로 서버에서 최신 버전 정보를 조회한 뒤, 현재 버전보다 높으면 APK를 다운로드하여 설치한다. 업데이트 후 앱을 무한 대기 상태로 전환한다. |
| `runByExternalStorage` | static method | `opt.log`, `opt.dirPath` | 외부 저장소의 `opt.dirPath` 디렉토리에서 숫자와 점으로만 구성된 이름의 `.apk` 파일(예: `1.2.3.apk`) 중 최신 semver 버전을 찾아 설치한다. 현재 버전보다 높은 경우에만 업데이트한다. |

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

**권한 처리**: 두 메서드 모두 내부적으로 권한 확인을 수행한다.
- `manifest: false` → 재설치 에러를 throw하고 앱을 무한 대기로 전환한다.
- `granted: false` → 권한 요청 후 최대 300초(1초 간격)간 승인을 폴링한다.

**버전 비교**: `semver` 라이브러리를 사용한다. `versionName`이 유효한 semver 형식이 아니면 업데이트 확인을 건너뛴다.

**업데이트 후 동작**: 업데이트가 실행되면 `new Promise(() => {})` 무한 대기로 전환된다. 사용자가 앱을 재시작해야 새 버전이 적용된다. 업데이트가 필요 없을 때는 정상 반환한다.

**에러 처리**: `try/catch`로 전체를 감싸며, 에러 발생 시 `opt.log()`로 HTML 에러 메시지를 표시한 뒤 무한 대기로 전환한다.

**`run` APK 저장 경로**: `FileSystem.getStoragePath("appCache")`에 `latest.apk`로 저장한다.

## Usage

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
  // 업데이트가 실행되면 무한 대기 전환되므로 이 줄에 도달하지 않는다.
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
