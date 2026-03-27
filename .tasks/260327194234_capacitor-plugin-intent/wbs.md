# WBS

## Impact Mapping

- **Goal:** Capacitor 앱에서 Android Intent 통신(Broadcast + Activity 결과)을 단일 플러그인으로 처리하여, 프로젝트별 커스텀 플러그인 작성을 제거한다
  - **Actor:** simplysm 기반 Capacitor 앱 개발자
    - **Impact:** 외부 앱 연동(결제, 인증 등) 시 커스텀 플러그인을 만들지 않고 통합 Intent 플러그인의 API만으로 처리한다
      - **Deliverable:** `capacitor-plugin-broadcast` → `capacitor-plugin-intent`로 리네이밍 + `startActivityForResult` API 추가

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. 패키지 리네이밍 및 기능 확장

- [x] Feature 1.1 capacitor-plugin-broadcast → capacitor-plugin-intent 리네이밍
  - 디렉토리, npm 패키지명, Java 네임스페이스/클래스명 변경
  - TypeScript 클래스명, 인터페이스명, 파일명 변경
  - 빌드 설정(simplysm.js, build.gradle) 갱신 (tsconfig.base.json에 경로 별칭 없어 별칭 변경 불필요)
  - 기존 Broadcast API(subscribe, send, getLaunchIntent 등) 기능 보존
  - 문서(README) 갱신 및 기존 npm 패키지 deprecated 처리

- [x] Feature 1.2 startActivityForResult API 추가
  - Intent 구성 옵션 지원 (action, uri, extras, package, component, type)
  - Android 네이티브에서 startActivityForResult 호출 및 onActivityResult 결과 수신
  - TypeScript 인터페이스 및 공개 API 추가
  - 웹 환경 stub 구현

## 참조 자료

- 기존 패키지 경로: `packages/capacitor-plugin-broadcast/`
- Java 네임스페이스: `kr.co.simplysm.capacitor.broadcast` → `kr.co.simplysm.capacitor.intent`
- Java 클래스: `BroadcastPlugin` → `IntentPlugin`
- Capacitor 플러그인 등록명: `"Broadcast"` → `"Intent"`
- TypeScript 클래스: `Broadcast` → `Intent`, `IBroadcastPlugin` → `IIntentPlugin`, `IBroadcastResult` → `IIntentResult`
- startActivityForResult 반환 타입: `{ resultCode: number; data?: string; extras?: Record<string, unknown> }`
- Intent 구성 옵션: `{ action: string; uri?: string; extras?: Record<string, unknown>; package?: string; component?: string; type?: string }`
- Android `resultCode` 값: `RESULT_OK = -1`, `RESULT_CANCELED = 0`
- monorepo 내 다른 패키지에서 이 플러그인을 import하는 곳 없음 (외부 프로젝트에서 npm으로 사용)

## 제외 사항

- iOS 지원
- Web 네이티브 구현 (stub만 제공)
- flags, categories 등 사용 빈도 낮은 Intent 속성
