# @simplysm/excel — 셀 스타일

`ExcelCell.setStyle(opts)` 와 `ExcelWorkbook.setDefaultStyle(opts)` 가 함께 받는 스타일 옵션. 셀 스타일은 기존 styleId 가 있으면 clone 후 지정 필드만 반영. 워크북 default 스타일은 0번 font/fill/border 자원 슬롯과 `cellXfs[0]` 를 직접 갱신.

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

- `background: string` — 배경색. ARGB 8자리 16진수(예: `"00FF0000"` = 빨강). 셀 fill `fgColor` 로 저장. 형식 검증 실패하면 throw.
- `border: ExcelBorderPosition[]` — 테두리를 줄 방향 배열. 지정 방향에만 테두리 생성. 기존 스타일 clone 시 배열에 없는 방향은 제거.
- `horizontalAlign: ExcelHorizontalAlign` — 가로 정렬(`"center"` / `"left"` / `"right"`). 셀 xf alignment 에 반영.
- `verticalAlign: ExcelVerticalAlign` — 세로 정렬(`"center"` / `"top"` / `"bottom"`). 셀 xf alignment 에 반영.
- `numberFormat: ExcelNumberFormat` — 숫자 형식 프리셋(`"number"` / `"string"` / `"DateOnly"` / `"DateTime"` / `"Time"`). 내장 numFmtId 로 지정.
- `numberFormatCode: string` — 커스텀 Excel formatCode 문자열(예: `"0.000000"` / `"#,##0.00"` / `"0.00%"`). `numberFormat` 보다 우선 적용. 사용자 정의 numFmt 로 등록.
- `font: ExcelFont` — 폰트 옵션 묶음. 미지정 속성은 OOXML `<font>` 엘리먼트 생성 안 함.

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

`ExcelStyleOptions.font` 와 `setDefaultStyle({ font })` 가 공유한다. 미지정 속성은 OOXML `<font>` 자식 엘리먼트로 emit 되지 않으며 Excel 기본값으로 표시된다.

- `size` — 폰트 크기(pt). `<sz val>` 로 저장.
- `family` — 폰트명(예: `"맑은 고딕"`, `"Calibri"`). `<name val>` 로 저장.
- `bold` — 굵게.
- `italic` — 기울임.
- `underline` — 밑줄. `ExcelFontUnderline` 값이 `<u val>` 에 그대로 매핑된다.
- `color` — 글자색(ARGB 8자리).
- `strike` — 취소선.

## 스타일 enum/literal 타입

```typescript
type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
type ExcelHorizontalAlign = "center" | "left" | "right";
type ExcelVerticalAlign = "center" | "top" | "bottom";
type ExcelFontUnderline = "single" | "double" | "singleAccounting" | "doubleAccounting";
```

- `ExcelBorderPosition` — 테두리를 줄 방향. `"left"`/`"right"`/`"top"`/`"bottom"` 각각 해당 변 테두리를 만든다.
- `ExcelHorizontalAlign` — 가로 정렬. `"center"` 가운데, `"left"` 왼쪽, `"right"` 오른쪽.
- `ExcelVerticalAlign` — 세로 정렬. `"center"` 가운데, `"top"` 위, `"bottom"` 아래.
- `ExcelFontUnderline` — 밑줄 형식. `"single"` 단선, `"double"` 이중선, `"singleAccounting"`/`"doubleAccounting"` 회계용 단선/이중선. `<u val>` 에 그대로 저장된다.

## 적용 동작

- `cell.setStyle(opts)` — `convertExcelStyleOptions` 로 내부 스타일로 변환한 뒤, 셀에 styleId 가 없으면 새 스타일을 등록하고(`add`), 있으면 기존 스타일을 clone 한 뒤 지정 필드만 덮어쓴 새 스타일을 등록한다(`addWithClone`). 동일 스타일은 styles 파트에서 재사용된다.
- `wb.setDefaultStyle(opts)` — 0번 font/fill/border 자원 슬롯을 입력 옵션으로 덮어쓰고, 옵션이 없는 자원 슬롯은 빈 슬롯(`{}`/patternType="none")으로 reset 한다. 정렬·숫자 형식은 `cellXfs[0].xf[0]` 에 반영한다. 미호출 시 0번 슬롯과 `cellXfs[0]` 는 원본이 보존된다.
- `background`/`font.color` — ARGB 8자리 형식 검증(`convertExcelStyleOptions` 는 background 만 검증, font 검증은 스타일 모델 내부)을 거친다.
- `numberFormatCode` 우선 — `numberFormat` 과 동시 지정 시 `numberFormatCode` 가 적용된다.
