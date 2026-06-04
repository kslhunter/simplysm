# @simplysm/excel — 셀 스타일

셀(`cell.setStyle(opts)`)이나 워크북 default(`wb.setDefaultStyle(opts)`)에 배경·테두리·정렬·숫자형식·폰트를 줄 때 참조. 두 호출 모두 동일한 `ExcelStyleOptions` 를 받는다. 미지정 필드는 emit 하지 않아 엑셀 기본값으로 표시되며, `cell.setStyle` 은 기존 셀 스타일을 clone 후 지정 필드만 병합(부분 갱신)한다.

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

- `background?: string` — 배경 채움색. ARGB 8자리 16진수(앞 2자리 알파, 예 `"00FF0000"` = 빨강). 셀 강조·헤더색에 사용.
- `border?: ExcelBorderPosition[]` — 테두리를 그릴 변 배열. 원소는 `"left" | "right" | "top" | "bottom"`. 4변 전부면 4개를 모두 넣음(`["left","right","top","bottom"]`). 빈 배열·미지정은 테두리 없음.
- `horizontalAlign?: "center" | "left" | "right"` — 가로 정렬. `"center"` = 가운데, `"left"`/`"right"` = 좌/우. 미지정 시 셀 기본(엑셀 자동).
- `verticalAlign?: "center" | "top" | "bottom"` — 세로 정렬. `"center"` = 가운데, `"top"`/`"bottom"` = 위/아래. 행 높이가 큰 셀에서 의미.
- `numberFormat?: "number" | "string" | "DateOnly" | "DateTime" | "Time"` — 숫자형식 프리셋. `"number"` = 일반 수치(numFmtId 0), `"string"` = 텍스트(49), `"DateOnly"`(14)/`"DateTime"`(22)/`"Time"`(18) = 날짜/시간 표시. 표준 형식이면 이걸로 충분.
- `numberFormatCode?: string` — 커스텀 엑셀 formatCode(예 `"0.000000"`, `"#,##0.00"`, `"0.00%"`). `numberFormat` 과 동시 지정 시 이 필드가 우선. 천단위·소수 자릿수·퍼센트 등 세밀한 표시가 필요할 때.
- `font?: ExcelFont` — 폰트 묶음(아래). 일부 속성만 줘도 되며, 미지정 속성은 워크북 default 폰트로 표시.

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
- `family?: string` — 폰트명(예 `"맑은 고딕"`, `"Calibri"`). 한글 문서면 보통 `"맑은 고딕"`.
- `bold?: boolean` — 굵게. `true` = 볼드, 미지정/`false` = 보통.
- `italic?: boolean` — 기울임. `true` = 이탤릭.
- `underline?: "single" | "double" | "singleAccounting" | "doubleAccounting"` — 밑줄 종류. `<u val="...">` 의 val 로 그대로 emit. 회계용이면 `*Accounting`.
- `color?: string` — 글자색. ARGB 8자리(예 `"00FF0000"`).
- `strike?: boolean` — 취소선. `true` = 취소선 표시.

## 사용 예

```typescript
// 셀 단위
await ws.cell(0, 0).setStyle({
  background: "00FFFF00",          // 노랑 헤더
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  verticalAlign: "center",
  font: { family: "맑은 고딕", bold: true },
});

// 커스텀 숫자 형식
await ws.cell(1, 2).setStyle({ numberFormatCode: "#,##0.00" });

// 워크북 전역 default
await wb.setDefaultStyle({ font: { family: "맑은 고딕", size: 10 } });
```

## 주의사항

- `setDefaultStyle` 은 styles.xml 의 0번 자원 슬롯(font/fill/border)을 덮어쓴다 — fontId/fillId/borderId 를 명시하지 않은 모든 셀이 영향을 받는다. 옵션에 없는 자원은 0번 슬롯이 빈 슬롯으로 reset 되므로, default 로 줄 항목은 한 번에 모아 호출.
- `numberFormat` 과 `numberFormatCode` 동시 지정 시 `numberFormatCode` 우선.
- 색상은 모두 ARGB 8자리(알파 포함). RGB 6자리만 주면 의도와 다르게 해석될 수 있다.
- 날짜/시간 셀은 값으로 `DateOnly`/`DateTime`/`Time` 을 넣으면 numFmt 가 자동 부여되므로 보통 `numberFormat` 을 따로 줄 필요가 없다.
