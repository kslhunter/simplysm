# TASK-002-텍스트포함규칙 Design

## 메타
- designed: 2026-05-09

## Current State

- TASK-001 결과로 조건부 서식 인프라(`ExcelWorksheet.addConditionalFormat({ ref, rules })`, `dxfs`, `cfRule` emit, 시트 전역 priority 카운터)가 이미 코드베이스에 존재.
- `ExcelConditionalRule`(`packages/excel/src/types.ts`)은 현재 `type: "cellIs"` 두 variant 만 정의. `type: "text"` variant 부재.
- `ExcelXmlCfRuleData.$.type`(types.ts) literal 이 `"cellIs"` 만 허용, `operator` 도 cellIs op 8종만. text 계열 4종 부재.
- text 속성(OOXML `<cfRule text="...">`) 필드 부재.
- Story 1·2 공통: 텍스트 매칭 cfRule emit 이 전무.

## Solution

- Story 1: `ExcelConditionalRule` 에 세 번째 variant 추가 — `{ type: "text"; op: "contains" | "notContains" | "beginsWith" | "endsWith"; value: string; style }`. 공개 API(`addConditionalFormat`) 시그니처는 그대로 두고 입력 타입만 확장. 빌더는 op 별로 OOXML cfRule 의 `type`/`operator`/`text` 속성 + 대응 `<formula>` 를 emit.
- Story 2: 추가 작업 없음 — `style` 필드는 TASK-001 의 `ExcelConditionalRuleStyle` 을 그대로 공유, `addDxf` 도 그대로 재사용.

## Detailed Design

### Type 확장 (types.ts)

```ts
export type ExcelConditionalRule =
  | /* 기존 cellIs 단일 */
  | /* 기존 cellIs between/notBetween */
  | {
      type: "text";
      op: "contains" | "notContains" | "beginsWith" | "endsWith";
      value: string;
      style: ExcelConditionalRuleStyle;
    };
```

`ExcelXmlCfRuleData.$.type` 에 `"containsText" | "notContainsText" | "beginsWith" | "endsWith"` 추가, `$.operator` 에 동일 4종 추가. `$.text?: string` optional 속성 추가.

### OOXML 매핑

| API op | cfRule `type` | cfRule `operator` | `text` 속성 | `<formula>` |
|---|---|---|---|---|
| `contains` | `containsText` | `containsText` | `value` | `NOT(ISERROR(SEARCH("{value}",{topLeft})))` |
| `notContains` | `notContainsText` | `notContains` | `value` | `ISERROR(SEARCH("{value}",{topLeft}))` |
| `beginsWith` | `beginsWith` | `beginsWith` | `value` | `LEFT({topLeft},LEN("{value}"))="{value}"` |
| `endsWith` | `endsWith` | `endsWith` | `value` | `RIGHT({topLeft},LEN("{value}"))="{value}"` |

근거: OOXML §18.18.7 ST_CfType, §18.3.1.10 cfRule, Excel 가 UI 에서 만들어내는 표준 emit 패턴.

`{topLeft}` = `ref` 의 top-left 셀 주소(상대 참조). 단일 셀(`"A1"`)이면 그대로, 범위(`"A1:B10"`)면 `:` 앞 부분(`"A1"`).

`{value}` 내 큰따옴표는 OOXML 표준 escape `""` 로 두 배(TASK-001 cellIs string formula 와 동일 처리).

### 매칭 시맨틱

- 4종 모두 `SEARCH` 기반(대소문자 무시). `beginsWith`/`endsWith` 는 OOXML 의 표준 formula 관행에 따라 `LEFT`/`RIGHT` + 동등 비교(case-sensitive 처럼 보이지만 Excel 의 문자열 비교 자체가 case-insensitive 라 결과는 동일).
- case-sensitive 매칭이 필요하면 TASK-003 임의 expression 으로(task.md AC 명시).

### 신규 / 수정 파일

| 위치 | 변경 |
|---|---|
| `packages/excel/src/types.ts` | `ExcelConditionalRule` 에 text variant 추가. `ExcelXmlCfRuleData.$.type`/`operator` literal 확장, `$.text?` 추가. |
| `packages/excel/src/excel-worksheet.ts` | `_mapCfOperator`/`_encodeCfFormula` 자리에 text variant 분기 추가. text variant 의 경우 추가로 `text` 속성 주입(현재 `addConditionalFormatting` 에 cfRule input 객체 형태 확장 필요) — 시트 XML 메서드와 협조. |
| `packages/excel/src/xml/excel-xml-worksheet.ts` | `addConditionalFormatting` 의 입력 객체에 `text?: string` 추가, cfRule push 시 `$.text` emit. |

### 호출 흐름 (예)

```ts
await ws.addConditionalFormat({
  ref: "A2:A100",
  rules: [
    { type: "text", op: "contains", value: "긴급",
      style: { background: "00FFCCCC", fontWeight: "bold" } },
    { type: "text", op: "notContains", value: "OK",
      style: { fontColor: "00FF0000" } },
  ],
});
```

→ worksheet xml:
```xml
<conditionalFormatting sqref="A2:A100">
  <cfRule type="containsText" priority="1" operator="containsText" text="긴급" dxfId="0">
    <formula>NOT(ISERROR(SEARCH("긴급",A2)))</formula>
  </cfRule>
  <cfRule type="notContainsText" priority="2" operator="notContains" text="OK" dxfId="1">
    <formula>ISERROR(SEARCH("OK",A2))</formula>
  </cfRule>
</conditionalFormatting>
```

## 결정 사항 (task.md AC 외 추가 결정)

- formula 의 cell 인자 = `ref` top-left 의 **상대 참조**(예: `A1`, `B5`). Excel UI 가 만들어내는 표준 형태이며 OOXML 명세상 권장. 절대 참조(`$A$1`) 미사용.
  - 근거: Excel UI 가 emit 하는 표준 패턴 / OOXML §18.3.1.10 일반 관행
- `<cfRule>` 에 `text` 속성과 `<formula>` 를 모두 emit. Excel/타 OOXML 컨슈머 호환을 위한 표준.
  - 근거: ECMA-376 OOXML §18.3.1.10 cfRule (text 속성은 해당 type 에서 spec 상 권장)

## Testing

- Story 1: 4 op 각각에 대해 단일 호출 후 worksheet xml 의 `cfRule@type`/`@operator`/`@text` 와 `<formula>` 텍스트가 매핑표대로 emit 되는지 검증. 범위 ref 일 때 formula 의 cell 인자가 top-left 인지 확인.
- Story 2: text rule 에 `{ background, fontColor, fontWeight }` 조합을 주고 dxfs 에 등록되어 dxfId 가 cfRule 에 연결되는지 + dedupe 동작(같은 style → 같은 dxfId) 확인.
- 회귀: TASK-001 의 cellIs 규칙과 text 규칙을 같은 시트에 섞어 호출 → 시트 전역 priority 카운터가 이어붙고 두 블록이 누적되는지.
- Roundtrip: `toBytes` → `new ExcelWorkbook(bytes)` 후 cfRule 4종 + text 속성 + formula 보존.
- value 내 큰따옴표 escape(`a"b` → `"a""b"`).
- 위치는 신규 `packages/excel/tests/conditional-format.spec.ts` 에 `describe("Story — 텍스트 매칭")` 추가(TASK-001 의 spec 파일 그대로 재사용).

## Rollout

- Story 1·2 한 번에 구현(Story 2 는 Story 1 인프라에서 자동 충족).
- TASK-001 인프라가 이미 들어있으므로 본 Task 는 타입 확장 + emit 분기 추가만으로 끝남. PR 단위로는 본 Task 를 단독 PR 로 묶기 적합.
