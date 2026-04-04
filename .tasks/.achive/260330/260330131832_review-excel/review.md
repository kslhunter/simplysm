# 코드 리뷰: @simplysm/excel

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/excel/src/` |
| 일시 | 2026-03-30 |
| 파일 수 | 18 |
| 발견 이슈 | 4건 (Critical: 0, Medium: 1, Low: 3) |

## Medium

### LOGIC-001: SharedString 빈 텍스트를 공백으로 반환

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/excel/src/xml/excel-xml-shared-string.ts:75
title: 빈 텍스트 콘텐츠(<t xml:space="preserve"/>)를 공백(" ")으로 반환
description: |
  _getStringFromTTag에서 firstItem._가 undefined일 때 " "(공백)을 반환한다.
  XML에서 <t xml:space="preserve"/>는 텍스트 콘텐츠가 없는 빈 요소이므로 ""(빈 문자열)이
  의미상 맞다. 현재 구현은 빈 문자열과 공백 문자열을 구분하지 못한다.
  - <t xml:space="preserve"> </t> → { _: " " } → " " (정상)
  - <t xml:space="preserve"/>      → { _: undefined } → " " (빈 문자열이 공백으로 변환됨)
  기존 Excel 파일을 읽을 때 빈 SharedString 셀이 공백 문자열로 읽힐 수 있다.
suggestion: |
  firstItem._ ?? " " → firstItem._ ?? "" 로 변경.
  만약 의도적으로 공백을 반환하는 것이라면 주석으로 그 이유를 명시할 것.
```

## Low

### CONSIST-001: Relationship ID 파싱 방식 불일치

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/excel/src/xml/excel-xml-workbook.ts:30, packages/excel/src/xml/excel-xml-relationship.ts:83
title: 같은 "rIdN" 문자열을 두 가지 방식으로 파싱
description: |
  ExcelXmlRelationship._getRelId는 정규식(/[0-9]+$/)으로 숫자를 추출한 뒤 num.parseInt를
  호출한다. 반면 ExcelXmlWorkbook.lastWsRelId와 lastSheetId는 num.parseInt를 직접 호출한다.
  num.parseInt가 비숫자 문자를 제거하므로 둘 다 동작하지만, 같은 역할(rId에서 숫자 추출)에
  서로 다른 접근 방식을 사용한다.
suggestion: |
  한 가지 방식으로 통일. num.parseInt 직접 호출이 더 간결하므로
  ExcelXmlRelationship._getRelId에서도 정규식 없이 num.parseInt를 직접 사용하거나,
  반대로 ExcelXmlWorkbook에서도 정규식 추출 방식을 사용.
```

### PERF-001: 셀 단위 순차 await로 인한 대량 데이터 쓰기 성능 저하

```
id: PERF-001
severity: Low
category: 성능
location: packages/excel/src/excel-worksheet.ts:225, packages/excel/src/excel-worksheet.ts:246
title: setDataMatrix/setRecords에서 셀마다 개별 await 호출
description: |
  setDataMatrix과 setRecords는 각 셀에 대해 개별적으로 await cell.setValue()를 호출한다.
  셀 값 설정 자체는 캐시된 XML 데이터에 대한 동기적 조작이지만, async 메서드 래핑으로 인해
  셀 수만큼 Promise가 생성된다. 예: 1000행 x 10열 = 10,000개의 Promise.
  ExcelWrapper.write에서는 데이터 쓰기 + 테두리 적용 + 헤더 강조로 최대 3회 순회하여
  Promise 수가 더 증가한다.
  공유 가변 상태(XML 데이터)에 대한 동시 접근 문제로 Promise.all 병렬화는 불가능하다.
suggestion: |
  대량 쓰기 전용 내부 메서드(예: ExcelXmlWorksheet에 배치 셀 설정 메서드)를 추가하여
  async 래핑 없이 직접 XML 데이터를 조작하는 방안 검토.
  또는 ExcelWorksheet에 bulk 메서드를 추가하여 한 번의 async 호출로 다수 셀을 처리.
```

### DESIGN-001: 동일 셀에 대한 ExcelCell 인스턴스 중복 생성

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/excel/src/excel-col.ts:17, packages/excel/src/excel-row.ts:18
title: ExcelCol.cell()과 ExcelRow.cell()이 같은 논리적 셀에 대해 독립 인스턴스 생성
description: |
  ExcelWorksheet.cell(r, c)는 row(r).cell(c)를 통해 ExcelRow._cellMap에 캐싱된 인스턴스를
  반환한다. 그러나 ExcelWorksheet.col(c).cell(r)은 ExcelCol._cellMap에 별도 인스턴스를
  생성한다. 동일한 (r, c) 좌표에 대해 두 개의 ExcelCell 객체가 존재할 수 있다.
  ExcelCell이 상태를 갖지 않고 매번 XML 데이터에서 읽으므로 데이터 정합성 문제는 없지만,
  같은 셀에 두 경로로 접근할 때 메모리를 낭비하고 === 비교 시 false가 반환된다.
suggestion: |
  ExcelWorksheet 레벨에서 (r, c) 기반 단일 ExcelCell 맵을 관리하고,
  ExcelRow.cell()과 ExcelCol.cell() 모두 이 맵에서 인스턴스를 가져오도록 통합.
```
