# @simplysm/excel — 조건부 서식

`ExcelWorksheet.addConditionalFormat` 과 `ExcelConditionalRule` 타입을 함께 읽는 묶음. 값 비교, 텍스트 매칭, raw 수식 조건을 worksheet conditionalFormatting 블록으로 누적하고, 표시 스타일은 styles 파트의 dxf 로 등록한다.

## addConditionalFormat

```typescript
ws.addConditionalFormat(opts: {
  ref: string;
  rules: ExcelConditionalRule[];
}): Promise<void>
```

- `opts.ref` — 조건부 서식을 적용할 단일 셀 또는 범위 A1 주소. worksheet `sqref` 로 저장된다.
- `opts.rules` — 적용할 규칙 배열. 빈 배열이면 아무 작업도 하지 않는다.
- `rules` 배열 순서 — 같은 호출 안에서 priority 부여 순서가 된다.
- 호출 간 priority — 기존 시트의 최대 priority 다음 값부터 이어붙는다.

## ExcelConditionalRuleStyle

```typescript
interface ExcelConditionalRuleStyle {
  background?: string;
  fontColor?: string;
  fontWeight?: "bold" | "normal";
}
```

- `background` — 조건부 서식 dxf fill 배경색. OOXML 에서는 solid pattern 의 `bgColor.rgb` 로 저장된다.
- `fontColor` — 조건부 서식 dxf 글자색. `font.color.rgb` 로 저장된다.
- `fontWeight` — 조건부 서식 dxf 굵기. `"bold"` 는 `b val="1"`, `"normal"` 은 `b val="0"` 으로 저장된다.
- `"bold"` — 조건부 서식이 적용될 때 글자를 굵게 표시하도록 dxf 를 만든다.
- `"normal"` — base 스타일이 bold 여도 조건부 서식 dxf 에서 normal 을 강제하도록 `0` 값을 쓴다.

## ExcelConditionalRule

```typescript
type ExcelConditionalRule =
  | { type: "cellIs"; op: "<" | ">" | "<=" | ">=" | "=" | "<>"; value: number | string; style: ExcelConditionalRuleStyle }
  | { type: "cellIs"; op: "between" | "notBetween"; value: [number, number] | [string, string]; style: ExcelConditionalRuleStyle }
  | { type: "text"; op: "contains" | "notContains" | "beginsWith" | "endsWith"; value: string; style: ExcelConditionalRuleStyle }
  | { type: "expression"; formula: string; style: ExcelConditionalRuleStyle };
```

- `type: "cellIs"` — 셀 값을 비교하는 조건부 서식. OOXML cfRule type 은 `"cellIs"`.
- `op: "<"` — operator `"lessThan"` 으로 변환된다.
- `op: ">"` — operator `"greaterThan"` 으로 변환된다.
- `op: "<="` — operator `"lessThanOrEqual"` 으로 변환된다.
- `op: ">="` — operator `"greaterThanOrEqual"` 으로 변환된다.
- `op: "="` — operator `"equal"` 으로 변환된다.
- `op: "<>"` — operator `"notEqual"` 으로 변환된다.
- `op: "between"` — operator `"between"` 으로 저장하고 tuple 양쪽 값을 formula 2개로 저장한다.
- `op: "notBetween"` — operator `"notBetween"` 으로 저장하고 tuple 양쪽 값을 formula 2개로 저장한다.
- `value: number` — formula 에 따옴표 없이 숫자 문자열로 저장된다.
- `value: string` — formula 에 큰따옴표로 감싼 문자열로 저장되고 내부 `"` 는 `""` 로 escape 된다.
- `type: "text"` — 텍스트 매칭 조건부 서식. `opts.ref` 의 첫 주소를 formula 의 top-left 셀로 사용한다.
- `op: "contains"` — cfRule type/operator `"containsText"`; formula 는 `NOT(ISERROR(SEARCH(value, topLeft)))` 형태다.
- `op: "notContains"` — cfRule type `"notContainsText"`, operator `"notContains"`; formula 는 `ISERROR(SEARCH(value, topLeft))` 형태다.
- `op: "beginsWith"` — cfRule type/operator `"beginsWith"`; formula 는 `LEFT(topLeft, LEN(value)) = value` 형태다.
- `op: "endsWith"` — cfRule type/operator `"endsWith"`; formula 는 `RIGHT(topLeft, LEN(value)) = value` 형태다.
- `type: "expression"` — raw formula 조건부 서식. cfRule type 은 `"expression"` 이고 operator/text 는 저장하지 않는다.
- `formula` — expression 규칙에서 그대로 formula 배열 1개로 저장되는 Excel 수식 문자열.
- `style` — dxf 로 등록할 조건부 서식 강조 스타일. 동일 dxf 구조가 이미 있으면 dxfId 를 재사용한다.

## 누적·저장 동작

- `addConditionalFormat` 는 호출마다 worksheet `conditionalFormatting` 블록을 새로 push 한다.
- 각 rule 은 `styleData.addDxf(rule.style)` 로 dxfId 를 받은 뒤 cfRule 에 연결된다.
- 정적 셀 스타일과 조건부 서식의 합성은 Excel native 조건부 서식 오버레이에 맡긴다.
- `toBytes()` 로 저장 후 다시 열어도 cfRule, formula, dxfId, dxf 스타일이 파트에 보존된다.