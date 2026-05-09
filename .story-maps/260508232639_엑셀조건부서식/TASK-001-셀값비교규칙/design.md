# TASK-001-셀값비교규칙 Design

## 메타
- designed: 2026-05-09

## Current State

- Story 1·2·3 공통: 시트 단위 조건부 서식 API 자체 부재.
  - `packages/excel/src/excel-worksheet.ts` `ExcelWorksheet` 에 conditional format 관련 메서드 없음.
  - `packages/excel/src/types.ts` `ExcelXmlWorksheetData` 에 `conditionalFormatting` 필드 부재.
  - `packages/excel/src/xml/excel-xml-style.ts` `ExcelXmlStyleData` 에 `dxfs`(differential formats) 컬렉션 부재. 현재는 cellXfs(전체 xf)만 다룸.
  - `ExcelStyleOptions`(types.ts:384-400)는 background/border/align/numberFormat 만 지원. `fontColor`/`fontWeight` 표현 수단 없음(font 는 항상 빈 객체 1개로 고정 — excel-xml-style.ts:37-42).
- 색상 표기 컨벤션: 정적 fill 은 ARGB 8자리(`"00FF0000"`) 대문자(excel-xml-style.ts:88, excel-cell.ts:241). dxf 의 색상도 같은 표기로 통일 가능.
- 셀 주소 변환 유틸 보유: `ExcelUtils.parseRangeAddr`/`stringifyRangeAddr`(utils/excel-utils.ts:70-88). `ref` 문자열 검증·정규화에 재사용 가능.

## Solution

- Story 1: `ExcelWorksheet.addConditionalFormat({ ref, rules })` 신설. `rules[i]` 가 `{ type: "cellIs", op: "<"|">"|"<="|">="|"="|"<>", value: number|string, style }` 인 경우, op 를 OOXML `cellIs` operator(`lessThan`/`greaterThan`/...)로 매핑하고 단일 `<formula>` 로 emit.
- Story 2: 동일 API 의 discriminated union 분기. `op: "between"|"notBetween"`, `value: [a,b]` 인 경우 `<formula>` 두 개 emit. AC 명시대로 inclusive(OOXML 표준 동일).
- Story 3: 동일 시트의 한 `ref` 에 `rules` 배열로 여러 규칙을 한 번에 등록. 배열 순서 = OOXML `priority` 오름차순(앞이 우선). `stopIfTrue` 미노출.

세 Story 모두 동일한 `addConditionalFormat` 한 메서드로 처리되며, 차이는 `ConditionalRule` discriminated union 의 분기일 뿐.

## Detailed Design

### Public API (excel-worksheet.ts)

```ts
class ExcelWorksheet {
  async addConditionalFormat(opts: {
    ref: string;                  // "A1" | "A1:B10"
    rules: ConditionalRule[];
  }): Promise<void>;
}
```

### Type 정의 (types.ts)

```ts
export type ConditionalRuleStyle = {
  background?: string;            // ARGB 8자리, 예: "00FFFF00"
  fontColor?: string;             // ARGB 8자리
  fontWeight?: "bold" | "normal";
};

export type ConditionalRule =
  | {
      type: "cellIs";
      op: "<" | ">" | "<=" | ">=" | "=" | "<>";
      value: number | string;
      style: ConditionalRuleStyle;
    }
  | {
      type: "cellIs";
      op: "between" | "notBetween";
      value: [number, number] | [string, string];
      style: ConditionalRuleStyle;
    };
```

(TASK-002·003 단계에서 다른 `type` 분기 추가 예정. 본 Task 는 `cellIs` 만 emit.)

### OOXML 매핑

**worksheet xml** — `<sheetData>` 와 `<mergeCells>` 사이(OOXML schema 기준 sheetData 다음 요소들 중 하나)에 `<conditionalFormatting>` 블록 추가:

```xml
<conditionalFormatting sqref="A1:B10">
  <cfRule type="cellIs" operator="lessThan" priority="1" dxfId="0">
    <formula>4999</formula>
  </cfRule>
  <cfRule type="cellIs" operator="between" priority="2" dxfId="1">
    <formula>1000</formula>
    <formula>2000</formula>
  </cfRule>
</conditionalFormatting>
```

**styles.xml** — `<dxfs>` 컬렉션 추가(cellXfs 뒤에 위치):

```xml
<dxfs count="2">
  <dxf>
    <font><b/><color rgb="00FF0000"/></font>
    <fill><patternFill><bgColor rgb="00FFFF00"/></patternFill></fill>
  </dxf>
  ...
</dxfs>
```

### Operator 매핑표

| API op | OOXML operator | formula 개수 |
|---|---|---|
| `<` | `lessThan` | 1 |
| `>` | `greaterThan` | 1 |
| `<=` | `lessThanOrEqual` | 1 |
| `>=` | `greaterThanOrEqual` | 1 |
| `=` | `equal` | 1 |
| `<>` | `notEqual` | 1 |
| `between` | `between` | 2 |
| `notBetween` | `notBetween` | 2 |

### value emit 규칙

- `value: number` → `<formula>{value}</formula>` (raw)
- `value: string` → `<formula>"{value}"</formula>` (큰따옴표 둘러싸기). 사용자 문자열 내 `"` 문자는 OOXML 표준에 따라 `""` 로 escape.
- `value: [a, b]` → 두 개의 `<formula>` 태그를 a, b 순서로 emit. 각 요소는 위 규칙 적용.

### dxf 등록 (excel-xml-style.ts 신규 메서드)

`ExcelXmlStyle.addDxf(style: ConditionalRuleStyle): string` — 동일 dxf 가 이미 있으면 기존 dxfId 재사용, 없으면 push 후 새 인덱스 반환. cellXfs/fills/borders 와 동일한 dedupe 패턴 사용(_getSameOrCreateXf 와 같은 구조).

dxf 직렬화 규칙:
- `fontColor` 또는 `fontWeight === "bold"` 가 있으면 `<font>` 자식. `fontWeight === "normal"` 단독은 dxf 에 font 자식 미생성(아래 Open Question Q3 참조).
- `background` 가 있으면 `<fill><patternFill><bgColor rgb="..."/></patternFill></fill>`. dxf 의 fill 은 OOXML 명세상 `bgColor` 로 채움(정적 fill 의 `fgColor`+`patternType="solid"` 와 다름).

### 합성 동작

정적 cellXf 와 조건부 dxf 의 합성은 Excel native CF 오버레이에 위임(task.md AC). 빌더는 둘을 별개 OOXML 영역에 emit 만 하고 별도 합성 로직 없음.

### 신규 / 수정 파일

| 위치 | 변경 |
|---|---|
| `packages/excel/src/types.ts` | `ConditionalRule`, `ConditionalRuleStyle` 추가. `ExcelXmlWorksheetData.worksheet.conditionalFormatting?` 추가. `ExcelXmlStyleData.styleSheet.dxfs?` 추가. |
| `packages/excel/src/xml/excel-xml-style.ts` | `addDxf(style)` 메서드 신설, dxf dedupe, cleanup 시 dxfs 위치 정렬. |
| `packages/excel/src/xml/excel-xml-worksheet.ts` | `addConditionalFormatting(ref, rules)` 같은 내부 메서드 신설(라이브 데이터에 `<conditionalFormatting>` push). `cleanup()` 의 키 정렬 순서에 `conditionalFormatting` 위치 추가(sheetData/mergeCells 뒤, 워크시트 schema 순). |
| `packages/excel/src/excel-worksheet.ts` | `addConditionalFormat({ ref, rules })` public 메서드 신설. styles 보장(`_ensureStyleData`) 후 dxf 등록 → worksheet xml 에 cfRule 등록. |
| `packages/excel/src/index.ts` | 신규 타입 export. |

## Testing

- Story 1: 단일 op(`<`/`>`/`<=`/`>=`/`=`/`<>`) 6가지를 각각 number/string value 조합으로 호출 → roundtrip(`toBytes` → `new ExcelWorkbook(bytes)`) 후 worksheet xml 의 `cfRule@operator`, `formula` 텍스트, sqref, dxfId 가 기대대로 직렬화되었는지 검사. styles.xml 에 dxfs 항목/색상 검증.
- Story 2: `between`/`notBetween` 에 number 튜플·string 튜플 각각 → `<formula>` 두 개가 순서대로 들어가는지 검증.
- Story 3: 한 ref 에 rules 3개 등록 → priority 가 1·2·3 으로 자동 부여되고 dxfId 는 스타일별로 분기 dedupe 되는지 검증.
- 공통: 같은 dxf style 을 두 번 등록해도 dxfs 컬렉션에 1개만 들어가는지(dedupe).
- 위치는 `packages/excel/tests/conditional-format.spec.ts` 신설. 기존 `excel-cell.spec.ts`/`excel-worksheet.spec.ts` 와 동일한 vitest 패턴(roundtrip via `toBytes` + `new ExcelWorkbook`) 따름.

## Rollout

- Story 순서: 1 → 2 → 3 (구현은 사실상 동시. Story 1 공통 인프라(API/타입/dxf/cfRule emit)에 Story 2 는 op 분기·formula 2개 추가, Story 3 은 별도 변경 없이 배열 입력만 — 자동 충족).
- 단일 PR 로 묶기 적합. TASK-002(containsText) 와 TASK-003(임의 expression) 은 본 Task 의 인프라(addConditionalFormat / dxfs / cfRule emit)를 그대로 재사용하므로 본 Task 가 선행되어야 함.

## 결정 사항 (task.md AC 외 추가 결정)

- 다중 호출 동작: 호출마다 `<conditionalFormatting>` 블록을 시트에 누적 push. 같은 ref 두 번 호출 = 두 블록 공존(Excel 이 둘 다 평가). 다른 ref 호출 = 자연스러운 다중 ref 지원.
  - 근거: 사용자 답변 (2026-05-09) — Q1 해소
- priority 부여: 시트 단위 카운터로 호출 간 이어붙임. 첫 호출의 rules 가 1·2·…·N, 두 번째 호출이 N+1·N+2·… 식. 호출 순서 자체가 시트 전역 우선순위.
  - 근거: 사용자 답변 (2026-05-09) — Q2 해소
- fontWeight enum 시맨틱 = 엑셀 UI 의 "글꼴 스타일" 선택과 동일.
  - `"bold"` → dxf `<font><b val="1"/></font>` (강제 bold)
  - `"normal"` → dxf `<font><b val="0"/></font>` (강제 normal — base 가 bold 여도 덮어씀)
  - 옵션 미지정 → dxf 에 b 태그 미emit (base 유지)
  - 근거: 사용자 답변 (2026-05-09)
