# Android Kotlin 리네이밍 검증

## 전제 조건
- Android Studio에서 capacitor-plugin-intent 프로젝트를 열 수 있다
- Android 기기 또는 에뮬레이터가 연결되어 있다

## 수행 절차
1. `packages/capacitor-plugin-intent/android/` 디렉토리를 Android Studio에서 연다
2. Kotlin 소스 파일이 `kr.co.simplysm.capacitor.intent` 패키지에 있는지 확인한다
3. `IntentPlugin.kt` 파일이 `@CapacitorPlugin(name = "Intent")` 어노테이션을 가지는지 확인한다
4. `build.gradle`의 namespace가 `kr.co.simplysm.capacitor.intent`인지 확인한다
5. Capacitor 앱에 플러그인을 등록하고 빌드한다
6. `Intent.subscribe(["test.ACTION"], callback)`을 호출하여 브로드캐스트 수신을 확인한다
7. `Intent.send({ action: "test.ACTION" })`을 호출하여 브로드캐스트 전송을 확인한다
8. `Intent.getLaunchIntent()`를 호출하여 실행 인텐트를 확인한다

## 기대 결과
- Android 빌드가 성공한다
- 플러그인이 "Intent" 이름으로 등록된다
- subscribe, send, getLaunchIntent, newIntent 리스너가 정상 동작한다
