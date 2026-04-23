# @simplysm/capacitor-plugin-auto-update

> Android APK 자동 업데이트 플러그인. 서버 버전 비교 후 APK 다운로드·설치를 처리하며, 외부 저장소(USB 등)에서도 업데이트할 수 있다. Capacitor 7 기반이며 `@capacitor/core`가 peerDependency다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

피어 의존성으로 `@capacitor/core ^7`이 필요하다. Android 네이티브 플러그인이 포함되어 있으므로 `npx cap sync` 후 사용한다.

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| 서버에서 최신 APK 자동 업데이트 | [auto-update.md](./auto-update/auto-update.md) |
| 외부 저장소(USB)에서 APK 업데이트 | [auto-update.md](./auto-update/auto-update.md) |
| APK 설치 권한 관리 및 직접 설치 | [apk-installer.md](./apk-installer/apk-installer.md) |

## API Overview

### APK 설치

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ApkInstaller`](./apk-installer/apk-installer.md) | abstract class | `AutoUpdate` 없이 APK 설치 권한·설치를 직접 제어할 때 |

### 자동 업데이트

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`AutoUpdate`](./auto-update/auto-update.md) | abstract class | 앱 부트스트랩 시 서버 또는 외부 저장소에서 최신 버전을 확인하고 APK를 설치할 때 |

## 이 패키지를 쓰지 말아야 할 때

- iOS 앱 업데이트 → App Store 메커니즘을 사용한다. 이 플러그인은 Android APK 전용이다.
- 웹 앱 업데이트 → 서버 배포로 처리한다. 브라우저 폴백은 알림만 표시하고 실제 설치를 수행하지 않는다.
