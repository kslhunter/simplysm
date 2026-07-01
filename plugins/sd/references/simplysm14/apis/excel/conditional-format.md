# @simplysm/excel — 조건부 서식

`ExcelWorksheet.addConditionalFormat` 과 `ExcelConditionalRule`/`ExcelConditionalRuleStyle` 타입을 함께 읽는 묶음. 값 비교·텍스트 매칭·raw 수식 조건을 worksheet `conditionalFormatting` 블록으로 누적하고, 강조 스타일은 styles 파트의 dxf 로 등록한다.

## addConditionalFormat

```typescript
ws.addConditionalFormat(opts: { ref: string; rules: ExcelConditionalRule[] }): Promise<void>
```

- `opts.ref` — 적용할 단일 셀(`"A1"`) 또는 범위(`"A1:B10"`) A1 주소. worksheet `sqref` 로 저장되고, 텍스트 규칙 formula 의 기준 top-left 셀(`ref.split(":")[0]`)을 여기서 뽑는다.
- `opts.rules` — 규칙 배열. 배열 순서가 priority(앞이 우선)이며, 빈 배열이면 아무 작업도 하지 않는다.
- 누적: 같은 시트에 여러 번 호출하면 호출마다 `<conditionalFormatting>` 블록이 누적되고, priority 는 시트 전역 카운터로 호출 간 이어붙는다.
- 합성: 정적 셀 스타일과 조건부 서식의 합성은 Excel native CF 오버레이에 위임한다.

## ExcelConditionalRuleStyle

```typescript
interface ExcelConditionalRuleStyle {
  background?: string;
  fontColor?: string;
  fontWeight?: "bold" | "normal";
}
```

조건부 서식 강조 스타일. 미지정 필드는 base 셀 스타일을 그대로 두고, 지정 필드만 OOXML dxf 로 emit 되어 native CF 오버레이로 합성된다.

- `background` — 배경색(ARGB 8자리, 예: `"00FFFF00"`). dxf fill 의 solid `patternFill.bgColor.rgb` 로 저장된다.
- `fontColor` — 글자색(ARGB 8자리). dxf `font.color.rgb` 로 저장된다.
- `fontWeight` — 글자 굵기. `"bold"` 는 dxf `font.b val="1"`, `"normal"` 은 `val="0"` 으로 emit 되며, `"normal"` 은 base 가 bold 라도 강제 normal 로 둔다.

## ExcelConditionalRule

```typescript
type ExcelConditionalRule =
  | {
      type: "cellIs";
      op: "<" | ">" | "<=" | ">=" | "=" | "<>";
      value: number | string;
      style: ExcelConditionalRuleStyle;
    }
  | {
      type: "cellIs";
      op: "between" | "notBetween";
      value: [number, number] | [string, string];
      style: ExcelConditionalRuleStyle;
    }
  | {
      type: "text";
      op: "contains" | "notContains" | "beginsWith" | "endsWith";
      value: string;
      style: ExcelConditionalRuleStyle;
    }
  | { type: "expression"; formula: string; style: ExcelConditionalRuleStyle };
```

- `type: "cellIs"` (단일 비교) — `op` 은 `<`/`>`/`<=`/`>=`/`=`/`<>`. `value` 는 number 또는 string.
- `type: "cellIs"` (구간) — `op` 은 `between`/`notBetween`. `value` 는 `[a, b]` 튜플(양 끝 inclusive), number 또는 string 쌍.
- `type: "text"` — `op` 은 `contains`/`notContains`/`beginsWith`/`endsWith`. `value` 는 string. SEARCH 기반(대소문자 무시) 고정.
- `type: "expression"` — `formula` 는 raw Excel 수식 문자열로 그대로 formula 배열 1개에 들어간다(operator/text 없음).
- `style` — dxf 로 등록할 강조 스타일(`ExcelConditionalRuleStyle`).

`op` → OOXML operator 매핑(`cellIs`): `<`→`lessThan`, `>`→`greaterThan`, `<=`→`lessThanOrEqual`, `>=`→`greaterThanOrEqual`, `=`→`equal`, `<>`→`notEqual`, `between`→`between`, `notBetween`→`notBetween`.

`value` 인코딩(`cellIs`): `number` 는 따옴표 없는 숫자 리터럴(예: `<formula>4999</formula>`), `string` 은 큰따옴표로 감싼 리터럴(내부 `"` 는 `""` escape, 예: `<formula>"OK"</formula>`). 구간은 양쪽 값을 formula 2개로 저장한다.

`text` 규칙 formula(top-left = `ref` 첫 주소):

- `contains` — type/operator `containsText`; `NOT(ISERROR(SEARCH("value",topLeft)))`.
- `notContains` — type `notContainsText`, operator `notContains`; `ISERROR(SEARCH("value",topLeft))`.
- `beginsWith` — type/operator `beginsWith`; `LEFT(topLeft,LEN("value"))="value"`.
- `endsWith` — type/operator `endsWith`; `RIGHT(topLeft,LEN("value"))="value"`.

## 누적·저장 동작

- 각 rule 의 `style` 은 `styleData.addDxf(...)` 로 dxfId 를 받아 cfRule 에 연결된다.
- `wsData.addConditionalFormatting(ref, dxfRules)` 로 worksheet 에 블록을 추가한다.
- 정적 셀 스타일과 조건부 서식의 합성은 Excel native CF 오버레이가 담당한다.
