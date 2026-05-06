# CLAUDE.md — `@simplysm/capacitor-plugin-intent`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

Android **Intent 송수신** Capacitor 플러그인. 외부 앱 호출(액션·extras) + 인텐트 결과 수신. 빌드 타겟 `browser`.

## 구조

| 경로                       | 내용                                                                |
| -------------------------- | ------------------------------------------------------------------- |
| `src/Intent.ts`            | 사용자 facade.                                                      |
| `src/IntentPlugin.ts`      | Capacitor 인터페이스 시그니처.                                      |
| `src/web/`                 | Web fallback(no-op 또는 `window.open` 정도).                        |
| `android/`                 | Android Intent 처리(`startActivityForResult`, BroadcastReceiver 등).|

워크스페이스 의존 없음. peerDep: `@capacitor/core`.

## 작업 시 주의

- iOS 환경에서 의미 있는 동작이 없으므로(URL Scheme 으로 대체 필요) 호출 측에서 platform 분기 권장.
- 결과 콜백(intent result) 등록은 라이프사이클(액티비티 재생성) 에서 유실되지 않게 native 측에서 보존하는 패턴을 유지.
- 네이티브에 노출하는 액션·카테고리 화이트리스트는 네이티브 코드 내부에서만 관리. TS 레벨에서 임의 액션을 허용하지 마라(보안).
