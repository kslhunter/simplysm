# CLAUDE.md — `@simplysm/capacitor-plugin-auto-update`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

Capacitor 앱(Android/iOS, web fallback)의 **자동 업데이트** 플러그인. `service-server` 의 `auto-update-service` 에서 받은 zip diff 를 적용하고, Android 에선 APK 갱신도 처리. 빌드 타겟 `browser`.

## 구조

| 경로                    | 내용                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `src/AutoUpdate.ts`     | 플러그인 facade — 사용자가 import 해서 쓰는 API.                                      |
| `src/ApkInstaller*.ts`  | Android APK 설치(시스템 PackageInstaller) 트리거 + 권한 흐름.                         |
| `src/web/`              | Web 환경 fallback(브라우저 단독 실행 시 no-op 또는 PWA 새로고침 트리거).              |
| `android/`              | Capacitor Android 네이티브 모듈(Java/Kotlin) — `build.gradle` + `src/`.               |

워크스페이스 의존: `@simplysm/core-common`, `@simplysm/core-browser`, `@simplysm/service-common`, `@simplysm/service-client`, `@simplysm/capacitor-plugin-file-system`(zip 풀 때 사용).
peerDep: `@capacitor/core`.
외부: `semver`(버전 비교).

## 작업 시 주의

- TS API · Android 네이티브 메서드 시그니처는 **반드시 동기화**. Capacitor 의 `registerPlugin` 매핑이 일치해야 한다.
- 업데이트 적용 중 인터럽트 복구(부분 적용 zip 정리)는 핵심 동작. 동작 변경 시 강제 종료 시나리오를 재검증.
- iOS 네이티브는 현재 미포함(웹뷰 리로드 정도만 web fallback). 추가하려면 `ios/` 디렉토리 + `package.json` `files` 추가.
- 서버 측 호환은 `service-server/services/auto-update-service.ts` 와 `legacy/v1-auto-update-handler.ts` 양쪽을 본다(구버전 클라이언트 보존).
