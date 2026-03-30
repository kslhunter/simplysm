# WBS

## Impact Mapping

- **Goal:** 프로젝트별 커스텀 Capacitor 플러그인 생성 없이 startActivityForResult를 사용할 수 있도록 표준 플러그인 제공
  - **Actor:** simplysm 모노레포 기반 Capacitor 앱 개발자
    - **Impact:** 외부 앱(결제 앱 등) 호출 후 결과 수신을 표준 플러그인 하나로 처리한다
      - **Deliverable:** capacitor-plugin-intent (기존 broadcast + startActivityForResult 통합)

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. 패키지 리네이밍

- [x] Feature 1.1 broadcast → intent 리네이밍
  - 디렉토리명, 패키지명, Capacitor 플러그인 설정 변경
  - TypeScript 인터페이스·클래스·파일명 갱신
  - Android Kotlin 패키지 경로·클래스명 갱신
  - 모노레포 내 의존성 참조 일괄 업데이트
  - 기존 broadcast 기능이 새 이름으로 정상 동작 확인

### Epic 2. startActivityForResult 기능

- [x] Feature 2.1 startActivityForResult 구현
  - TypeScript 플러그인 인터페이스에 메서드 정의 추가
  - Android Kotlin에서 ActivityResultLauncher 기반 구현
  - Web 환경 스텁 구현
  - TypeScript API 래퍼 클래스에 정적 메서드 추가

## 참조 자료

### startActivityForResult API 시그니처

결정된 확장 API:

```typescript
startActivityForResult(options: {
  action?: string;
  uri?: string;
  extras?: Record<string, unknown>;
  type?: string;         // MIME type
  packageName?: string;  // 특정 앱 지정
  className?: string;    // 특정 Activity 지정
  flags?: number;        // Intent flags
}): Promise<{
  resultCode: number;
  data?: {
    action?: string;
    uri?: string;
    extras?: Record<string, unknown>;
  };
}>
```

### 기존 broadcast API

유지해야 하는 기존 메서드: subscribe, unsubscribe, unsubscribeAll, send, getLaunchIntent, newIntent 리스너

### Android 구현

- ActivityResultLauncher (AndroidX Activity Result API) 사용
- 기존 Intent↔JSON 변환 유틸 코드(populateExtras, intentToJson, bundleToJson, jsonToBundle) 재활용
- Android 13+ (API 33): RECEIVER_EXPORTED 플래그 유지

### 플랫폼

- Android 전용 (Web은 스텁)
- Capacitor v7+
- 기존 broadcast 플러그인의 주간 다운로드: 1,138

### 참조 파일

- `packages/capacitor-plugin-intent/` — 리네이밍 완료. TypeScript API, Android Kotlin 구현, 파일 구조를 확인한다
- `packages/capacitor-plugin-intent/src/IntentPlugin.ts` — 플러그인 인터페이스 정의. 유지할 메서드 목록과 타입을 확인한다
- `packages/capacitor-plugin-intent/android/src/main/kotlin/kr/co/simplysm/capacitor/intent/IntentPlugin.kt` — Android 구현. Intent↔JSON 변환 유틸 코드를 확인한다
- `packages/capacitor-plugin-intent/src/Intent.ts` — TypeScript API 래퍼. 정적 메서드 패턴을 확인한다

## 제외 사항

- iOS 지원 (Android 전용 플러그인)
- ContentResolver, ContentProvider 등 기타 Intent 관련 기능
- startActivity (결과 수신 없는 단순 실행) — 필요 시 별도 Feature로 추가
