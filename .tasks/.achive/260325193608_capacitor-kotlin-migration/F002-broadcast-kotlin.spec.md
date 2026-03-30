# F002 broadcast 플러그인 Kotlin 전환 - 수동 테스트

## 전제 조건
- Android 디바이스 또는 에뮬레이터가 연결되어 있다
- Capacitor 앱이 빌드 및 실행 가능하다
- broadcast 플러그인이 앱에 등록되어 있다

## 수행 절차

### 1. 빌드 확인
1. `npx cap sync android` 실행
2. Android Studio에서 프로젝트 열기
3. 빌드가 성공하는지 확인

### 2. subscribe/unsubscribe 테스트
1. JS에서 `Broadcast.subscribe({ filters: ['com.test.ACTION'] })` 호출
2. 콜백에서 receiverId가 반환되는지 확인
3. adb로 `adb shell am broadcast -a com.test.ACTION --es key value` 전송
4. 콜백이 intent 데이터와 함께 호출되는지 확인
5. `Broadcast.unsubscribe({ id: receiverId })` 호출
6. 다시 broadcast 전송 시 콜백이 호출되지 않는지 확인

### 3. send 테스트
1. JS에서 `Broadcast.send({ action: 'com.test.SEND', extras: { key: 'value' } })` 호출
2. logcat에서 에러 없이 완료되는지 확인

### 4. getLaunchIntent 테스트
1. JS에서 `Broadcast.getLaunchIntent()` 호출
2. launch intent의 action이 반환되는지 확인

### 5. unsubscribeAll 테스트
1. 여러 필터로 subscribe 호출
2. `Broadcast.unsubscribeAll()` 호출
3. 모든 receiver가 해제되는지 확인 (broadcast 전송 시 콜백 미호출)

## 기대 결과
- 모든 API 호출이 Java 버전과 동일하게 동작한다
- Android 빌드가 성공한다
- 런타임 에러가 발생하지 않는다
