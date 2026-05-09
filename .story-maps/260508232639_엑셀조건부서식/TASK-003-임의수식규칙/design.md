# TASK-003-임의수식규칙 Design

## 메타
- designed: 2026-05-09

## Current State

- TASK-001/002 결과로 조건부 서식 인프라(`ExcelWorksheet.addConditionalFormat({ ref, rules })`, `dxfs` dedupe, `cfRule` emit, 시트 전역 priority 카운터, `_buildCfRuleSpec` 헬퍼)가 이미 코드베이스에 존재.
- `ExcelConditionalRule`(`packages/excel/src/types.ts`)은 현재 `cellIs`(2 variant) + `text`(1 variant) 만 정의. `expression` variant 부재.
- `ExcelXmlCfRuleData.$.type`(types.ts) literal 에 `"expression"` 부재. `$.operator` 가 현재 required 이지만 OOXML 명세상 expression type 은 operator 속성을 사용하지 않음 → optional 로 완화 필요.
- Story 1 공통: 임의 formula 기반 cfRule emit 이 전무.

## Solution

- Story 1: `ExcelConditionalRule` 에 네 번째 variant 추가 — `{ type: "expression"; formula: string; style }`. `_buildCfRuleSpec` 에 expression 분기 추가하여 OOXML `<cfRule type="expression">` + 사용자 formula 그대로 1개 `<formula>` 로 emit. 별도 syntax 검증·정규화 없음.

## Detailed Design

### Type 확장 (types.ts)

```ts
export type ExcelConditionalRule =
  | /* 기존 cellIs 단일/구간 */
  | /* 기존 text */
  | {
      type: "expression";
      formula: string;
      style: ExcelConditionalRuleStyle;
    };
```

`ExcelXmlCfRuleData.$.type` 에 `"expression"` 추가. `$.operator?` 로 optional 변경(expression type 은 operator 속성 미사용).

### OOXML 매핑

| API field | cfRule 속성/요소 |
|---|---|
| `type: "expression"` | `<cfRule type="expression">` |
| `formula` | `<formula>` 1개 (raw 그대로) |
| (operator) | 미emit |
| (text) | 미emit |

근거: ECMA-376 OOXML §18.3.1.10 cfRule, §18.18.7 ST_CfType — `expression` type 은 operator 미사용.

### 빌더 동작

- `formula` 문자열을 그대로 `<formula>` 텍스트 노드로 emit. 큰따옴표 escape, 셀 참조 절대/상대 표기 변환 등 일체 가공 없음(AC: "사용자 책임").
- `_buildCfRuleSpec` 의 expression 분기는 `topLeft` 인자를 사용하지 않음(formula 가 사용자 작성이라 anchor 가 formula 내부에 직접 표현됨). top-left 동작은 Excel native 의 상대 참조 시프트에 위임.
- syntax 검증 없음. 잘못된 formula 는 Excel 가 파일 열 때 오류로 노출(AC).

### 신규 / 수정 파일

| 위치 | 변경 |
|---|---|
| `packages/excel/src/types.ts` | `ExcelConditionalRule` 에 expression variant 추가. `ExcelXmlCfRuleData.$.type` 에 `"expression"` 추가, `$.operator?` 로 변경. |
| `packages/excel/src/excel-worksheet.ts` | `_buildCfRuleSpec` 의 분기에 `rule.type === "expression"` 케이스 추가(operator 미부여, formula 1개). `addConditionalFormat` 진입부에서 cfRule push 시 operator 미존재 가능성 반영(현재는 spec 객체에 항상 operator 존재 가정 — 분기 후 적절히 처리). |
| `packages/excel/src/xml/excel-xml-worksheet.ts` | cfRule push 시 `operator` 가 없으면 `$.operator` 미emit(spread 조건부). |

### 호출 흐름 (예 — PSD 임박 강조)

```ts
await ws.addConditionalFormat({
  ref: "F2:F500",
  rules: [
    { type: "expression",
      formula: 'AND($F2<>"",$F2-TODAY()<=7)',
      style: { background: "00FFCCCC", fontWeight: "bold" } },
  ],
});
```

→ worksheet xml:
```xml
<conditionalFormatting sqref="F2:F500">
  <cfRule type="expression" priority="1" dxfId="0">
    <formula>AND($F2&lt;&gt;"",$F2-TODAY()&lt;=7)</formula>
  </cfRule>
</conditionalFormatting>
```

(`<`/`>` 같은 XML 메타 문자는 직렬화 라이브러리가 자동으로 entity 처리.)

## 결정 사항 (task.md AC 외 추가 결정)

- `_buildCfRuleSpec` 의 반환 spec 객체에서 `operator` 필드를 optional 로 두어 expression 케이스에서 누락. 기존 cellIs/text 케이스는 변경 없음.
  - 근거: OOXML §18.3.1.10 cfRule — expression type 은 operator 미사용

## Testing

- Story 1:
  - 단일 expression rule 호출 후 worksheet xml 의 `cfRule@type === "expression"` / `cfRule@operator` 부재 / `<formula>` 텍스트가 입력 그대로인지 검증.
  - formula 에 `<`/`>`/`"` 등 메타 문자 포함 시 raw 그대로 보존되는지(직렬화·재파싱 roundtrip).
  - dxf 등록·연결, dedupe.
- 회귀: cellIs/text/expression 을 한 시트에 섞어 호출 시 시트 전역 priority 카운터가 1·2·3·… 으로 이어붙는지.
- Roundtrip: `toBytes` → `new ExcelWorkbook(bytes)` 후 type/formula/dxf 보존.
- 위치는 기존 `packages/excel/tests/conditional-format.spec.ts` 에 `describe("임의 expression (TASK-003)")` 추가.

## Rollout

- 단일 Story. TASK-001/002 인프라 위에 타입 확장 + emit 분기 추가만으로 충족.
- TASK-001·002 와 같은 PR 으로 묶거나 단독 PR 모두 가능. TASK-001 이 선행 의존(인프라).
