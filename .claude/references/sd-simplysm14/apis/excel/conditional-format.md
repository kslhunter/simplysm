# @simplysm/excel — 조건부 서식

셀/범위에 값 비교·텍스트 매칭·수식 기반의 엑셀 native 조건부 서식(CF)을 추가할 때 참조. `ws.addConditionalFormat({ ref, rules })` 한 메서드로 적용하며, 규칙은 `ExcelConditionalRule` 유니온으로 표현한다. 정적 셀 스타일과의 합성은 엑셀 native CF 오버레이에 위임된다(라이브러리가 직접 색을 칠하지 않음).

## addConditionalFormat

```typescript
ws.addConditionalFormat(opts: { ref: string; rules: ExcelConditionalRule[] }): Promise<void>
```

- `opts.ref: string` — 적용 대상. 단일 셀(`"A1"`) 또는 범위(`"A1:B10"`) 엑셀 주소. text 류 규칙의 비교 기준 셀은 ref 의 좌상단 셀.
- `opts.rules: ExcelConditionalRule[]` — 적용 규칙 배열. 배열 순서가 priority(앞이 우선)이며, 같은 시트에 여러 번 호출하면 호출마다 `<conditionalFormatting>` 블록이 누적되고 priority 는 시트 전역 카운터로 이어붙는다. 빈 배열이면 no-op.

## ExcelConditionalRule

값 비교(단일):

- `{ type: "cellIs"; op: "<" | ">" | "<=" | ">=" | "=" | "<>"; value: number | string; style }` — 셀 값과 `value` 의 단일 비교. `op` = 비교 연산자(`"<>"` = 같지 않음). `value: number` 는 raw formula(`4999`), `value: string` 은 따옴표 리터럴(`"OK"`)로 emit. 수치 임계·특정 텍스트 일치 강조에.

값 비교(구간):

- `{ type: "cellIs"; op: "between" | "notBetween"; value: [number, number] | [string, string]; style }` — 두 값 사이 구간 비교(양 끝 inclusive). `op` = `"between"`(구간 안)/`"notBetween"`(구간 밖). `value` = `[a, b]` 튜플.

텍스트 매칭:

- `{ type: "text"; op: "contains" | "notContains" | "beginsWith" | "endsWith"; value: string; style }` — 문자열 매칭. `op` = `"contains"`(포함)/`"notContains"`(미포함)/`"beginsWith"`(시작)/`"endsWith"`(끝). 내부적으로 SEARCH 기반(대소문자 무시) formula 로 변환되며 비교 기준은 ref 좌상단 셀. 부분 문자열·접두/접미 강조에.

수식:

- `{ type: "expression"; formula: string; style }` — 임의 엑셀 수식 기반. `formula` 가 TRUE 인 셀에 style 적용. `=` 없이 본문만(예 `"$B2>$C2"`). 다른 셀 참조·복합 조건 등 위 프리셋으로 안 되는 규칙에.

각 규칙의 `style` 은 아래 `ExcelConditionalRuleStyle`.

## ExcelConditionalRuleStyle

```typescript
interface ExcelConditionalRuleStyle {
  background?: string;
  fontColor?: string;
  fontWeight?: "bold" | "normal";
}
```

- `background?: string` — 강조 배경색(ARGB 8자리, 예 `"00FFFF00"`). 미지정 시 base 셀 배경 유지.
- `fontColor?: string` — 강조 글자색(ARGB 8자리). 미지정 시 base 글자색 유지.
- `fontWeight?: "bold" | "normal"` — 글자 굵기. `"bold"` = 굵게, `"normal"` = base 가 bold 라도 강제 보통. 미지정 시 base 유지.

지정한 필드만 OOXML dxf 로 emit 되어 native CF 오버레이로 합성된다(미지정 필드는 base 그대로).

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

- `rules` 배열 순서 = priority(앞이 우선). 겹치는 조건은 앞 규칙이 이긴다.
- 여러 번 호출하면 블록이 누적되고 priority 카운터가 시트 전역으로 이어진다 — 한 범위의 규칙은 한 번의 호출에 모아 넣는 편이 우선순위 예측에 유리.
- `value: string` 과 `expression.formula` 의 따옴표/이스케이프는 라이브러리가 처리하므로 원문 그대로 전달.
