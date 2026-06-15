# @simplysm/excel — 조건부 서식

셀/범위에 값 비교·텍스트 매칭·수식 기반의 엑셀 native 조건부 서식(CF)을 추가할 때 참조. `ws.addConditionalFormat({ ref, rules })` 한 메서드로 적용하며, 규칙은 `ExcelConditionalRule` 유니온으로 표현한다. 정적 셀 스타일과의 합성은 엑셀 native CF 오버레이에 위임된다(라이브러리가 직접 색을 칠하지 않음).

## addConditionalFormat

```typescript
ws.addConditionalFormat(opts: { ref: string; rules: ExcelConditionalRule[] }): Promise<void>
```

- `ref` — 단일 셀(`"A1"`) 또는 범위(`"A1:B10"`) 엑셀 주소. text/expression 규칙의 수식은 범위 좌상단(`ref` 의 `:` 앞 토큰)을 기준 셀로 삼는다.
- `rules` — 적용할 규칙 배열. 배열 순서가 priority(앞이 우선)이며, 같은 시트에 여러 번 호출하면 priority 가 시트 전역 카운터로 이어붙는다(1,2,3,…). 빈 배열이면 no-op.

같은 시트에 여러 번 호출하면 호출마다 `<conditionalFormatting>` 블록이 누적되고, 동일 `style` 의 규칙은 dxf 가 dedupe 되어 1개로 등록된다.

## ExcelConditionalRule

네 가지 변형의 유니온.

```typescript
type ExcelConditionalRule =
  | { type: "cellIs"; op: "<" | ">" | "<=" | ">=" | "=" | "<>"; value: number | string; style: ExcelConditionalRuleStyle }
  | { type: "cellIs"; op: "between" | "notBetween"; value: [number, number] | [string, string]; style: ExcelConditionalRuleStyle }
  | { type: "text"; op: "contains" | "notContains" | "beginsWith" | "endsWith"; value: string; style: ExcelConditionalRuleStyle }
  | { type: "expression"; formula: string; style: ExcelConditionalRuleStyle };
```

- `type: "cellIs"` 단일 비교 — `op` 가 `<`/`>`/`<=`/`>=`/`=`/`<>`. `value` 는 `number`(raw formula `<formula>4999</formula>`) 또는 `string`(따옴표 리터럴 `<formula>"OK"</formula>`). OOXML operator(`lessThan`/`greaterThan`/`lessThanOrEqual`/`greaterThanOrEqual`/`equal`/`notEqual`)로 매핑.
- `type: "cellIs"` 구간 — `op` 가 `between`/`notBetween`. `value` 는 `[a, b]` 튜플(양 끝 inclusive), number 튜플은 `["1000","2000"]`, string 튜플은 `['"A"','"M"']` 두 formula 로 emit.
- `type: "text"` 텍스트 매칭 — `op` 가 `contains`/`notContains`/`beginsWith`/`endsWith`. `value` 는 string. `contains` 는 `NOT(ISERROR(SEARCH(...)))`, `notContains` 는 `ISERROR(SEARCH(...))`, `beginsWith` 는 `LEFT(...)=v`, `endsWith` 는 `RIGHT(...)=v` 수식으로 emit(SEARCH 기반, 대소문자 무시 고정). 따옴표는 OOXML escape 규칙대로 두 배(`a"b` → `a""b`).
- `type: "expression"` — 임의 수식. `formula` 문자열을 raw 그대로 1개 formula 로 emit(operator 미부여). `AND($F2<>"",$F2-TODAY()<=7)` 같은 복합 조건에 사용.

## ExcelConditionalRuleStyle

```typescript
interface ExcelConditionalRuleStyle {
  background?: string;
  fontColor?: string;
  fontWeight?: "bold" | "normal";
}
```

- `background` — 강조 배경색(ARGB 8자리, 예 `"00FFFF00"`).
- `fontColor` — 강조 글자색(ARGB 8자리).
- `fontWeight` — `"bold"` = 굵게, `"normal"` = base 가 bold 라도 강제 normal.

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

## 주의사항

- 규칙 배열 순서 = priority. 앞 규칙이 먼저 평가된다.
- `value` 의 number/string 구분이 formula emit 방식을 바꾼다 — 비교 대상이 텍스트면 반드시 `string` 으로 줄 것.
- toBytes → 재오픈 roundtrip 에서 type/operator/text/formula/dxf 가 보존된다.
