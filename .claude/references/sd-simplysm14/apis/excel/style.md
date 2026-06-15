# @simplysm/excel — 셀 스타일

셀(`cell.setStyle(opts)`)이나 워크북 default(`wb.setDefaultStyle(opts)`)에 배경·테두리·정렬·숫자형식·폰트를 줄 때 참조. 두 호출 모두 동일한 `ExcelStyleOptions` 를 받는다. 미지정 필드는 OOXML 자식 엘리먼트로 emit 하지 않아 엑셀 기본값으로 표시되며, `cell.setStyle` 은 기존 셀 스타일을 clone 후 지정 필드만 병합(부분 갱신)한다.

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

- `background` — 배경색(ARGB 8자리 16진수, 예 `"00FF0000"` = 빨강). solid fill 로 채운다.
- `border: ExcelBorderPosition[]` — 테두리를 그릴 변(`"left"|"right"|"top"|"bottom"`)의 배열. 4변 전부면 4개를 모두 넣는다.
- `horizontalAlign` — 가로 정렬(`"center"|"left"|"right"`). 미지정 시 엑셀 기본.
- `verticalAlign` — 세로 정렬(`"center"|"top"|"bottom"`). 미지정 시 엑셀 기본.
- `numberFormat: ExcelNumberFormat` — 숫자형식 프리셋(`"number"|"string"|"DateOnly"|"DateTime"|"Time"`). 내장 numFmtId(0/49/14/22/18)로 매핑된다.
- `numberFormatCode` — 임의 Excel formatCode 문자열(예 `"0.000000"`, `"#,##0.00"`, `"0.00%"`). `numberFormat` 과 동시 지정 시 이 필드가 우선 적용된다.
- `font: ExcelFont` — 폰트 속성(아래). 미지정 폰트 속성은 워크북 default 폰트로 표시된다.

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

- `size` — 폰트 크기(pt).
- `family` — 폰트명(예 `"맑은 고딕"`, `"Calibri"`).
- `bold` — 굵게.
- `italic` — 기울임.
- `underline: ExcelFontUnderline` — 밑줄 종류(`"single"|"double"|"singleAccounting"|"doubleAccounting"`). `<u val="...">` 의 val 에 그대로 매핑.
- `color` — 글자색(ARGB 8자리, 예 `"00FF0000"`).
- `strike` — 취소선.

`ExcelFont` 은 셀 단위 override(`ExcelStyleOptions.font`)와 워크북 default(`wb.setDefaultStyle({ font })`) 양쪽이 공유한다. 미지정 속성은 `<font>` 자식 엘리먼트로 emit 되지 않으며 엑셀 자체 기본값으로 표시된다.

## 사용 예

```typescript
await cell.setStyle({
  background: "00FFFF00",
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  numberFormatCode: "#,##0",
  font: { family: "맑은 고딕", size: 10, bold: true },
});
```

## 주의사항

- `cell.setStyle` 은 부분 갱신(clone + merge)이므로, 같은 셀에 두 번 호출하면 두 호출의 지정 필드가 누적된다.
- `wb.setDefaultStyle` 은 0번 자원 슬롯 자체를 덮어쓰는 전역 설정이라 동작이 다르다 — `font`/`background`/`border` 미지정 슬롯은 빈 슬롯으로 reset 되고, `horizontalAlign`/`verticalAlign`/`numberFormat`/`numberFormatCode` 는 `cellXfs[0]` 에 박힌다(상세는 [workbook-worksheet.md](./workbook-worksheet.md)).
- 색상은 모두 ARGB 8자리(앞 2자리 알파). 6자리 RGB 가 아님.
