# Code Review: @simplysm/excel

| 항목 | 값 |
|------|------|
| 분석 대상 | `packages/excel/src/**/*.ts` |
| 분석 일시 | 2026-03-29 |
| 파일 수 | 18 |
| 발견 이슈 | 4건 (Critical: 0, Medium: 2, Low: 2) |

## Medium

### CONSIST-001

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/excel/src/xml/excel-xml-style.ts:139
title: addWithClone에서 background 색상 toUpperCase() 누락
description: |
  add() 메서드는 background 색상에 .toUpperCase()를 적용하지만(89행),
  addWithClone()에서 기존 fill을 복제하여 배경색을 변경하는 경로(139-140행)에서는
  toUpperCase()가 누락되어 있다.
  반면 같은 메서드 내에서 prevFill이 없는 경로(148행)에서는 toUpperCase()가 적용된다.

  이로 인해 동일한 색상이 대소문자만 다르게 저장되어 중복 fill 엔트리가 생성될 수 있다.
  _getSameOrCreateFill의 obj.equal 비교 시 "00ff0000"과 "00FF0000"이 다른 fill로 인식된다.
suggestion: |
  addWithClone()의 기존 fill 복제 경로에서도 .toUpperCase()를 적용한다.
  또는 _getSameOrCreateFill에서 대소문자 무시 비교를 적용한다.
```

### LOGIC-001

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/excel/src/xml/excel-xml-workbook.ts:41
title: addWorksheet의 sheetId가 기존 워크북의 sheetId와 충돌 가능
description: |
  addWorksheet()에서 새 시트의 sheetId와 r:id의 숫자 부분을 동일한 값(lastWsRelId + 1)으로
  설정한다. lastWsRelId는 기존 시트들의 r:id 최대값을 기준으로 계산된다.

  기존 Excel 파일에서는 sheetId와 r:id가 독립적인 값을 가질 수 있다. 예를 들어:
  - Sheet1: sheetId=1, r:id=rId1
  - Sheet2: sheetId=3, r:id=rId2

  이 경우 lastWsRelId=2, 새 sheetId=3이 되어 Sheet2의 sheetId=3과 충돌한다.
  Excel은 중복 sheetId를 파일 손상으로 인식할 수 있다.
suggestion: |
  sheetId 계산 시 기존 시트들의 sheetId 최대값을 별도로 추적하여 충돌을 방지한다.
  예: lastSheetId = max(all sheets' sheetId) + 1
```

## Low

### PERF-001

```
id: PERF-001
severity: Low
category: 성능
location: packages/excel/src/excel-worksheet.ts:225
title: setDataMatrix/setRecords에서 셀 단위 sequential await
description: |
  setDataMatrix(225행), setRecords(236행), getDataTable(186행),
  ExcelWrapper.write(118행) 등에서 각 셀마다 개별 await를 수행한다.

  ZipCache는 최초 접근 후 메모리 캐시를 사용하므로 실제 I/O는 없지만,
  Promise 생성/해소의 microtask 스케줄링 오버헤드가 셀 수에 비례하여 누적된다.
  1000행 × 10열 시트에서 10,000+ microtask hop이 발생한다.
  ExcelWrapper.write는 데이터 쓰기 + 테두리 적용 + 헤더 강조로 3회 순회하여 더 증폭된다.
suggestion: |
  행 단위로 Promise.all을 적용하거나, 내부적으로 동기 경로를 제공하여
  캐시 히트 시 불필요한 Promise 래핑을 피한다.
```

### DESIGN-001

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/excel/src/excel-worksheet.ts:20
title: ExcelWorksheet에 워크북 닫힘 상태 검증 없음
description: |
  ExcelWorkbook은 _ensureNotClosed()로 닫힌 후 사용을 방지하지만,
  ExcelWorksheet는 부모 워크북의 닫힘 상태를 확인하지 않는다.

  wb.close() 호출 후에도 기존에 획득한 worksheet 참조를 통해
  메서드를 호출할 수 있으며, 이 경우 cleared된 ZipCache에 접근하여
  의미 불명의 에러(undefined 관련)가 발생한다.
suggestion: |
  ZipCache에 closed 상태를 추가하고, get() 호출 시 닫힌 상태면
  명확한 에러 메시지를 던지도록 한다. 또는 ExcelWorksheet가 부모 워크북의
  상태를 확인하도록 한다.
```
