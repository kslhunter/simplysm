# Feature F004 usb-storage 플러그인 Kotlin 전환

## 참조 자료

- [wbs.md](wbs.md)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | Kotlin 소스 파일 위치 | 기존 Java 패키지 디렉토리 유지 (`android/src/main/java/...`) | Gradle은 `src/main/java` 경로에서 .kt 파일도 컴파일한다. 별도 sourceSet 설정 불필요 |
| D2 | Java Optional 대체 | Kotlin `firstOrNull()` + Elvis 연산자 | Kotlin 관용적 null 처리 패턴 |

## 요구명세

```gherkin
Feature: F004 usb-storage 플러그인 Kotlin 전환

  Background:
    Given capacitor-plugin-usb-storage 패키지의 Android 네이티브 코드가 존재한다

  Rule: build.gradle에 Kotlin 플러그인을 설정한다

    Scenario: Kotlin Android 플러그인 추가
      Given build.gradle에 com.android.library 플러그인만 적용되어 있다
      When kotlin-android 플러그인을 추가한다
      Then build.gradle에 kotlin-android 플러그인이 적용된다
      And 기존 의존성(capacitor-android, libaums)은 유지된다

  Rule: UsbStoragePlugin.java를 UsbStoragePlugin.kt로 1:1 변환한다

    Scenario: 클래스 선언과 어노테이션 변환
      Given Java 클래스 UsbStoragePlugin이 @CapacitorPlugin(name = "UsbStorage") 어노테이션과 Plugin 상속을 사용한다
      When Kotlin으로 변환한다
      Then 동일한 어노테이션과 상속 구조가 Kotlin 문법으로 유지된다
      And companion object에 TAG, ACTION_USB_PERMISSION, MAX_FILE_SIZE 상수가 정의된다

    Scenario: getDevices 메서드 변환
      Given Java getDevices 메서드가 UsbMassStorageDevice 목록을 JSArray로 반환한다
      When Kotlin으로 변환한다
      Then 동일한 동작이 Kotlin 문법으로 유지된다
      And 예외 발생 시 call.reject로 에러를 반환한다

    Scenario: requestPermissions 메서드 변환
      Given Java requestPermissions 메서드가 vendorId/productId 파라미터 검증, 권한 확인, BroadcastReceiver 등록, PendingIntent 생성을 수행한다
      When Kotlin으로 변환한다
      Then 동일한 동작이 Kotlin 문법으로 유지된다
      And Build.VERSION.SDK_INT 분기 로직이 보존된다
      And 익명 BroadcastReceiver가 object 표현식으로 변환된다

    Scenario: checkPermissions 메서드 변환
      Given Java checkPermissions 메서드가 USB 디바이스 권한 상태를 확인한다
      When Kotlin으로 변환한다
      Then 동일한 동작이 Kotlin 문법으로 유지된다

    Scenario: readdir 메서드 변환
      Given Java readdir 메서드가 USB 디바이스의 디렉토리 목록을 읽는다
      When Kotlin으로 변환한다
      Then 동일한 동작이 Kotlin 문법으로 유지된다
      And device.init()과 device.close()의 try-finally 구조가 보존된다

    Scenario: readFile 메서드 변환
      Given Java readFile 메서드가 USB 디바이스의 파일을 Base64로 읽는다
      When Kotlin으로 변환한다
      Then 동일한 동작이 Kotlin 문법으로 유지된다
      And MAX_FILE_SIZE 검증 로직이 보존된다
      And ByteBuffer와 UsbFileInputStream 사용이 보존된다

    Scenario: getDevice 헬퍼 메서드 변환
      Given Java getDevice 메서드가 vendorId/productId로 UsbMassStorageDevice를 찾는다
      When Kotlin으로 변환한다
      Then Optional 대신 firstOrNull()과 Elvis 연산자를 사용한다
      And 디바이스를 찾지 못하면 동일한 Exception을 던진다

  Rule: 원본 Java 파일을 삭제한다

    Scenario: Java 소스 파일 제거
      Given UsbStoragePlugin.kt가 생성되었다
      When 원본 UsbStoragePlugin.java를 삭제한다
      Then android/src/main/java/kr/co/simplysm/capacitor/usbstorage/ 디렉토리에 UsbStoragePlugin.kt만 존재한다
```

## 구현계획

### 배경

capacitor-plugin-usb-storage 패키지의 Android 네이티브 코드가 Java로 작성되어 있다. UsbStoragePlugin.java (278줄)는 Capacitor Plugin을 상속하며, USB mass storage 장치 열거, 권한 요청/확인, 디렉토리 목록 읽기, 파일 읽기 기능을 제공한다. 외부 의존성으로 `me.jahnen.libaums:core:0.9.1`을 사용한다.

### 목표

- UsbStoragePlugin.java를 UsbStoragePlugin.kt로 1:1 변환한다
- build.gradle에 kotlin-android 플러그인을 추가한다
- 모든 기존 기능을 동일하게 유지한다

### 비목표

- 기능 추가나 API 변경
- TypeScript 소스 변경
- AndroidManifest.xml 변경
- 자동화 테스트 작성 (USB 하드웨어 의존)

### 설계

#### build.gradle 변경

`kotlin-android` 플러그인을 추가한다:

```groovy
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'
```

기존 의존성은 그대로 유지한다.

#### Java -> Kotlin 변환 매핑

| Java 패턴 | Kotlin 패턴 |
|-----------|------------|
| `public class UsbStoragePlugin extends Plugin` | `class UsbStoragePlugin : Plugin()` |
| `private static final String TAG = ...` | `companion object { private const val TAG = ... }` |
| `private static final long MAX_FILE_SIZE = 100L * 1024 * 1024` | `companion object { private const val MAX_FILE_SIZE = 100L * 1024 * 1024 }` |
| `Integer vendorId = call.getInt(...)` | `val vendorId = call.getInt(...)` (nullable Int?) |
| `vendorId == null \|\| productId == null` | `vendorId == null \|\| productId == null` (동일) |
| `for (UsbMassStorageDevice device : devices)` | `for (device in devices)` |
| `Optional<...>.stream().filter().findFirst()` | `devices.firstOrNull { ... }` |
| `!optDevice.isPresent()` → `throw` | `?: throw Exception(...)` (Elvis) |
| `new BroadcastReceiver() { @Override ... }` | `object : BroadcastReceiver() { ... }` |
| `try { ... } finally { device.close() }` | `try { ... } finally { device.close() }` (동일) |
| `(UsbManager) getContext().getSystemService(...)` | `getContext().getSystemService(Context.USB_SERVICE) as UsbManager` |
| `Base64.encodeToString(...)` | `Base64.encodeToString(...)` (동일) |

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| Java 파일과 동일 디렉토리에 .kt 생성 | 채택 | Gradle이 src/main/java에서 .kt도 컴파일, 설정 추가 불필요 |
| src/main/kotlin 별도 디렉토리 생성 | 미채택 | 추가 sourceSet 설정 필요, 기존 패턴과 불일치 |
| Kotlin DSL (build.gradle.kts) 전환 | 미채택 | 범위 초과, 다른 플러그인과의 일관성 유지 |

### Vertical Slices

#### Slice 1: build.gradle Kotlin 플러그인 설정
- [x] **구현 내용:** build.gradle에 `apply plugin: 'kotlin-android'` 추가
- **Scenarios:**
  - Scenario: Kotlin Android 플러그인 추가

#### Slice 2: UsbStoragePlugin.kt 생성 및 Java 파일 삭제
- [x] **구현 내용:** UsbStoragePlugin.java를 UsbStoragePlugin.kt로 변환하고, 원본 Java 파일을 삭제한다
- **의존:** Slice 1
- **Scenarios:**
  - Scenario: 클래스 선언과 어노테이션 변환
  - Scenario: getDevices 메서드 변환
  - Scenario: requestPermissions 메서드 변환
  - Scenario: checkPermissions 메서드 변환
  - Scenario: readdir 메서드 변환
  - Scenario: readFile 메서드 변환
  - Scenario: getDevice 헬퍼 메서드 변환
  - Scenario: Java 소스 파일 제거
