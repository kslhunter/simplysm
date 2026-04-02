# 디버그: Android 스플래시 스크린 로고 겹침

## 출처

- **origin:** `direct`
- **완료 시 참고:** 해당 없음

## 에러 증상

- **에러 메시지:** 없음 (시각적 증상)
- **위치:** `packages/sd-cli/src/capacitor/capacitor.ts` (styles.xml 미수정 + `_setupIcon` 470-530줄)
- **재현:** sd-cli dev + device로 Android 7.1.2 장치 연결 → 앱 아이콘 탭 → 로고 2개가 다른 좌표로 겹쳐 표시 + 녹색 동그라미 아이콘도 겹침

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: 로고 2개 다른좌표 겹침 | E2: 녹색 동그라미 아이콘 | E3: Android 7.1.2 (API 25) | E4: installSplashScreen 미호출 | E5: Theme.SplashScreen parent |
|----|---|---|---|---|---|
| H1: windowBg(compat_splash_screen) + android:bg(@drawable/splash) 이중 표시 | C(code) | C(code) | C(code) | C(doc) | C(code) |
| H2: capacitor-assets 실패로 기본 리소스 잔존 | C(infer) | C(code) | N | N | N |
| H3: transparent 배경 레이어 투과 (폐기) | C(infer) | I → 폐기 | N | N | N |
| H1-old: Android 12+ 시스템 스플래시 (폐기) | - | - | I → 폐기 | - | - |

### 결과: 확정 — H1

`Theme.SplashScreen` parent 테마가 `android:windowBackground`를 `@drawable/compat_splash_screen`으로 설정. 이 drawable은 layer-list로:

1. 배경색 (`?windowSplashScreenBackground`)
2. 아이콘 배경 (`@drawable/icon_background`) ← 녹색 동그라미
3. 앱 아이콘 (`?windowSplashScreenAnimatedIcon`) ← 로고 1
4. 원형 마스크

동시에 자식 테마의 `android:background`가 `@drawable/splash`(로고 포함)를 설정 ← 로고 2

두 레이어가 동시에 렌더링되어 로고 겹침 + 녹색 아이콘 표시.

C(code) 4건으로 확정.

## 해결 방안

### 방안 A: styles.xml에서 `windowSplashScreenAnimatedIcon` 커스텀 설정

- **설명:** `android:background` 제거, `windowSplashScreenAnimatedIcon`에 생성된 아이콘 지정
- **장점:** Theme.SplashScreen의 설계 의도에 맞는 정석적 사용
- **반론:** styles.xml 정규식 수정이 Capacitor 버전 업데이트 시 깨질 수 있음
- **점수:** 근본성 10 / 호환성 9 / 안정성 7 → **평균 8.7/10**

### 방안 B: parent를 `Theme.AppCompat.DayNight.NoActionBar`로 변경

- **설명:** `AppTheme.NoActionBarLaunch`의 parent를 `Theme.SplashScreen` → `Theme.AppCompat.DayNight.NoActionBar`로 변경. `android:background @drawable/splash` 유지
- **장점:** 가장 단순. compat 라이브러리의 복잡한 레이어 완전 제거. 현재 installSplashScreen() 미사용으로 기능 손실 없음
- **반론:** AndroidX SplashScreen 기능 사용 불가 (현재도 미사용)
- **점수:** 근본성 9 / 호환성 9 / 안정성 9 → **평균 9.0/10**

### 방안 C: 수행 안 함

- **설명:** 현 상태 유지
- **장점:** 코드 변경 없음
- **반론:** 로고 겹침 현상 지속
- **점수:** 근본성 1 / 호환성 10 / 안정성 10 → **평균 7.0/10**

## 선택 결과

**방안 B** (평균 9.0/10)

`_configureAndroid`에서 styles.xml의 `AppTheme.NoActionBarLaunch` parent를 `Theme.SplashScreen` → `Theme.AppCompat.DayNight.NoActionBar`로 변경. 현재 `installSplashScreen()`을 호출하지 않으므로 `Theme.SplashScreen`의 기능을 사용하지 않는 상태이며, parent 변경으로 불필요한 `compat_splash_screen` 레이어가 제거됨.
