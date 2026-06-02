# @simplysm/excel — 셀 스타일

셀(`cell.setStyle`) 또는 워크북 default(`wb.setDefaultStyle`)의 배경·테두리·정렬·숫자형식·폰트를 지정할 때 함께 읽는 묶음. 두 API 모두 `ExcelStyleOptions` 를 받으며 `font` 는 `ExcelFont` 를 공유한다.

## ExcelStyleOptions

```typescript
interface ExcelStyleOptions {
  background?: string;
  border?: ExcelBorderPosition[];
  horizontalAlign?: ExcelHorizontalAlign;
  verticalAlign?: ExcelVerticalAlign;
  numberFormat?: ExcelNumberFormat;
  numberFormatCode?: string;
  font?: ExcelFont;
}
```

- `background?: string` — 배경색. ARGB 8자리 16진수(예: `"00FF0000"` = 빨강). 셀 채우기 색이 필요할 때.
- `border?: ExcelBorderPosition[]` — 테두리를 그릴 변 배열. 원소 = `"left" | "right" | "top" | "bottom"`. 4변 모두면 `["left","right","top","bottom"]`.
- `horizontalAlign?: "center" | "left" | "right"` — 가로 정렬.
- `verticalAlign?: "center" | "top" | "bottom"` — 세로 정렬.
- `numberFormat?: "number" | "string" | "DateOnly" | "DateTime" | "Time"` — 숫자형식 프리셋. `"number"` = 일반 수치, `"string"` = 텍스트 형식, 나머지는 날짜/시간 표시 형식. 표준 형식 적용 시 사용.
- `numberFormatCode?: string` — 커스텀 Excel formatCode(예: `"0.000000"`, `"#,##0.00"`, `"0.00%"`). `numberFormat` 과 동시 지정 시 **이 필드가 우선**. 프리셋에 없는 세밀한 형식이 필요할 때.
- `font?: ExcelFont` — 폰트 묶음(아래). 미지정 속성은 워크북 default 폰트로 표시.

## ExcelFont

```typescript
interface ExcelFont {
  size?: number;
  family?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: ExcelFontUnderline;
  color?: string;
  strike?: boolean;
}
```

- `size?: number` — 폰트 크기(pt).
- `family?: string` — 폰트명(예: `"맑은 고딕"`, `"Calibri"`).
- `bold?: boolean` — 굵게. `true` 면 굵게.
- `italic?: boolean` — 기울임. `true` 면 이탤릭.
- `underline?: "single" | "double" | "singleAccounting" | "doubleAccounting"` — 밑줄 종류. OOXML `<u val="...">` val 에 그대로 매핑.
- `color?: string` — 글자색. ARGB 8자리(예: `"00FF0000"`).
- `strike?: boolean` — 취소선. `true` 면 가운데줄.

미지정 폰트 속성은 OOXML `<font>` 자식으로 emit 되지 않고 Excel 기본값으로 표시된다.

## cell.setStyle vs wb.setDefaultStyle

- `cell.setStyle(opts)` — 해당 셀에만 스타일 적용. 기존 셀 스타일이 있으면 clone 후 옵션을 병합.
- `wb.setDefaultStyle(opts)` — `xl/styles.xml` 의 `fonts[0]`/`fills[0]`/`borders[0]`(OOXML default 슬롯) 자체를 덮어써, fontId/fillId/borderId 를 명시하지 않은 모든 셀에 전역 적용. `horizontalAlign`/`verticalAlign`/`numberFormat`/`numberFormatCode` 는 0번 슬롯 개념이 없어 `cellXfs[0]` 에 박힌다. 옵션이 없는 자원은 0번 슬롯이 빈 슬롯으로 reset 되며, 미호출 시 원본이 보존된다.

### 사용 예

```typescript
await wb.setDefaultStyle({ font: { family: "맑은 고딕", size: 10 }, horizontalAlign: "center" });

await ws.cell(0, 0).setStyle({
  background: "00FFFF00",
  border: ["left", "right", "top", "bottom"],
  font: { bold: true, color: "00FF0000" },
  numberFormatCode: "#,##0",
});
```
