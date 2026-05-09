# TASK-001-셀값비교규칙 Implementation

## 메타
- implemented: 2026-05-09

## 구현 결과

- Story 1 (단일 비교 연산자):
  - 변경 파일:
    - `packages/excel/src/types.ts`: `ExcelConditionalRule`(discriminated union), `ExcelConditionalRuleStyle` public 타입 추가. XML data 타입에 `ExcelXmlConditionalFormattingData`, `ExcelXmlCfRuleData`, `ExcelXmlStyleDataDxf` 추가. `ExcelXmlWorksheetData.worksheet.conditionalFormatting?` / `ExcelXmlStyleData.styleSheet.dxfs?` 필드 추가.
    - `packages/excel/src/xml/excel-xml-style.ts`: `addDxf(style)` 메서드 신설 — dxf 항목 직렬화(font/fill) + `obj.equal` 기반 dedupe + dxfs 컬렉션 lazy 초기화.
    - `packages/excel/src/xml/excel-xml-worksheet.ts`: `addConditionalFormatting(sqref, rules)` 메서드 신설 — 시트 전역 priority 카운터(기존 cfRule 의 max priority + 1) 부터 부여. `cleanup()` 의 키 정렬 브랜치에 `conditionalFormatting` 위치(sheetData → mergeCells → conditionalFormatting → drawing) 명시.
    - `packages/excel/src/excel-worksheet.ts`: `addConditionalFormat({ ref, rules })` public 메서드 신설. styles 보장(`_ensureStyleData`) 후 rule 별 dxfId 등록 → operator 매핑(`_mapCfOperator`) → formula 인코딩(`_encodeCfFormula`).
  - design 대비 차이: 없음.

- Story 2 (between / notBetween):
  - 변경 파일: 위 동일.
  - design 대비 차이: 없음. discriminated union 의 두 번째 variant 가 그대로 처리됨.
  - 이슈/결정: TS 의 op 디스크리미네이터 narrowing 이 union value 타입에 전파되지 않아 `_encodeCfFormula` 분기를 `Array.isArray(rule.value)` 로 변경. 의미 동일(튜플 형태가 곧 between/notBetween).

- Story 3 (다단계 priority):
  - 변경 파일: 위 동일.
  - design 대비 차이: 없음. `addConditionalFormatting` 의 시트 전역 priority 카운터가 호출 내 배열 순서 + 호출 간 누적을 동시에 처리.

## 패키지 레벨 검증

- `pnpm check --fix -t excel`: typecheck 0 에러, lint 0 에러.
- `pnpm exec vitest run --project node packages/excel/tests/`: 13 파일 / 160 테스트 모두 통과(회귀 없음).
- 신규 테스트(`packages/excel/tests/conditional-format.spec.ts`): 18 테스트 모두 통과.
  - Story 1: op 매핑(6 케이스) / number·string formula emit / OOXML 큰따옴표 escape / dxf 등록·연결 / `fontWeight: "normal"` → b val="0".
  - Story 2: `between` 숫자 튜플 / `notBetween` 문자열 튜플.
  - Story 3: rules 순서대로 priority 1·2·3 / 같은 style dxf dedupe.
  - 호출 간: 블록 누적(2 호출 → 2 블록), 시트 전역 priority 이어붙임(1·2·3·4).
  - Roundtrip: `toBytes` → 재생성 후 cfRule 과 dxf 모두 보존.

## 정방향 검토

- story-map.md TASK-001 한 줄 요약(`비교 연산자(...,between) 기반 강조`) → 8개 op 모두 구현(notBetween 포함).
- task.md AC 전체 매핑 확인:
  - 시트 단위 `addConditionalFormat({ ref, rules })` ✓
  - ref 는 단일 셀/범위 모두 한 문자열로(별도 분기 X) ✓
  - `{ background?, fontColor?, fontWeight: "bold"|"normal" }` 강조 서식 ✓
  - ARGB 8자리(`toUpperCase`) ✓
  - 정적/조건부 합성은 native CF 위임(별도 합성 로직 X) ✓
  - discriminated union ✓
  - `between` 양 끝 inclusive(OOXML 표준 그대로 emit) ✓
  - `value: number` → raw, `value: string` → 큰따옴표 둘러싼 리터럴 ✓
  - rules 배열 순서가 priority(앞이 우선), `stopIfTrue` 미노출 ✓
- design.md 결정사항 일치: 다중 호출 누적 / 시트 전역 priority 카운터 / `fontWeight: "normal"` → `b val="0"` ✓.
- 변질·누락 없음.

## 안내

본 Task 는 빌더 코드 작성자(개발자)가 소비자 — UI 시연 대상이 아님. 워크플로 완료. TASK-002(`containsText`), TASK-003(임의 expression) 은 본 Task 가 마련한 인프라(`addConditionalFormat` / `dxfs` / `cfRule` emit)를 그대로 재사용 가능.
