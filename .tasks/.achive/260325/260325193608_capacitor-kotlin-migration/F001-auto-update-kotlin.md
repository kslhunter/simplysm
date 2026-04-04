# Feature F001 auto-update 플러그인 Kotlin 전환

## 참조 자료

- [wbs.md](wbs.md)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | Kotlin 소스 파일 위치 | 기존 java/ 디렉토리에 배치 | Kotlin은 java/ 디렉토리에서도 정상 동작하며, 디렉토리 구조 변경을 최소화 |
| D2 | 변환 후 Java 파일 처리 | 삭제 | 1:1 변환이므로 동일 클래스의 .java와 .kt가 공존하면 컴파일 에러 발생 |

## 요구명세

```gherkin
Feature: F001 auto-update 플러그인 Kotlin 전환

  Background:
    Given capacitor-plugin-auto-update 패키지의 Android 네이티브 코드가 Java로 작성되어 있다

  Rule: build.gradle에 Kotlin 빌드 설정을 추가한다

    Scenario: Kotlin 플러그인 적용
      Given build.gradle에 com.android.library 플러그인만 적용되어 있다
      When Kotlin 전환을 수행한다
      Then build.gradle에 kotlin-android 플러그인이 추가된다
      And 기존 com.android.library 플러그인은 유지된다
      And 기존 compileSdk, minSdk, dependencies 설정은 변경되지 않는다

  Rule: ApkInstallerPlugin.java를 ApkInstallerPlugin.kt로 변환한다

    Scenario: 클래스 선언과 어노테이션 변환
      Given ApkInstallerPlugin.java가 @CapacitorPlugin(name = "ApkInstaller") 어노테이션과 Plugin 상속으로 선언되어 있다
      When Kotlin으로 변환한다
      Then ApkInstallerPlugin.kt에 동일한 @CapacitorPlugin 어노테이션과 Plugin 상속이 유지된다
      And 패키지 선언 kr.co.simplysm.capacitor.apkinstaller이 유지된다

    Scenario: install 메서드 변환
      Given install 메서드가 uri 파라미터를 받아 APK 설치 Intent를 실행한다
      When Kotlin으로 변환한다
      Then @PluginMethod 어노테이션이 유지된다
      And uri가 null이면 call.reject("uri is required")를 호출한다
      And 정상 시 ACTION_VIEW Intent로 APK 설치를 시작하고 call.resolve()를 호출한다
      And 예외 발생 시 Log.e로 로깅하고 call.reject()를 호출한다

    Scenario: checkPermissions 메서드 변환
      Given checkPermissions 메서드가 패키지 설치 권한 상태를 반환한다
      When Kotlin으로 변환한다
      Then @PluginMethod 어노테이션이 유지된다
      And SDK >= O일 때 canRequestPackageInstalls()로 granted를 확인한다
      And SDK < O일 때 granted는 true이다
      And AndroidManifest에 REQUEST_INSTALL_PACKAGES 권한 선언 여부를 manifest로 반환한다
      And JSObject에 granted와 manifest를 담아 call.resolve()한다

    Scenario: requestPermissions 메서드 변환
      Given requestPermissions 메서드가 알 수 없는 앱 설치 설정 화면을 연다
      When Kotlin으로 변환한다
      Then @PluginMethod 어노테이션이 유지된다
      And SDK >= O일 때 ACTION_MANAGE_UNKNOWN_APP_SOURCES Intent를 실행한다
      And call.resolve()를 호출한다

    Scenario: getVersionInfo 메서드 변환
      Given getVersionInfo 메서드가 앱의 versionName과 versionCode를 반환한다
      When Kotlin으로 변환한다
      Then @PluginMethod 어노테이션이 유지된다
      And SDK >= P일 때 getLongVersionCode()를 사용한다
      And SDK < P일 때 versionCode 필드를 사용한다
      And JSObject에 versionName과 versionCode(문자열)를 담아 call.resolve()한다
      And 예외 발생 시 Log.e로 로깅하고 call.reject()를 호출한다

    Scenario: 변환 후 Java 소스 파일 삭제
      Given ApkInstallerPlugin.kt가 생성되었다
      When 변환을 완료한다
      Then ApkInstallerPlugin.java 파일이 삭제된다
```

## 구현계획

### 배경

capacitor-plugin-auto-update 패키지의 Android 네이티브 코드가 Java로 작성되어 있다. ApkInstallerPlugin.java(118줄) 1개 파일로 구성되며, Capacitor Plugin 패턴(@CapacitorPlugin, @PluginMethod, PluginCall)을 사용한다. build.gradle은 `com.android.library` 플러그인만 적용되어 있어 Kotlin 컴파일을 지원하지 않는다.

### 목표

- build.gradle에 Kotlin 빌드 지원 추가
- ApkInstallerPlugin.java를 ApkInstallerPlugin.kt로 1:1 변환
- 변환 후 Java 소스 삭제

### 비목표

- TypeScript 소스 변경
- 기능 추가/API 변경
- AndroidManifest.xml 변경
- 테스트 코드 작성

### 설계

#### build.gradle 변경

`kotlin-android` 플러그인을 추가한다:

```groovy
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'
```

나머지 설정(namespace, compileSdk, minSdk, dependencies)은 변경 없음.

#### Kotlin 변환 규칙

| Java 패턴 | Kotlin 변환 |
|-----------|------------|
| `public class X extends Y` | `class X : Y()` |
| `@PluginMethod public void method(PluginCall call)` | `@PluginMethod fun method(call: PluginCall)` |
| `call.getString("key")` | `call.getString("key")` (동일) |
| `if (x == null)` | `if (x == null)` 또는 `?: return` |
| `try { ... } catch (Exception e)` | `try { ... } catch (e: Exception)` |
| `Build.VERSION.SDK_INT >= Build.VERSION_CODES.O` | `Build.VERSION.SDK_INT >= Build.VERSION_CODES.O` (동일) |
| `new JSObject()` | `JSObject()` |
| `new Intent(...)` | `Intent(...)` |
| `Intent.FLAG_A \| Intent.FLAG_B` | `Intent.FLAG_A or Intent.FLAG_B` |
| `for (String perm : perms)` | `for (perm in perms)` |
| `private static final String TAG = "..."` | `companion object { private const val TAG = "..." }` |
| `Log.e(TAG, "msg", e)` | `Log.e(TAG, "msg", e)` (동일) |

#### 파일 변경 목록

| 작업 | 파일 |
|------|------|
| 수정 | `android/build.gradle` |
| 생성 | `android/src/main/java/kr/co/simplysm/capacitor/apkinstaller/ApkInstallerPlugin.kt` |
| 삭제 | `android/src/main/java/kr/co/simplysm/capacitor/apkinstaller/ApkInstallerPlugin.java` |

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| java/ 디렉토리에 .kt 배치 | 채택 | Gradle은 java/ 디렉토리의 .kt도 컴파일, 디렉토리 구조 변경 최소화 |
| kotlin/ 디렉토리 신설 | 미채택 | sourceSets 설정 추가 필요, 다른 패키지와 디렉토리 구조 불일치 |

### Vertical Slices

#### [x] Slice 1: build.gradle Kotlin 설정 추가 + Kotlin 소스 변환 + Java 소스 삭제
- **구현 내용:** build.gradle에 kotlin-android 플러그인 추가, ApkInstallerPlugin.java를 ApkInstallerPlugin.kt로 변환, 원본 Java 파일 삭제
- **Scenarios:**
  - Scenario: Kotlin 플러그인 적용
  - Scenario: 클래스 선언과 어노테이션 변환
  - Scenario: install 메서드 변환
  - Scenario: checkPermissions 메서드 변환
  - Scenario: requestPermissions 메서드 변환
  - Scenario: getVersionInfo 메서드 변환
  - Scenario: 변환 후 Java 소스 파일 삭제
