# 코드 리뷰: capacitor-plugin-intent

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/capacitor-plugin-intent/` (Feature 1.1 리네이밍 + Feature 1.2 startActivityForResult) |
| 일시 | 2026-03-27 21:27 |
| 소스 파일 수 | 7개 (TS 4, Java 1, JSON 1, Gradle 1) |
| 발견 이슈 | 2건 (Critical: 0, Medium: 0, Low: 2) |

## 전체 평가

Feature 1.1(리네이밍)과 Feature 1.2(startActivityForResult) 구현이 요구명세에 충실하게 완료되었다. 핵심 로직에 문제가 없으며, 리네이밍도 누락 없이 일관적이다.

- **리네이밍**: 디렉토리, npm 패키지명, Java 네임스페이스/클래스명, TypeScript 클래스/인터페이스명, Capacitor 등록명, build.gradle namespace, simplysm.js 키, README가 모두 `intent/Intent`로 변경됨
- **startActivityForResult**: TypeScript 타입(`IStartActivityForResultOptions`, `IActivityResult`), Android 네이티브(`@PluginMethod` + `@ActivityCallback`), 웹 stub이 설계대로 구현됨
- **Intent 구성**: action, uri, type, package, component, extras 옵션이 올바르게 처리됨 (`setDataAndType` 분기 포함)
- **결과 처리**: 항상 resolve (RESULT_CANCELED도 resolve), data/extras 선택적 반환이 스펙과 일치
- **에러 처리**: `ActivityNotFoundException` 등 예외가 try-catch로 reject됨
- **기존 API 보존**: subscribe, unsubscribe, unsubscribeAll, send, getLaunchIntent 시그니처 및 동작 변경 없음

## 이슈 목록

### Low

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/capacitor-plugin-intent/README.md:39-51
title: README.md에 Feature 1.2 API(startActivityForResult) 미반영
description: |
  README.md의 IIntentPlugin 인터페이스와 Intent 클래스 문서에
  startActivityForResult, IStartActivityForResultOptions, IActivityResult가
  누락되어 있다. 실제 소스(IIntentPlugin.ts, Intent.ts)에는 구현되어 있으나
  README에 반영되지 않아, npm에서 패키지 문서를 보는 외부 사용자가
  해당 API의 존재를 인지할 수 없다.
suggestion: |
  README.md에 IStartActivityForResultOptions, IActivityResult 타입 문서와
  Intent.startActivityForResult 메서드 설명 및 사용 예제를 추가한다.
```

```
id: DESIGN-002
severity: Low
category: 설계
location: packages/capacitor-plugin-intent/android/src/main/java/kr/co/simplysm/capacitor/intent/IntentPlugin.java:187-191
title: component만 지정하고 package를 생략하면 component가 무시됨
description: |
  startActivityForResult에서 package 없이 component만 전달하면,
  if (pkg != null && component != null) 분기에 진입하지 않아
  component 옵션이 무시된다. ComponentName 생성에 package가 필수이므로
  기술적으로는 올바르지만, 호출자가 의도한 component 지정이 조용히
  무시되어 디버깅이 어려울 수 있다.
suggestion: |
  component만 있고 package가 없는 경우 경고 로그를 남기거나,
  call.reject로 "component requires package" 에러를 반환한다.
```

## 참고 사항 (이슈 아님)

- `dist/` 디렉토리에 리네이밍 전 파일(`Broadcast.d.ts`, `IBroadcastPlugin.d.ts`, `BroadcastWeb.d.ts`)이 잔존한다. 다음 빌드(`yarn build`) 시 dist/가 정리되면 해소되지만, 빌드 없이 퍼블리시하면 구 파일이 포함될 수 있다.
