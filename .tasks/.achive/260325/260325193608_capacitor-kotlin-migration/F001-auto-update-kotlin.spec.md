# F001 auto-update 플러그인 Kotlin 전환 - 수동 테스트

## Scenario: Kotlin 플러그인 적용

### 전제 조건
- Android 빌드 환경 구성 완료

### 수행 절차
1. `packages/capacitor-plugin-auto-update/android/build.gradle`을 확인한다
2. 프로젝트를 Android Studio에서 Sync한다

### 기대 결과
- build.gradle에 `apply plugin: 'kotlin-android'`가 존재한다
- `apply plugin: 'com.android.library'`가 유지된다
- Gradle Sync가 에러 없이 완료된다

## Scenario: 클래스 선언과 어노테이션 변환

### 전제 조건
- Gradle Sync 완료

### 수행 절차
1. `ApkInstallerPlugin.kt` 파일을 확인한다
2. 프로젝트를 빌드한다

### 기대 결과
- `@CapacitorPlugin(name = "ApkInstaller")` 어노테이션이 존재한다
- `class ApkInstallerPlugin : Plugin()` 선언이 존재한다
- 패키지가 `kr.co.simplysm.capacitor.apkinstaller`이다
- 컴파일 에러 없이 빌드된다

## Scenario: install 메서드 변환

### 전제 조건
- APK 파일이 디바이스에 다운로드되어 있다
- 앱이 설치 권한을 보유하고 있다

### 수행 절차
1. TypeScript에서 `ApkInstaller.install({ uri: "<content-uri>" })`를 호출한다
2. uri 없이 `ApkInstaller.install({})`를 호출한다

### 기대 결과
- 유효한 uri: APK 설치 화면이 표시된다
- uri 없음: "uri is required" 에러가 반환된다

## Scenario: checkPermissions 메서드 변환

### 전제 조건
- Android 8.0(API 26) 이상 디바이스

### 수행 절차
1. `ApkInstaller.checkPermissions()`를 호출한다
2. 설정에서 "알 수 없는 앱 설치" 권한을 토글한 뒤 다시 호출한다

### 기대 결과
- `{ granted: boolean, manifest: boolean }` 형태로 응답한다
- granted는 실제 권한 상태를 반영한다
- manifest는 AndroidManifest.xml의 REQUEST_INSTALL_PACKAGES 선언 여부를 반영한다

## Scenario: requestPermissions 메서드 변환

### 전제 조건
- Android 8.0(API 26) 이상 디바이스

### 수행 절차
1. `ApkInstaller.requestPermissions()`를 호출한다

### 기대 결과
- "알 수 없는 앱 설치" 설정 화면이 열린다
- resolve가 호출된다

## Scenario: getVersionInfo 메서드 변환

### 전제 조건
- 앱이 디바이스에 설치되어 있다

### 수행 절차
1. `ApkInstaller.getVersionInfo()`를 호출한다

### 기대 결과
- `{ versionName: string, versionCode: string }` 형태로 응답한다
- versionName과 versionCode가 실제 앱 버전과 일치한다

## Scenario: 변환 후 Java 소스 파일 삭제

### 전제 조건
- 변환 작업 완료

### 수행 절차
1. `android/src/main/java/kr/co/simplysm/capacitor/apkinstaller/` 디렉토리를 확인한다

### 기대 결과
- `ApkInstallerPlugin.java`가 존재하지 않는다
- `ApkInstallerPlugin.kt`만 존재한다
