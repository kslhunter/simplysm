# API Index — @simplysm/capacitor-plugin-auto-update

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## APK 설치

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ApkInstaller` | abstract class | [apk-installer.md](./apk-installer/apk-installer.md) | `AutoUpdate` 없이 APK 설치 권한·설치를 직접 제어할 때 |
| `ApkInstallerPlugin` | interface | [apk-installer.md](./apk-installer/apk-installer.md) | Capacitor 네이티브 플러그인 인터페이스. 타입 참조 목적. `ApkInstaller` 파사드를 통해 접근한다 |
| `VersionInfo` | interface | [apk-installer.md](./apk-installer/apk-installer.md) | `ApkInstaller.getVersionInfo()` 반환 타입 |

## 자동 업데이트

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `AutoUpdate` | abstract class | [auto-update.md](./auto-update/auto-update.md) | 앱 부트스트랩 시 서버 또는 외부 저장소에서 최신 버전을 확인하고 APK를 설치할 때 |
