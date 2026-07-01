# @simplysm/excel — OOXML XML-shape 타입

`types.ts` 가 노출하는 XML 직렬화 구조 타입 묶음. 일반 workbook API 사용보다, 패키지 내부 XML 모델·테스트·디버그에서 `data` 트리의 shape 를 해석할 때 함께 본다.

## 패키지 메타데이터 XML

### ExcelXmlContentTypeData

```typescript
interface ExcelXmlContentTypeData {
  Types: { $: { xmlns: string }; Default: { $: { Extension: string; ContentType: string } }[]; Override: { $: { PartName: string; ContentType: string } }[] };
}
```

- `Types` — `[Content_Types].xml` 루트.
- `$.xmlns` — content types XML namespace.
- `Default` — 확장자별 기본 content type 목록.
- `Default.$.Extension` — 기본 content type 을 적용할 파일 확장자.
- `Default.$.ContentType` — 확장자에 연결할 MIME/content type 문자열.
- `Override` — part 경로별 content type override 목록.
- `Override.$.PartName` — override 할 ZIP 내부 part 절대 경로.
- `Override.$.ContentType` — 해당 part 의 content type 문자열.

### ExcelXmlRelationshipData / ExcelRelationshipData

```typescript
interface ExcelXmlRelationshipData { Relationships: { $: { xmlns: string }; Relationship?: ExcelRelationshipData[] } }
interface ExcelRelationshipData { $: { Id: string; Target: string; Type: string } }
```

- `Relationships` — `.rels` 파일 루트.
- `Relationships.$.xmlns` — relationship XML namespace.
- `Relationship` — 관계 항목 배열. 없으면 관계가 없는 rels 파일이다.
- `Id` — 관계 ID 문자열. workbook/worksheet/drawing 에서 `r:id` 로 참조된다.
- `Target` — 관계 대상 part 경로.
- `Type` — 관계 타입 URI.

## workbook / worksheet XML

### ExcelXmlWorkbookData

```typescript
interface ExcelXmlWorkbookData {
  workbook: { $: { xmlns: string; "xmlns:r"?: string }; bookViews?: [{ workbookView: [{}] }]; sheets?: [{ sheet: { $: { name: string; sheetId: string; "r:id": string } }[] }] };
}
```

- `workbook` — workbook part 루트.
- `workbook.$.xmlns` — spreadsheet main namespace.
- `workbook.$["xmlns:r"]` — relationship namespace. 시트 `r:id` 사용 시 필요하다.
- `bookViews` — workbook view 골격. zoom/freeze 전에 보장된다.
- `sheets` — workbook 에 등록된 sheet 목록 컨테이너.
- `sheet.$.name` — 저장된 시트 이름.
- `sheet.$.sheetId` — workbook 안의 sheet ID 문자열.
- `sheet.$["r:id"]` — workbook rels 와 연결되는 관계 ID 문자열.

### ExcelXmlWorksheetData

```typescript
interface ExcelXmlWorksheetData {
  worksheet: {
    $: { xmlns: string; "xmlns:r"?: string };
    sheetPr?: [{ tabColor?: [{ $: { rgb: string } }] }];
    dimension?: [{ $: { ref: string } }];
    sheetViews?: [{ sheetView: { $: { workbookViewId: string; zoomScale?: string }; pane?: [{ $: { xSplit?: string; ySplit?: string; topLeftCell?: string; activePane?: string; state?: string } }] }[] }];
    sheetFormatPr?: [{ $: { defaultRowHeight: string } }];
    cols?: [{ col: { $: { min: string; max: string; width?: string; bestFit?: string; customWidth?: string } }[] }];
    sheetData: [{ row?: ExcelRowData[] }];
    autoFilter?: [{ $: { ref: string } }];
    mergeCells?: [{ $: { count: string }; mergeCell: { $: { ref: string } }[] }];
    conditionalFormatting?: ExcelXmlConditionalFormattingData[];
    drawing?: { $: { "r:id": string } }[];
  };
}
```

- `worksheet` — worksheet part 루트.
- `worksheet.$.xmlns` — spreadsheet main namespace.
- `worksheet.$["xmlns:r"]` — drawing 관계 참조를 쓸 때 필요한 relationship namespace.
- `sheetPr` — sheet 속성 컨테이너.
- `tabColor.$.rgb` — 시트 탭 색상 문자열.
- `dimension.$.ref` — 데이터 범위 A1 주소 문자열.
- `sheetViews` — worksheet view 설정 컨테이너.
- `sheetView.$.workbookViewId` — workbookView 참조 ID.
- `sheetView.$.zoomScale` — 확대/축소 비율 문자열.
- `pane.$.xSplit` — 고정 열 split 문자열.
- `pane.$.ySplit` — 고정 행 split 문자열.
- `pane.$.topLeftCell` — 고정 후 표시할 좌상단 셀 주소.
- `pane.$.activePane` — 활성 pane 문자열. freezeAt 에서는 topRight/bottomLeft/bottomRight 중 하나로 저장된다.
- `pane.$.state` — pane 상태 문자열. freezeAt 은 `"frozen"` 을 저장한다.
- `sheetFormatPr.$.defaultRowHeight` — 기본 행 높이 문자열.
- `cols` — 열 너비 설정 목록 컨테이너.
- `col.$.min` / `col.$.max` — 열 범위의 1 기반 시작/끝 문자열.
- `col.$.width` — 열 너비 문자열.
- `col.$.bestFit` — 자동 맞춤 플래그 문자열. setWidth 는 `"1"` 을 저장한다.
- `col.$.customWidth` — 사용자 너비 플래그 문자열. setWidth 는 `"1"` 을 저장한다.
- `sheetData` — 행/셀 데이터 컨테이너.
- `autoFilter.$.ref` — 자동 필터 범위 A1 주소.
- `mergeCells.$.count` — 병합 셀 개수 문자열.
- `mergeCell.$.ref` — 병합 범위 A1 주소.
- `conditionalFormatting` — 조건부 서식 블록 배열.
- `drawing.$["r:id"]` — worksheet rels 의 drawing 관계 ID.

### ExcelRowData / ExcelCellData

```typescript
interface ExcelRowData { $: { r: string }; c?: ExcelCellData[] }
interface ExcelCellData { $: { r: string; s?: string; t?: ExcelCellType }; v?: [string]; f?: [string]; is?: { t?: (string | { _?: string })[] }[] }
```

- `ExcelRowData.$.r` — 1 기반 행 주소 문자열.
- `ExcelRowData.c` — 해당 행의 셀 데이터 배열.
- `ExcelCellData.$.r` — 셀 A1 주소 문자열.
- `ExcelCellData.$.s` — styleId 문자열.
- `ExcelCellData.$.t` — 셀 타입. literal 별 의미는 README 의 `ExcelCellType` 참조.
- `ExcelCellData.v` — 셀 값 문자열 tuple.
- `ExcelCellData.f` — 셀 formula 문자열 tuple.
- `ExcelCellData.is` — inline string 컨테이너.
- `is.t` — inline string 텍스트. 문자열 또는 `{ _: string }` 형태를 읽는다.

### ExcelXmlConditionalFormattingData / ExcelXmlCfRuleData

```typescript
interface ExcelXmlConditionalFormattingData { $: { sqref: string }; cfRule: ExcelXmlCfRuleData[] }
interface ExcelXmlCfRuleData { $: { type: "cellIs" | "containsText" | "notContainsText" | "beginsWith" | "endsWith" | "expression"; operator?: "lessThan" | "lessThanOrEqual" | "equal" | "notEqual" | "greaterThanOrEqual" | "greaterThan" | "between" | "notBetween" | "containsText" | "notContains" | "beginsWith" | "endsWith"; priority: string; dxfId: string; text?: string }; formula: string[] }
```

- `sqref` — 조건부 서식 적용 범위 주소.
- `cfRule` — 조건부 서식 규칙 배열.
- `type` — OOXML cfRule type. `cellIs`/텍스트 매칭/수식 규칙 구분에 쓰인다.
- `operator` — 비교·텍스트 매칭 연산자. expression 규칙에는 저장되지 않는다.
- `priority` — 시트 전역 우선순위 문자열.
- `dxfId` — styles dxfs 배열의 dxf 인덱스 문자열.
- `text` — 텍스트 매칭 규칙의 원본 검색 문자열.
- `formula` — cfRule formula 문자열 배열.

## drawing / shared string XML

### ExcelXmlDrawingData

```typescript
interface ExcelXmlDrawingData { wsDr: { $: { xmlns: string; "xmlns:a"?: string; "xmlns:r"?: string }; twoCellAnchor?: { from?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[]; to?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[]; pic?: unknown[]; clientData?: unknown[] }[] } }
```

- `wsDr` — drawing part 루트.
- `wsDr.$.xmlns` — drawing spreadsheet namespace.
- `wsDr.$["xmlns:a"]` — drawing main namespace.
- `wsDr.$["xmlns:r"]` — relationship namespace.
- `twoCellAnchor` — 두 셀 anchor 기반 그림 배치 배열.
- `from` / `to` — 시작/끝 anchor 컨테이너.
- `col` / `row` — anchor 의 0 기반 열/행 문자열 배열.
- `colOff` / `rowOff` — anchor EMU 오프셋 문자열 배열.
- `pic` — 그림 메타데이터·blip·shape 속성 컨테이너.
- `clientData` — drawing clientData 컨테이너.

### ExcelXmlSharedStringData / ExcelXmlSharedStringDataSi / ExcelXmlSharedStringDataText

```typescript
interface ExcelXmlSharedStringData { sst: { $: { xmlns: string }; si?: ExcelXmlSharedStringDataSi[] } }
type ExcelXmlSharedStringDataSi = { t: ExcelXmlSharedStringDataText } | { r: { t: ExcelXmlSharedStringDataText }[] };
type ExcelXmlSharedStringDataText = [string | { $: { space?: "preserve" }; _?: string }];
```

- `sst` — sharedStrings part 루트.
- `sst.$.xmlns` — sharedStrings namespace.
- `si` — shared string item 배열.
- `si.t` — 단일 텍스트 shared string.
- `si.r` — rich text run 배열.
- `r.t` — rich text run 의 텍스트 tuple.
- `ExcelXmlSharedStringDataText[0]: string` — 속성 없는 텍스트 값.
- `ExcelXmlSharedStringDataText[0].$.space` — 공백 보존 플래그. literal `"preserve"` 만 허용된다.
- `ExcelXmlSharedStringDataText[0]._` — 속성 객체 형태의 실제 텍스트 값.

## styles XML

### ExcelXmlStyleData

```typescript
interface ExcelXmlStyleData { styleSheet: { $: { xmlns: string }; numFmts?: [{ $: { count: string }; numFmt?: { $: { numFmtId: string; formatCode: string } }[] }]; fonts: [{ $: { count: string }; font: ExcelXmlStyleDataFont[] }]; fills: [{ $: { count: string }; fill: ExcelXmlStyleDataFill[] }]; borders: [{ $: { count: string }; border: ExcelXmlStyleDataBorder[] }]; cellXfs: [{ $: { count: string }; xf: ExcelXmlStyleDataXf[] }]; dxfs?: [{ $: { count: string }; dxf: ExcelXmlStyleDataDxf[] }] } }
```

- `styleSheet` — styles part 루트.
- `styleSheet.$.xmlns` — stylesheet namespace.
- `numFmts` — 사용자 정의 숫자 형식 목록.
- `numFmts.$.count` — 사용자 정의 숫자 형식 개수 문자열.
- `numFmt.$.numFmtId` — 사용자 정의 numFmt ID 문자열.
- `numFmt.$.formatCode` — Excel formatCode 문자열.
- `fonts.$.count` — font 배열 개수 문자열.
- `fonts.font` — font XML 배열.
- `fills.$.count` — fill 배열 개수 문자열.
- `fills.fill` — fill XML 배열.
- `borders.$.count` — border 배열 개수 문자열.
- `borders.border` — border XML 배열.
- `cellXfs.$.count` — cell xf 배열 개수 문자열.
- `cellXfs.xf` — cell style xf 배열.
- `dxfs.$.count` — conditional formatting dxf 배열 개수 문자열.
- `dxfs.dxf` — conditional formatting differential style 배열.

### ExcelXmlStyleDataFont

```typescript
interface ExcelXmlStyleDataFont { sz?: [{ $: { val: string } }]; name?: [{ $: { val: string } }]; b?: [{}]; i?: [{}]; u?: [{ $?: { val?: ExcelFontUnderline } }]; strike?: [{}]; color?: [{ $: { rgb: string } }] }
```

- `sz.$.val` — 폰트 크기 문자열.
- `name.$.val` — 폰트명 문자열.
- `b` — 굵게 표시 요소. 존재하면 bold 로 파싱된다.
- `i` — 기울임 표시 요소. 존재하면 italic 으로 파싱된다.
- `u.$.val` — 밑줄 literal. 없으면 파싱 시 `"single"` 로 처리된다.
- `strike` — 취소선 요소. 존재하면 strike 로 파싱된다.
- `color.$.rgb` — 글자색 ARGB 문자열.

### ExcelXmlStyleDataDxf

```typescript
interface ExcelXmlStyleDataDxf { font?: [{ b?: [{ $: { val: "0" | "1" } }]; color?: [{ $: { rgb: string } }] }]; fill?: [{ patternFill: [{ $: { patternType?: "solid" }; bgColor?: [{ $: { rgb: string } }] }] }] }
```

- `font.b.$.val` — 조건부 서식 font weight. `"1"` 은 bold, `"0"` 은 normal 강제.
- `font.color.$.rgb` — 조건부 서식 글자색.
- `fill.patternFill.$.patternType` — 조건부 서식 fill 패턴. 생성 시 `"solid"` 를 쓴다.
- `fill.patternFill.bgColor.$.rgb` — 조건부 서식 배경색.

### ExcelXmlStyleDataXf

```typescript
interface ExcelXmlStyleDataXf { $: { numFmtId?: string; fontId?: string; fillId?: string; borderId?: string; xfId?: string; applyNumberFormat?: string; applyFont?: string; applyAlignment?: string; applyFill?: string; applyBorder?: string }; alignment?: [{ $: { horizontal?: "center" | "left" | "right"; vertical?: "center" | "top" | "bottom" } }] }
```

- `numFmtId` — 적용할 numFmt ID 문자열.
- `fontId` — 적용할 font 배열 인덱스 문자열.
- `fillId` — 적용할 fill 배열 인덱스 문자열.
- `borderId` — 적용할 border 배열 인덱스 문자열.
- `xfId` — 기반 xf ID 문자열.
- `applyNumberFormat` — 숫자 형식 적용 플래그 문자열.
- `applyFont` — font 적용 플래그 문자열.
- `applyAlignment` — alignment 적용 플래그 문자열.
- `applyFill` — fill 적용 플래그 문자열.
- `applyBorder` — border 적용 플래그 문자열.
- `alignment.$.horizontal` — 가로 정렬 literal.
- `alignment.$.vertical` — 세로 정렬 literal.

### ExcelXmlStyleDataFill / ExcelXmlStyleDataBorder

```typescript
interface ExcelXmlStyleDataFill { patternFill: [{ $: { patternType: "none" | "solid" | "gray125" }; fgColor?: [{ $: { rgb: string } }] }] }
interface ExcelXmlStyleDataBorder { top?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }]; left?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }]; right?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }]; bottom?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }] }
```

- `patternType: "none"` — 채우기 없음 literal.
- `patternType: "solid"` — 단색 채우기 literal. 배경색 스타일 생성 시 사용된다.
- `patternType: "gray125"` — 기본 fill 슬롯에 존재하는 gray125 literal.
- `fgColor.$.rgb` — 일반 셀 fill 전경색 ARGB 문자열.
- `top` / `left` / `right` / `bottom` — 각 방향 border 요소.
- `style: "thin"` — 얇은 border literal. `ExcelStyleOptions.border` 로 생성되는 값이다.
- `style: "medium"` — 중간 두께 border literal. 타입이 허용하는 XML 입력 값이다.
- `color.$.rgb` — border 색상 ARGB 문자열.