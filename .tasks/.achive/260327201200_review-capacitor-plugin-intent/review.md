# Review: capacitor-plugin-intent 구현 리뷰

| 항목 | 값 |
|------|-----|
| 분석 대상 | `.tasks/260327192057_capacitor-plugin-intent/*.md` 기반 구현 |
| 분석 일시 | 2026-03-27 20:12 |
| 분석 파일 수 | 7 (TS 4, Kotlin 1, Gradle 1, package.json 1) |
| 발견 이슈 | 0건 |

## 분석 결과

분석 결과 보고할 이슈가 없습니다.

## 검증 요약

### Feature 1.1: broadcast → intent 리네이밍

모든 리네이밍 매핑(디렉토리, npm 이름, Capacitor 등록명, Android namespace, TypeScript 인터페이스/클래스/파일명, Kotlin 패키지/클래스/어노테이션, sd.config.ts)이 구현계획과 일치합니다. 패키지 내 잔존하는 `Broadcast` 참조는 Android SDK 클래스(`BroadcastReceiver`, `sendBroadcast`)로, 변경 불가한 프레임워크 API입니다.

### Feature 2.1: startActivityForResult 구현

#### TypeScript 레이어

- `StartActivityForResultOptions`, `StartActivityForResultResult` 타입이 WBS API 시그니처와 일치
- `IntentPlugin` 인터페이스, `Intent` 래퍼, `IntentWeb` 스텁 모두 올바르게 추가됨
- Web 스텁: 경고 출력 + `{ resultCode: 0 }` 반환 — 스펙 일치

#### Android 구현

- `buildIntent`: 설계 결정 D1(uri+type → setDataAndType), D2(packageName/className 분기) 올바르게 구현
- `handleActivityResult`: 설계 결정 D3(uri 포함), D4(기존 intentToJson 미수정, 결과 전용 변환 로직) 올바르게 구현
- Capacitor 패턴 D5(`startActivityForResult` + `@ActivityCallback`) 정확히 준수
- 에러 처리: try-catch → `call.reject()` 패턴으로 Promise reject 보장

#### 4관점 체크리스트

| 관점 | 결과 |
|------|------|
| 로직 버그 | 발견 없음 — 모든 스펙 시나리오(15개)가 구현과 일치 |
| 보안 | 해당 없음 — 외부 입력은 Capacitor 브리지 경유, 직접 노출 없음 |
| 성능 | 해당 없음 — 단건 Intent 처리, 반복 패턴 없음 |
| 설계 | 양호 — 함수 분리(buildIntent/handleActivityResult), 기존 코드 재활용(populateExtras, bundleToJson), 리소스 정리(handleOnDestroy) |
