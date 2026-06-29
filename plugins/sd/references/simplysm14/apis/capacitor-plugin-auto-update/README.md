# @simplysm/capacitor-plugin-auto-update

Android APK 설치 권한·설치 호출과 서버/외부 저장소 기반 APK 자동 업데이트 흐름을 제공하는 Capacitor 플러그인 패키지.

## 사용 트리거 인덱스

- **AutoUpdate** — 앱 시작 시 최신 APK 확인, 권한 확인/요청, 다운로드 또는 외부 저장소 선택, 설치 호출까지 한 흐름으로 묶을 때 사용. 자세히: [auto-update.md](./auto-update.md) / 사용법: [client-service.md](../../manuals/client-service.md)
- **ApkInstaller / ApkInstallerPlugin / VersionInfo** — 자동 업데이트 흐름을 직접 쓰지 않고 APK 설치 권한, 설치 URI 전달, 현재 앱 버전 정보 타입을 다룰 때 사용. 자세히: [apk-installer.md](./apk-installer.md)
