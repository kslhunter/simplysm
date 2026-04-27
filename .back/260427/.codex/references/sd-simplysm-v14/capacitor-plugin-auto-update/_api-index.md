# API Index — @simplysm/capacitor-plugin-auto-update

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## APK 설치

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ApkInstaller` | abstract class | [apk-installer.md](./apk-installer/apk-installer.md) | 자동 업데이트 흐름 없이 APK 설치 권한·설치를 직접 제어할 때 |
| `ApkInstallerPlugin` | interface | [apk-installer.md](./apk-installer/apk-installer.md) | Capacitor 네이티브 플러그인의 TypeScript 계약을 확인할 때 |
| `VersionInfo` | interface | [apk-installer.md](./apk-installer/apk-installer.md) | 현재 설치된 앱 버전 조회 결과를 타입으로 다룰 때 |

## 자동 업데이트

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `AutoUpdate` | abstract class | [auto-update.md](./auto-update/auto-update.md) | 앱 부트스트랩 시 서버 또는 외부 저장소에서 최신 Android APK를 확인하고 설치할 때 |
