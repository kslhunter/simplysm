# @simplysm/excel — 조건부 서식

셀/범위에 값 비교·텍스트 매칭·수식 기반의 native CF(Excel 조건부 서식) 규칙을 추가할 때 함께 읽는 묶음. `ws.addConditionalFormat` 에 `ExcelConditionalRule[]` 을 넘기며, 각 규칙은 `ExcelConditionalRuleStyle` 강조 스타일을 가진다.

## ws.addConditionalFormat

```typescript
addConditionalFormat(opts: { ref: string; rules: ExcelConditionalRule[] }): Promise<void>
```

- `opts.ref: string` — 단일 셀(`"A1"`) 또는 범위(`"A1:B10"`) Excel 주소. 규칙 수식은 범위의 좌상단 셀 기준으로 생성된다.
- `opts.rules: ExcelConditionalRule[]` — 적용할 규칙 배열. 배열 순서가 priority(앞이 우선)이며, 호출 간에는 시트 전역 카운터로 이어붙는다. 빈 배열이면 no-op.
- 같은 시트에 여러 번 호출하면 호출마다 `<conditionalFormatting>` 블록이 누적된다. 정적 셀 스타일과의 합성은 Excel native CF 오버레이에 위임.

## ExcelConditionalRule

4개 변형의 유니온. 모든 변형이 `style: ExcelConditionalRuleStyle` 를 가진다.

- `{ type: "cellIs"; op: "<" | ">" | "<=" | ">=" | "=" | "<>"; value: number | string; style }` — 단일 값 비교. `op` = 비교 연산자, `value` = 비교 대상(숫자는 raw formula, 문자열은 따옴표 리터럴 formula 로 emit).
- `{ type: "cellIs"; op: "between" | "notBetween"; value: [number, number] | [string, string]; style }` — 구간 비교. `value` = `[a, b]` 튜플(양 끝 inclusive). `"between"` = 구간 안, `"notBetween"` = 구간 밖.
- `{ type: "text"; op: "contains" | "notContains" | "beginsWith" | "endsWith"; value: string; style }` — 텍스트 매칭. `value` = 비교 문자열. `"contains"`/`"notContains"` = 포함/미포함, `"beginsWith"`/`"endsWith"` = 시작/끝 일치. SEARCH 기반 대소문자 무시 고정.
- `{ type: "expression"; formula: string; style }` — 임의 수식 규칙. `formula` = Excel 수식 문자열(true 면 강조). 프리셋으로 표현 못하는 조건일 때.

## ExcelConditionalRuleStyle

```typescript
interface ExcelConditionalRuleStyle {
  background?: string;
  fontColor?: string;
  fontWeight?: "bold" | "normal";
}
```

- `background?: string` — 강조 배경색. ARGB 8자리(예: `"00FFFF00"`).
- `fontColor?: string` — 강조 글자색. ARGB 8자리.
- `fontWeight?: "bold" | "normal"` — 글자 굵기. `"bold"` = 굵게, `"normal"` = base 가 bold 라도 강제 normal.

미지정 필드는 base 셀 스타일을 그대로 두고, 지정 필드만 OOXML dxf 로 emit 되어 native CF 오버레이로 합성된다.

## 사용 예

```typescript
await ws.addConditionalFormat({
  ref: "B2:B100",
  rules: [
    { type: "cellIs", op: "<", value: 1000, style: { background: "00FF0000" } },
    { type: "cellIs", op: "between", value: [1000, 4999], style: { background: "00FFFF00" } },
    { type: "text", op: "contains", value: "긴급", style: { fontColor: "00FF0000", fontWeight: "bold" } },
  ],
});
```
