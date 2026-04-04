# WBS

## Impact Mapping

- **Goal:** 4개 Capacitor 플러그인의 Android 네이티브 코드를 Kotlin으로 전환하여 null safety와 코드 간결성을 확보한다
  - **Actor:** 플러그인 개발자
    - **Impact:** Kotlin의 타입 안전성과 간결한 문법으로 더 안전하고 효율적으로 코드를 유지보수한다
      - **Deliverable:** 4개 패키지의 Java 소스를 Kotlin으로 변환하고 빌드 설정을 갱신한다

## Feature Catalog

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.
> Feature ID는 순서를 의미하지 않는다. 의존성과 실행 순서는 `/sd-wbs-dag`에서 결정한다.

### Epic: Capacitor 플러그인 Kotlin 전환

- [x] F001 auto-update 플러그인 Kotlin 전환
  - build.gradle에 Kotlin 플러그인 설정 추가
  - ApkInstallerPlugin.java → ApkInstallerPlugin.kt 변환

- [x] F002 broadcast 플러그인 Kotlin 전환
  - build.gradle에 Kotlin 플러그인 설정 추가
  - BroadcastPlugin.java → BroadcastPlugin.kt 변환

- [x] F003 file-system 플러그인 Kotlin 전환
  - build.gradle에 Kotlin 플러그인 설정 추가
  - FileSystemPlugin.java → FileSystemPlugin.kt 변환
  - FileSystemProvider.java → FileSystemProvider.kt 변환

- [x] F004 usb-storage 플러그인 Kotlin 전환
  - build.gradle에 Kotlin 플러그인 설정 추가
  - UsbStoragePlugin.java → UsbStoragePlugin.kt 변환

## 참조 자료

### 패키지별 소스 파일 경로

| 패키지 | Java 소스 | build.gradle |
|--------|-----------|-------------|
| auto-update | `android/src/main/java/kr/co/simplysm/capacitor/apkinstaller/ApkInstallerPlugin.java` | `android/build.gradle` |
| broadcast | `android/src/main/java/kr/co/simplysm/capacitor/broadcast/BroadcastPlugin.java` | `android/build.gradle` |
| file-system | `android/src/main/java/kr/co/simplysm/capacitor/filesystem/FileSystemPlugin.java`, `FileSystemProvider.java` | `android/build.gradle` |
| usb-storage | `android/src/main/java/kr/co/simplysm/capacitor/usbstorage/UsbStoragePlugin.java` | `android/build.gradle` |

### 외부 의존성

- broadcast: `androidx.appcompat:appcompat`
- file-system: `androidx.appcompat:appcompat`, `androidx.core` (FileProvider)
- usb-storage: `me.jahnen.libaums:core:0.9.1`

### 빌드 설정 공통사항

- 모든 패키지가 `compileSdk 35`, `minSdk 23`을 사용
- 모든 패키지가 `project(':capacitor-android')`에 의존
- 현재 모든 build.gradle이 `com.android.library` 플러그인만 적용 (Kotlin 플러그인 없음)

### Capacitor 플러그인 패턴

- 모든 플러그인이 `com.getcapacitor.Plugin`을 상속하고 `@CapacitorPlugin` 어노테이션 사용
- 메서드는 `@PluginMethod`로 표시, `PluginCall`로 요청/응답 처리
- JS 인터페이스는 `JSObject`, `JSArray` 사용

## Dependency Graph

| Feature | depends_on | 근거 |
|---------|-----------|------|
| F001    | -         | 독립 패키지, 다른 플러그인 참조 없음 |
| F002    | -         | 독립 패키지, 다른 플러그인 참조 없음 |
| F003    | -         | 독립 패키지, 다른 플러그인 참조 없음 |
| F004    | -         | 독립 패키지, 다른 플러그인 참조 없음 |

```mermaid
graph TD
    F001[F001 auto-update]
    F002[F002 broadcast]
    F003[F003 file-system]
    F004[F004 usb-storage]
```

> 4개 플러그인은 서로 다른 패키지에 위치하며 상호 import가 없다. 모든 Feature가 독립적이다.

## Execution Order

### Phase 1 (의존성 없음 — 모두 병렬 개발 가능)
- F001 auto-update 플러그인 Kotlin 전환
- F002 broadcast 플러그인 Kotlin 전환
- F003 file-system 플러그인 Kotlin 전환
- F004 usb-storage 플러그인 Kotlin 전환

## 제외 사항

- TypeScript 소스 코드 변경 (웹/JS 인터페이스는 변환 대상이 아님)
- 기능 추가나 API 변경 — 1:1 동일 기능 변환만 수행
- AndroidManifest.xml 변경
- 테스트 코드 작성 (기존에 테스트 코드 없음)
