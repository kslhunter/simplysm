---
name: capacitor
description: "@simplysm/capacitor-plugin-auto-update·file-system·intent·usb-storage(Android 자동 업데이트, 네이티브 파일시스템, Intent 브로드캐스트·Activity, USB 저장소)의 사용 안내. Use when Capacitor 모바일 앱에서 APK 자동 업데이트, 파일 읽기·쓰기·권한, 바코드 스캐너 등 Intent 연동, USB 장치 읽기를 설계·작성·리뷰하는 모든 작업 — 착수 전에 먼저 읽는다. 대상: AutoUpdate.run·runByExternalStorage, ApkInstaller, FileSystem·StorageType, Intent.subscribe·send·startActivityForResult·getLaunchIntent, UsbStorage."
---

@simplysm/capacitor-plugin-* 사용 안내입니다. 네 플러그인 모두 `abstract class` 의 static 메서드가 진입점이고, Android 네이티브와 웹(no-op·IndexedDB 에뮬레이션) 구현이 같은 계약을 따릅니다. `src/` 원본을 함께 배포하므로 상세 API 는 설치된 소스에서 직접 확인합니다 — 이 문서는 어디를 볼지와, 소스 한 파일만 읽어서는 놓치는 규약만 담습니다.

## 소스 위치

- `node_modules/@simplysm/capacitor-plugin-<name>/src/` — 공개 API 는 `src/index.ts`. 네이티브는 `android/`, 웹 구현은 `src/*-web.ts`. `sd.config.ts` client 의 `capacitor.plugins` 에 `{ "@simplysm/capacitor-plugin-<name>": true }` 로 등록해야 앱에 포함됩니다(`sd-cli` 스킬).

## 소스 한 파일만 읽어서는 틀리기 쉬운 것

- `AutoUpdate.run({ log, serviceClient })`(서버 `AutoUpdateService` 기반) / `runByExternalStorage({ log, dirPath })`(외부저장소 `<버전>.apk` 중 semver 최대) 는 Android 가 아니면 "Android만 지원됩니다." 예외이고, 신버전 설치 흐름에 들어가면 성공·실패와 무관하게 `_freezeApp`(무한 대기)으로 앱을 멈춰 사용자의 수동 재시작을 유도합니다. 진행·오류는 전부 `log(messageHtml)` 콜백으로 오니 화면에 그대로 렌더합니다.
  - 설치 권한(`REQUEST_INSTALL_PACKAGES`)이 없으면 `ApkInstaller.requestPermissions()` 로 설정 화면에 보내고 1초 간격 최대 300회 폴링합니다. 권한이 manifest 에 선언돼 있지 않으면 앱 재설치가 필요합니다.
  - `ApkInstaller.install(uri)` 의 `uri` 는 `content://`(FileProvider) 만 — `FileSystem.getUri(path)` 로 얻습니다. `file://` 불가. 설치 후 자동 복귀 없음.
  - 웹에서 `getVersionInfo()` 는 `env("SD_VERSION") ?? "0.0.0"`.
- `FileSystem`: Android 11+ 는 `MANAGE_EXTERNAL_STORAGE`(설정 화면 이동), 10 이하는 `READ_WRITE_EXTERNAL_STORAGE`(다이얼로그). 웹은 IndexedDB 에뮬레이션이고 `getStoragePath` 가 `/webfs/<type>` 가상 경로를 돌려줍니다. `readFile(path)` 는 `Bytes`, `readFile(path, "utf8")` 은 문자열. `writeFile`/`mkdir` 은 상위 경로 자동 생성. 웹의 `getUri` 는 Blob URL 이라 사용 후 `URL.revokeObjectURL`.
- `Intent.subscribe(filters, cb)` 는 해제 함수를 반환하고, `addListener("newIntent", cb)` 는 필터 없이 실행 중 들어오는 모든 인텐트를 받는 핸들(`.remove()`) 을 반환합니다. 둘 다 컴포넌트 파기(`ngOnDestroy`) 에서 해제하지 않으면 누수. `getLaunchIntent()` 는 앱 시작 직후 최대한 빨리 호출해야 정확합니다. `startActivityForResult` 의 `resultCode` 는 -1 이 RESULT_OK, 0 이 취소. 액션 문자열은 제조사 문서의 정확한 값이어야 수신됩니다. 웹은 경고 로그 + stub(`{ id: "web-stub" }`, `{ resultCode: 0 }`) 이라 실제 검증은 기기·에뮬레이터에서만.
- `UsbStorage`: 대상 장치는 `getDevices()` 의 `vendorId`·`productId` 로 만든 `UsbDeviceFilter`. `readFile` 은 파일이 없거나 실패하면 `undefined`(throw 아님). 경로는 `/` 구분, 루트 `"/"`. 웹은 `requestPermissions` 가 항상 `true`.
