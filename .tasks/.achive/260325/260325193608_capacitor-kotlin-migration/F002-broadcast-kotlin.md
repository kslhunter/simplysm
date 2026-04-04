# Feature F002 broadcast 플러그인 Kotlin 전환

## 참조 자료

- [wbs.md](wbs.md)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 변환 방식 | 1:1 기계적 변환 | 기능 변경 없이 언어만 전환, API 동작 동일 유지 |
| D2 | Java 파일 처리 | Kotlin 변환 완료 후 삭제 | 동일 클래스가 두 언어로 존재하면 빌드 충돌 |
| D3 | Kotlin 플러그인 | `kotlin-android` 적용 | Android 라이브러리 모듈의 표준 Kotlin 플러그인 |

## 요구명세

```gherkin
Feature: F002 broadcast 플러그인 Kotlin 전환

  Background:
    Given capacitor-plugin-broadcast 패키지의 Android 네이티브 코드가 존재한다

  Rule: build.gradle에 Kotlin 빌드 설정을 추가한다

    Scenario: Kotlin 플러그인이 build.gradle에 적용된다
      Given build.gradle에 com.android.library 플러그인만 적용되어 있다
      When kotlin-android 플러그인을 추가한다
      Then build.gradle에 kotlin-android 플러그인이 선언되어 있다
      And 기존 android 블록과 dependencies 블록은 변경되지 않는다

  Rule: BroadcastPlugin.java를 BroadcastPlugin.kt로 1:1 변환한다

    Scenario: 클래스 선언과 어노테이션이 Kotlin으로 변환된다
      Given BroadcastPlugin.java에 @CapacitorPlugin(name = "Broadcast") 어노테이션과 Plugin 상속이 있다
      When Kotlin으로 변환한다
      Then BroadcastPlugin.kt에 동일한 @CapacitorPlugin 어노테이션과 Plugin 상속이 존재한다
      And companion object에 TAG 상수가 선언된다
      And receivers 맵이 mutableMapOf로 초기화된다

    Scenario: subscribe 메서드가 Kotlin으로 변환된다
      Given subscribe 메서드가 filters 배열을 받아 BroadcastReceiver를 등록한다
      When Kotlin으로 변환한다
      Then 동일한 콜백 기반 구독 로직이 Kotlin 문법으로 존재한다
      And Build.VERSION.SDK_INT >= TIRAMISU 분기가 유지된다
      And filters 미입력 시 call.reject 동작이 유지된다

    Scenario: unsubscribe 메서드가 Kotlin으로 변환된다
      Given unsubscribe 메서드가 id로 특정 receiver를 해제한다
      When Kotlin으로 변환한다
      Then 동일한 receiver 해제 로직이 Kotlin 문법으로 존재한다
      And id 미입력 시 call.reject 동작이 유지된다

    Scenario: unsubscribeAll 메서드가 Kotlin으로 변환된다
      Given unsubscribeAll 메서드가 모든 receiver를 해제한다
      When Kotlin으로 변환한다
      Then 모든 receiver 순회 해제 및 맵 클리어 로직이 Kotlin 문법으로 존재한다

    Scenario: send 메서드가 Kotlin으로 변환된다
      Given send 메서드가 action과 extras로 브로드캐스트를 전송한다
      When Kotlin으로 변환한다
      Then 동일한 Intent 생성 및 sendBroadcast 로직이 Kotlin 문법으로 존재한다
      And action 미입력 시 call.reject 동작이 유지된다

    Scenario: getLaunchIntent 메서드가 Kotlin으로 변환된다
      Given getLaunchIntent 메서드가 Activity의 launch intent를 반환한다
      When Kotlin으로 변환한다
      Then 동일한 intent 조회 및 JSON 변환 로직이 Kotlin 문법으로 존재한다

    Scenario: 헬퍼 메서드들이 Kotlin으로 변환된다
      Given populateExtras, jsonToBundle, intentToJson, bundleToJson 헬퍼가 있다
      When Kotlin으로 변환한다
      Then 4개 헬퍼 메서드가 모두 Kotlin 문법으로 존재한다
      And 타입별 분기(String, Integer, Long, Double, Boolean, JSONArray, JSONObject, Bundle, 배열 등)가 when 식으로 변환된다

    Scenario: 라이프사이클 메서드가 Kotlin으로 변환된다
      Given handleOnNewIntent와 handleOnDestroy 오버라이드가 있다
      When Kotlin으로 변환한다
      Then 두 메서드가 override fun으로 선언된다
      And handleOnDestroy에서 모든 receiver 해제 후 super 호출이 유지된다

  Rule: 변환 후 원본 Java 파일을 삭제한다

    Scenario: BroadcastPlugin.java가 삭제된다
      Given BroadcastPlugin.kt 변환이 완료되었다
      When 원본 Java 파일을 삭제한다
      Then BroadcastPlugin.java가 더 이상 존재하지 않는다
      And BroadcastPlugin.kt만 소스 디렉토리에 존재한다
```

## 구현계획

### 배경

capacitor-plugin-broadcast 패키지의 Android 네이티브 코드(`BroadcastPlugin.java`, 300줄)를 Kotlin으로 1:1 기계적 변환한다. 이 플러그인은 Android BroadcastReceiver를 Capacitor JS 인터페이스로 노출하며, subscribe/unsubscribe/send/getLaunchIntent 메서드와 Intent-JSON 변환 헬퍼로 구성된다.

### 목표

- `BroadcastPlugin.java`를 `BroadcastPlugin.kt`로 동일 기능 변환
- `build.gradle`에 Kotlin 빌드 설정 추가
- 원본 Java 파일 삭제

### 비목표

- 기능 추가, API 변경
- TypeScript 소스 변경
- AndroidManifest.xml 변경
- 테스트 코드 작성 (하드웨어 의존적 BroadcastReceiver — mock 무의미)

### 설계

#### build.gradle 변경

`kotlin-android` 플러그인을 추가한다:

```groovy
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'
```

기존 `android` 블록과 `dependencies` 블록은 변경하지 않는다.

#### Kotlin 변환 주요 매핑

| Java | Kotlin |
|------|--------|
| `private static final String TAG` | `companion object { private const val TAG }` |
| `private final Map<String, BroadcastReceiver>` | `private val receivers = mutableMapOf<String, BroadcastReceiver>()` |
| `instanceof` 체인 | `when (value) { is Type -> ... }` |
| `Iterator<String> keys = obj.keys()` | `obj.keys().forEach { key -> }` 또는 `iterator` 사용 |
| null 체크 `if (x == null)` | Kotlin null safety (`?.`, `?:`, `== null`) |
| `try-catch (Exception e)` | `try-catch (e: Exception)` |
| `@Override` | `override` 키워드 |
| `new BroadcastReceiver() { ... }` | `object : BroadcastReceiver() { ... }` |

#### 파일 경로

| 구분 | 경로 |
|------|------|
| 삭제 | `android/src/main/java/kr/co/simplysm/capacitor/broadcast/BroadcastPlugin.java` |
| 생성 | `android/src/main/kotlin/kr/co/simplysm/capacitor/broadcast/BroadcastPlugin.kt` |
| 수정 | `android/build.gradle` |

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| Kotlin 소스를 java 디렉토리에 배치 | 미채택 | 관례상 kotlin 전용 디렉토리 사용이 명확함 |
| Kotlin 소스를 kotlin 디렉토리에 배치 | 채택 | Android 표준 관례, java/kotlin 소스 분리 |

### Vertical Slices

#### Slice 1: build.gradle Kotlin 설정 추가
- **구현 내용:** `kotlin-android` 플러그인 추가
- **Scenarios:**
  - Scenario: Kotlin 플러그인이 build.gradle에 적용된다

#### Slice 2: BroadcastPlugin.kt 생성 및 Java 파일 삭제
- **구현 내용:** Java 소스를 Kotlin으로 1:1 변환, 원본 삭제
- **의존:** Slice 1
- **Scenarios:**
  - Scenario: 클래스 선언과 어노테이션이 Kotlin으로 변환된다
  - Scenario: subscribe 메서드가 Kotlin으로 변환된다
  - Scenario: unsubscribe 메서드가 Kotlin으로 변환된다
  - Scenario: unsubscribeAll 메서드가 Kotlin으로 변환된다
  - Scenario: send 메서드가 Kotlin으로 변환된다
  - Scenario: getLaunchIntent 메서드가 Kotlin으로 변환된다
  - Scenario: 헬퍼 메서드들이 Kotlin으로 변환된다
  - Scenario: 라이프사이클 메서드가 Kotlin으로 변환된다
  - Scenario: BroadcastPlugin.java가 삭제된다
