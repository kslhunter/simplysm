# Feature F003 file-system 플러그인 Kotlin 전환

## 참조 자료

- [wbs.md](wbs.md)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 변환 방식 | 1:1 기계적 변환 | WBS에 명시된 범위. 기능 변경 없이 동일 동작 보장 |
| D2 | Kotlin 파일 위치 | 기존 Java 파일과 동일 패키지 경로, kotlin 디렉토리 | Android 표준 소스셋 구조 |
| D3 | Kotlin 플러그인 선언 방식 | `apply plugin: 'kotlin-android'` | F002(broadcast)에서 확립된 코드베이스 패턴을 따름 |

## 요구명세

```gherkin
Feature: F003 file-system 플러그인 Kotlin 전환

  Background:
    Given file-system 패키지의 Android 네이티브 코드가 Java로 작성되어 있다

  Rule: build.gradle에 Kotlin 빌드 설정을 추가한다

    Scenario: Kotlin 플러그인 적용
      Given build.gradle에 com.android.library만 적용되어 있다
      When Kotlin 플러그인 설정을 추가한다
      Then kotlin-android 플러그인이 적용된다
      And 기존 android 블록과 dependencies는 변경되지 않는다

  Rule: FileSystemPlugin.java를 FileSystemPlugin.kt로 변환한다

    Scenario: 클래스 선언과 어노테이션 변환
      Given FileSystemPlugin이 @CapacitorPlugin(name = "FileSystem") 어노테이션과 Plugin 상속으로 선언되어 있다
      When Kotlin으로 변환한다
      Then 동일한 어노테이션과 상속 구조가 Kotlin 문법으로 표현된다
      And companion object에 TAG와 PERMISSION_REQUEST_CODE 상수가 선언된다

    Scenario: checkPermissions 메서드 변환
      Given checkPermissions가 Build.VERSION.SDK_INT >= R 분기로 권한을 확인한다
      When Kotlin으로 변환한다
      Then 동일한 API 레벨 분기와 권한 확인 로직이 Kotlin 문법으로 표현된다
      And granted 결과를 JSObject로 반환한다

    Scenario: requestPermissions 메서드 변환
      Given requestPermissions가 API 레벨에 따라 다른 권한 요청 방식을 사용한다
      When Kotlin으로 변환한다
      Then API >= R일 때 ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION 인텐트를 실행한다
      And API < R일 때 READ/WRITE_EXTERNAL_STORAGE 권한을 요청한다

    Scenario: readdir 메서드 변환
      Given readdir이 경로의 디렉토리 목록을 JSArray로 반환한다
      When Kotlin으로 변환한다
      Then path 파라미터 null 체크, 디렉토리 존재 확인, 파일 목록 조회가 동일하게 동작한다
      And 각 파일의 name과 isDirectory를 JSObject로 반환한다

    Scenario: getStoragePath 메서드 변환
      Given getStoragePath가 7가지 type(external, externalFiles, externalCache, externalMedia, appData, appFiles, appCache)에 대해 경로를 반환한다
      When Kotlin으로 변환한다
      Then when 표현식으로 7가지 type을 처리한다
      And 알 수 없는 type에 대해 reject한다
      And path가 null이면 reject한다

    Scenario: getUri 메서드 변환
      Given getUri가 FileProvider를 통해 파일 URI를 생성한다
      When Kotlin으로 변환한다
      Then authority 문자열 구성과 FileProvider.getUriForFile 호출이 동일하게 동작한다
      And 예외 발생 시 에러 로그와 reject를 수행한다

    Scenario: writeFile 메서드 변환
      Given writeFile이 utf8 또는 base64 인코딩으로 파일을 쓴다
      When Kotlin으로 변환한다
      Then path와 data null 체크가 동일하게 동작한다
      And 부모 디렉토리 자동 생성이 동일하게 동작한다
      And base64 인코딩일 때 Base64.decode를, utf8일 때 toByteArray(Charsets.UTF_8)를 사용한다
      And BufferedOutputStream을 use 블록으로 사용한다

    Scenario: readFile 메서드 변환
      Given readFile이 utf8 또는 base64 인코딩으로 파일을 읽는다
      When Kotlin으로 변환한다
      Then path null 체크와 파일 존재 확인이 동일하게 동작한다
      And 8192바이트 버퍼로 스트림을 읽는 로직이 동일하게 동작한다
      And base64일 때 Base64.encodeToString을, utf8일 때 toString("UTF-8")을 사용한다

    Scenario: remove 메서드 변환
      Given remove가 deleteRecursively 헬퍼로 파일/디렉토리를 삭제한다
      When Kotlin으로 변환한다
      Then 재귀 삭제 로직이 동일하게 동작한다
      And 삭제 실패 시 reject한다

    Scenario: mkdir 메서드 변환
      Given mkdir이 디렉토리를 재귀적으로 생성한다
      When Kotlin으로 변환한다
      Then 이미 존재하거나 mkdirs() 성공 시 resolve한다
      And 생성 실패 시 reject한다

    Scenario: exists 메서드 변환
      Given exists가 파일/디렉토리 존재 여부를 반환한다
      When Kotlin으로 변환한다
      Then exists 결과를 JSObject로 반환한다

    Scenario: deleteRecursively 헬퍼 변환
      Given deleteRecursively가 디렉토리를 재귀적으로 삭제하는 private 메서드다
      When Kotlin으로 변환한다
      Then private 함수로 동일한 재귀 삭제 로직이 표현된다

  Rule: FileSystemProvider.java를 FileSystemProvider.kt로 변환한다

    Scenario: FileSystemProvider 클래스 변환
      Given FileSystemProvider가 FileProvider를 상속하는 빈 클래스다
      When Kotlin으로 변환한다
      Then FileProvider를 상속하는 빈 Kotlin 클래스가 생성된다

  Rule: Java 소스 파일을 삭제한다

    Scenario: 변환 완료 후 원본 Java 파일 제거
      Given Kotlin 파일이 정상적으로 생성되었다
      When 원본 Java 파일을 삭제한다
      Then FileSystemPlugin.java가 삭제된다
      And FileSystemProvider.java가 삭제된다
      And java 디렉토리 구조에서 해당 패키지 경로가 비어 있다면 빈 디렉토리도 삭제된다
```

## 구현계획

### 배경

file-system 패키지의 Android 네이티브 코드는 Java로 작성되어 있다. FileSystemPlugin.java(305줄)는 Capacitor Plugin으로서 파일 시스템 작업(읽기, 쓰기, 삭제, 디렉토리 조회 등)을 제공하며, FileSystemProvider.java(7줄)는 FileProvider를 상속하는 빈 클래스이다. F002(broadcast)에서 `apply plugin: 'kotlin-android'`과 `src/main/kotlin/` 디렉토리 구조가 확립되었다.

### 목표

- FileSystemPlugin.java를 FileSystemPlugin.kt로 1:1 변환
- FileSystemProvider.java를 FileSystemProvider.kt로 1:1 변환
- build.gradle에 kotlin-android 플러그인 추가
- 원본 Java 파일 및 빈 java 디렉토리 구조 삭제

### 비목표

- TypeScript 소스 변경
- 기능 추가/변경/API 변경
- AndroidManifest.xml 변경
- 테스트 코드 작성

### 설계

#### build.gradle 변경

`apply plugin: 'kotlin-android'`을 `apply plugin: 'com.android.library'` 다음 줄에 추가한다. android 블록과 dependencies는 변경하지 않는다.

#### Kotlin 소스 위치

```
android/src/main/kotlin/kr/co/simplysm/capacitor/filesystem/
  FileSystemPlugin.kt
  FileSystemProvider.kt
```

#### 주요 변환 규칙

| Java 패턴 | Kotlin 변환 |
|-----------|------------|
| `public class Foo extends Bar` | `class Foo : Bar()` |
| `@CapacitorPlugin(name = "...")` | 동일 (Kotlin에서도 동일 어노테이션) |
| `static final` 상수 | `companion object { const val ... }` |
| `switch/case` | `when` 표현식 |
| `try-with-resources` | `.use { }` 확장 함수 |
| `new File(path)` | `File(path)` |
| `call.getString("key")` | `call.getString("key")` (동일) |
| `for (File f : files)` | `for (f in files)` |
| 타입 캐스트 `(Type) value` | `value as Type` 또는 스마트 캐스트 |
| null 체크 `if (x == null)` | `if (x == null)` 또는 `?: return` |

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| kotlin-android 플러그인 (legacy name) | 채택 | F002에서 확립된 코드베이스 패턴 |
| id("org.jetbrains.kotlin.android") (Kotlin DSL) | 미채택 | 현재 build.gradle이 Groovy DSL 사용 |
| Kotlin 파일을 java/ 디렉토리에 배치 | 미채택 | kotlin/ 디렉토리가 F002에서 확립된 패턴 |

### Vertical Slices

#### Slice 1: build.gradle Kotlin 플러그인 추가 [x]
- **구현 내용:** build.gradle에 `apply plugin: 'kotlin-android'` 추가
- **Scenarios:**
  - Scenario: Kotlin 플러그인 적용

#### Slice 2: FileSystemPlugin.kt 생성 [x]
- **구현 내용:** FileSystemPlugin.java의 전체 내용을 Kotlin으로 변환하여 FileSystemPlugin.kt 생성
- **의존:** Slice 1
- **Scenarios:**
  - Scenario: 클래스 선언과 어노테이션 변환
  - Scenario: checkPermissions 메서드 변환
  - Scenario: requestPermissions 메서드 변환
  - Scenario: readdir 메서드 변환
  - Scenario: getStoragePath 메서드 변환
  - Scenario: getUri 메서드 변환
  - Scenario: writeFile 메서드 변환
  - Scenario: readFile 메서드 변환
  - Scenario: remove 메서드 변환
  - Scenario: mkdir 메서드 변환
  - Scenario: exists 메서드 변환
  - Scenario: deleteRecursively 헬퍼 변환

#### Slice 3: FileSystemProvider.kt 생성 [x]
- **구현 내용:** FileSystemProvider.java의 내용을 Kotlin으로 변환하여 FileSystemProvider.kt 생성
- **의존:** Slice 1
- **Scenarios:**
  - Scenario: FileSystemProvider 클래스 변환

#### Slice 4: Java 소스 파일 삭제 [x]
- **구현 내용:** 원본 Java 파일 삭제 및 빈 java 디렉토리 구조 정리
- **의존:** Slice 2, Slice 3
- **Scenarios:**
  - Scenario: 변환 완료 후 원본 Java 파일 제거
