# Requirement Source

출처: GitHub Issue #32 (https://github.com/.../issues/32) — 채팅 paste, 2026-05-08

---

## 발생 현상

`@simplysm/excel` 로 워크북을 코드만으로 빌드할 때, 셀 값에 따라 서식을 분기하는 조건부 서식(예: 값 `< 4999` 일 때 노란 배경) 을 표현할 수 없다.

## 기대 동작

셀/범위에 conditional formatting rule 을 적용할 수 있는 API. 최소 필요한 규칙 타입:

- `cellIs` (operator + formula): `<`, `>`, `<=`, `>=`, `=`, `<>`, `between`
- `containsText`: `NOT(ISERROR(SEARCH("...", A1)))`
- 임의 expression formula

규칙당 적용 서식: 최소 background / font color / font weight.

## 실제 동작

`ExcelStyleOptions` (`packages/excel/src/types.ts`) 는 `background`, `border`, `horizontalAlign`, `verticalAlign`, `numberFormat`, `numberFormatCode` 만 지원. conditional formatting 관련 메서드/옵션 없음. 결과적으로 빌더가 조건부 강조가 필요한 시트(예: AD-TEK RTP 마스터 워크북의 INTERNAL Back log(List) 시트의 PSD/ETA 임박 강조)를 단일 코드 경로로 만들 수 없다.

## 재현 정보

- 버전: `@simplysm/excel@14.0.64`
- 환경: Node 20 / pnpm 11
