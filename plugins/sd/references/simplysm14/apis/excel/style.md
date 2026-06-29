# @simplysm/excel — 셀 스타일

`ExcelCell.setStyle(opts)` 와 `ExcelWorkbook.setDefaultStyle(opts)` 에서 함께 쓰는 스타일 타입 묶음. 셀 스타일은 기존 styleId 를 clone 해 지정 필드만 반영하고, 워크북 default 스타일은 0번 font/fill/border 자원 슬롯과 `cellXfs[0]` 를 직접 갱신한다.

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

- `background` — ARGB 8자리 배경색. 형식 검증(`/^[0-9A-F]{8}$/i`)을 통과하지 못하면 throw 하고, 저장 시 대문자로 변환된다.
- `border` — 테두리를 줄 방향 배열. 지정 방향은 `thin` 스타일과 `00000000` 색상으로 생성되고, 기존 스타일 clone 에서는 배열에 없는 방향이 제거된다.
- `horizontalAlign` — 가로 정렬. 값은 `"center" | "left" | "right"`.
- `verticalAlign` — 세로 정렬. 값은 `"center" | "top" | "bottom"`.
- `numberFormat` — 숫자 형식 프리셋. `ExcelUtils.convertNumFmtNameToId` 로 내장 numFmtId 를 지정한다.
- `numberFormatCode` — Excel formatCode 문자열. 지정 시 사용자 정의 numFmt 를 등록하고 `numberFormat` 보다 우선한다.
- `font` — 폰트 옵션 묶음. 색상은 ARGB 8자리 검증을 거쳐 대문자로 저장된다.

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

- `size` — 폰트 크기 pt 값. OOXML `<sz val>` 로 저장된다.
- `family` — 폰트명. OOXML `<name val>` 로 저장된다.
- `bold` — true 일 때 굵게 요소를 emit 한다. false 또는 미지정은 요소를 emit 하지 않는다.
- `italic` — true 일 때 기울임 요소를 emit 한다. false 또는 미지정은 요소를 emit 하지 않는다.
- `underline` — 밑줄 형식. 값은 `<u val>` 에 그대로 저장된다.
- `color` — ARGB 8자리 글자색. 형식 검증 후 `<color rgb>` 에 대문자로 저장된다.
- `strike` — true 일 때 취소선 요소를 emit 한다. false 또는 미지정은 요소를 emit 하지 않는다.

## 스타일 enum 타입

```typescript
type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
type ExcelHorizontalAlign = "center" | "left" | "right";
type ExcelVerticalAlign = "center" | "top" | "bottom";
type ExcelFontUnderline = "single" | "double" | "singleAccounting" | "doubleAccounting";
```

- `"left"` — 왼쪽 테두리 위치. `border` 에 포함되면 left border 가 생성된다.
- `"right"` — 오른쪽 테두리 위치. `border` 에 포함되면 right border 가 생성된다.
- `"top"` — 위쪽 테두리 위치. `border` 에 포함되면 top border 가 생성된다.
- `"bottom"` — 아래쪽 테두리 위치. `border` 에 포함되면 bottom border 가 생성된다.
- `"center"` — 가로/세로 정렬 모두에서 가운데 정렬 literal.
- `"left"` — 가로 정렬에서 왼쪽 정렬 literal.
- `"right"` — 가로 정렬에서 오른쪽 정렬 literal.
- `"top"` — 세로 정렬에서 위쪽 정렬 literal.
- `"bottom"` — 세로 정렬에서 아래쪽 정렬 literal.
- `"single"` — 밑줄 val literal. 읽을 때 `<u>` 에 val 이 없으면 이 값으로 파싱된다.
- `"double"` — 이중 밑줄 val literal.
- `"singleAccounting"` — singleAccounting 밑줄 val literal.
- `"doubleAccounting"` — doubleAccounting 밑줄 val literal.

## 적용 동작

- `cell.setStyle(opts)` — 셀에 styleId 가 없으면 새 스타일을 등록한다. styleId 가 있으면 기존 xf 를 clone 하고 지정 필드만 반영한 새 스타일을 등록한다.
- `wb.setDefaultStyle(opts)` — 0번 font/fill/border 자원 슬롯을 먼저 빈 슬롯으로 reset 한 뒤 지정 옵션을 반영한다. 숫자 형식과 정렬은 `cellXfs[0].xf[0]` 에 반영한다.
- `numberFormatCode` — 동일 formatCode 가 이미 있으면 기존 numFmtId 를 재사용한다. 새 formatCode 는 현재 사용자 정의 numFmt 최대 ID 다음 ID로 등록된다.
- `background` — 일반 셀 스타일에서는 fill `fgColor` 로 저장된다.
- `font` — 동일 폰트 XML 이 이미 있으면 fontId 를 재사용한다.
- `border` — 동일 border XML 이 이미 있으면 borderId 를 재사용한다.
- `horizontalAlign` / `verticalAlign` — 지정 시 `applyAlignment="1"` 을 설정하고 alignment 속성에 값을 저장한다.