# Types

## Value Types

### `ExcelValueType`

셀에 저장할 수 있는 값의 타입이다.

```typescript
export type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

### `ExcelNumberFormat`

숫자 형식 이름이다. `ExcelUtils`의 변환 메서드와 `ExcelStyleOptions.numberFormat`에서 사용한다.

```typescript
export type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

### `ExcelCellType`

Excel 셀 타입이다. XML의 `t` 속성에 대응한다.

```typescript
export type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

| Value | Description |
|-------|-------------|
| `"s"` | 공유 문자열 (SharedString) |
| `"b"` | boolean |
| `"str"` | 수식 결과 문자열 |
| `"n"` | 숫자 |
| `"inlineStr"` | 인라인 문자열 (서식 있는 텍스트) |
| `"e"` | 에러 |

## Address Types

### `ExcelAddressPoint`

셀 좌표를 나타내는 인터페이스이다. 모든 좌표는 0 기반이다.

```typescript
export interface ExcelAddressPoint {
  r: number;
  c: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `r` | `number` | 행 인덱스 (0 기반) |
| `c` | `number` | 열 인덱스 (0 기반) |

### `ExcelAddressRangePoint`

셀 범위 좌표를 나타내는 인터페이스이다.

```typescript
export interface ExcelAddressRangePoint {
  s: ExcelAddressPoint;
  e: ExcelAddressPoint;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `s` | `ExcelAddressPoint` | 시작 좌표 |
| `e` | `ExcelAddressPoint` | 끝 좌표 |

## Style Types

### `ExcelStyleOptions`

셀 스타일 옵션 인터페이스이다.

```typescript
export interface ExcelStyleOptions {
  background?: string;
  border?: ExcelBorderPosition[];
  horizontalAlign?: ExcelHorizontalAlign;
  verticalAlign?: ExcelVerticalAlign;
  numberFormat?: ExcelNumberFormat;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `background` | `string \| undefined` | 배경색 (ARGB 형식, 8자리 16진수. 예: `"00FF0000"` = 빨강. alpha는 반전 값) |
| `border` | `ExcelBorderPosition[] \| undefined` | 테두리 위치 배열 |
| `horizontalAlign` | `ExcelHorizontalAlign \| undefined` | 가로 정렬 |
| `verticalAlign` | `ExcelVerticalAlign \| undefined` | 세로 정렬 |
| `numberFormat` | `ExcelNumberFormat \| undefined` | 숫자 형식 |

### `ExcelBorderPosition`

테두리 위치를 나타내는 타입이다.

```typescript
export type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
```

### `ExcelHorizontalAlign`

가로 정렬을 나타내는 타입이다.

```typescript
export type ExcelHorizontalAlign = "center" | "left" | "right";
```

### `ExcelVerticalAlign`

세로 정렬을 나타내는 타입이다.

```typescript
export type ExcelVerticalAlign = "center" | "top" | "bottom";
```

## Excel XML Interface

### `ExcelXml`

XML 처리 클래스가 구현하는 인터페이스이다. 내부 구현에 사용되며, `xml/` 디렉터리의 클래스들이 이를 구현한다.

```typescript
export interface ExcelXml {
  readonly data: unknown;
  cleanup(): void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | `unknown` | XML 파싱된 데이터 |
| `cleanup()` | `() => void` | `ZipCache.toBytes()` 직전에 호출되어 직렬화 전 데이터를 정리한다 |

## XML Data Types

아래 인터페이스들은 xlsx 내부 XML 파일의 데이터 구조를 타입으로 표현한 것이다. 주로 내부 구현에 사용된다.

### `ExcelXmlContentTypeData`

`[Content_Types].xml` 데이터 구조이다.

```typescript
export interface ExcelXmlContentTypeData {
  Types: {
    $: { xmlns: string };
    Default: { $: { Extension: string; ContentType: string } }[];
    Override: { $: { PartName: string; ContentType: string } }[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `Types.$` | `{ xmlns: string }` | 네임스페이스 |
| `Types.Default` | `Array` | 확장자별 기본 콘텐트 타입 |
| `Types.Default.$.Extension` | `string` | 파일 확장자 |
| `Types.Default.$.ContentType` | `string` | MIME 타입 |
| `Types.Override` | `Array` | 파일별 오버라이드 콘텐트 타입 |
| `Types.Override.$.PartName` | `string` | 파일 경로 |
| `Types.Override.$.ContentType` | `string` | MIME 타입 |

### `ExcelXmlRelationshipData`

`*.rels` 파일 데이터 구조이다.

```typescript
export interface ExcelXmlRelationshipData {
  Relationships: {
    $: { xmlns: string };
    Relationship?: ExcelRelationshipData[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `Relationships.$` | `{ xmlns: string }` | 네임스페이스 |
| `Relationships.Relationship` | `ExcelRelationshipData[] \| undefined` | 관계 항목 배열 |

### `ExcelRelationshipData`

개별 Relationship 엔트리 데이터이다.

```typescript
export interface ExcelRelationshipData {
  $: {
    Id: string;
    Target: string;
    Type: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$.Id` | `string` | 관계 ID (예: `"rId1"`) |
| `$.Target` | `string` | 대상 파일 경로 |
| `$.Type` | `string` | 관계 타입 URI |

### `ExcelXmlWorkbookData`

`workbook.xml` 데이터 구조이다.

```typescript
export interface ExcelXmlWorkbookData {
  workbook: {
    $: { "xmlns": string; "xmlns:r"?: string };
    bookViews?: [{ workbookView: [{}] }];
    sheets?: [{ sheet: { $: { "name": string; "sheetId": string; "r:id": string } }[] }];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `workbook.$` | `object` | 네임스페이스 |
| `workbook.bookViews` | `Array \| undefined` | 워크북 뷰 설정 |
| `workbook.sheets` | `Array \| undefined` | 시트 목록 |
| `workbook.sheets[0].sheet[].$.name` | `string` | 시트 이름 |
| `workbook.sheets[0].sheet[].$.sheetId` | `string` | 시트 ID |
| `workbook.sheets[0].sheet[].$["r:id"]` | `string` | 관계 ID |

### `ExcelXmlWorksheetData`

`worksheet*.xml` 데이터 구조이다.

```typescript
export interface ExcelXmlWorksheetData {
  worksheet: {
    $: { "xmlns": string; "xmlns:r"?: string };
    dimension?: [{ $: { ref: string } }];
    sheetViews?: [{ sheetView: { $: { workbookViewId: string; zoomScale?: string }; pane?: [...] }[] }];
    sheetFormatPr?: [{ $: { defaultRowHeight: string } }];
    cols?: [{ col: { $: { min: string; max: string; width?: string; bestFit?: string; customWidth?: string } }[] }];
    sheetData: [{ row?: ExcelRowData[] }];
    mergeCells?: [{ $: { count: string }; mergeCell: { $: { ref: string } }[] }];
    drawing?: { $: { "r:id": string } }[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `worksheet.dimension` | `Array \| undefined` | 데이터 범위 (예: `"A1:C10"`) |
| `worksheet.sheetViews` | `Array \| undefined` | 시트 뷰 설정 (줌, 틀 고정) |
| `worksheet.sheetFormatPr` | `Array \| undefined` | 기본 행 높이 |
| `worksheet.cols` | `Array \| undefined` | 열 설정 (너비 등) |
| `worksheet.sheetData` | `Array` | 행 데이터 |
| `worksheet.mergeCells` | `Array \| undefined` | 병합 셀 정보 |
| `worksheet.drawing` | `Array \| undefined` | 드로잉 관계 참조 |

### `ExcelRowData`

행 XML 데이터이다.

```typescript
export interface ExcelRowData {
  $: { r: string };
  c?: ExcelCellData[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$.r` | `string` | 행 주소 (1 기반, 예: `"1"`, `"10"`) |
| `c` | `ExcelCellData[] \| undefined` | 셀 데이터 배열 |

### `ExcelCellData`

셀 XML 데이터이다.

```typescript
export interface ExcelCellData {
  $: { r: string; s?: string; t?: ExcelCellType };
  v?: [string];
  f?: [string];
  is?: { t?: (string | { _?: string })[] }[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$.r` | `string` | 셀 주소 (예: `"A1"`, `"B3"`) |
| `$.s` | `string \| undefined` | 스타일 ID |
| `$.t` | `ExcelCellType \| undefined` | 셀 타입 |
| `v` | `[string] \| undefined` | 셀 값 |
| `f` | `[string] \| undefined` | 수식 |
| `is` | `Array \| undefined` | 인라인 문자열 데이터 |

### `ExcelXmlDrawingData`

`drawing*.xml` 데이터 구조이다. 이미지 앵커 정보를 포함한다.

```typescript
export interface ExcelXmlDrawingData {
  wsDr: {
    $: { "xmlns": string; "xmlns:a"?: string; "xmlns:r"?: string };
    twoCellAnchor?: {
      from?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      to?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      pic?: { nvPicPr?: {...}[]; blipFill?: {...}[]; spPr?: {...}[] }[];
      clientData?: unknown[];
    }[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `wsDr.$` | `object` | 네임스페이스 |
| `wsDr.twoCellAnchor` | `Array \| undefined` | 두 셀 사이에 앵커된 이미지 목록 |
| `twoCellAnchor.from` | `Array \| undefined` | 시작 위치 (행/열/오프셋) |
| `twoCellAnchor.to` | `Array \| undefined` | 끝 위치 (행/열/오프셋) |
| `twoCellAnchor.pic` | `Array \| undefined` | 이미지 정보 (blip 관계 ID 포함) |

### `ExcelXmlSharedStringData`

`sharedStrings.xml` 데이터 구조이다.

```typescript
export interface ExcelXmlSharedStringData {
  sst: {
    $: { xmlns: string };
    si?: ExcelXmlSharedStringDataSi[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sst.$` | `{ xmlns: string }` | 네임스페이스 |
| `sst.si` | `ExcelXmlSharedStringDataSi[] \| undefined` | 공유 문자열 항목 배열 |

### `ExcelXmlSharedStringDataSi`

SharedString 개별 항목이다. discriminated union으로, `t` 키가 있으면 단순 텍스트, `r` 키가 있으면 서식 있는 텍스트(rich text)이다.

```typescript
export type ExcelXmlSharedStringDataSi =
  | { t: ExcelXmlSharedStringDataText }
  | { r: { t: ExcelXmlSharedStringDataText }[] };
```

| Variant | Discriminant | Description |
|---------|-------------|-------------|
| `{ t: ... }` | `t` 키 존재 | 단순 텍스트 |
| `{ r: ... }` | `r` 키 존재 | 서식 있는 텍스트 (run 배열) |

### `ExcelXmlSharedStringDataText`

SharedString 텍스트 데이터이다. 단순 문자열 또는 공백 보존 속성이 있는 객체이다.

```typescript
export type ExcelXmlSharedStringDataText = [string | { $: { space?: "preserve" }; _?: string }];
```

### `ExcelXmlStyleData`

`styles.xml` 데이터 구조이다.

```typescript
export interface ExcelXmlStyleData {
  styleSheet: {
    $: { xmlns: string };
    numFmts?: [{ $: { count: string }; numFmt?: { $: { numFmtId: string; formatCode: string } }[] }];
    fonts: [{ $: { count: string }; font: {}[] }];
    fills: [{ $: { count: string }; fill: ExcelXmlStyleDataFill[] }];
    borders: [{ $: { count: string }; border: ExcelXmlStyleDataBorder[] }];
    cellXfs: [{ $: { count: string }; xf: ExcelXmlStyleDataXf[] }];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `styleSheet.numFmts` | `Array \| undefined` | 커스텀 숫자 형식 목록 |
| `styleSheet.fonts` | `Array` | 폰트 목록 |
| `styleSheet.fills` | `Array` | 채우기 스타일 목록 |
| `styleSheet.borders` | `Array` | 테두리 스타일 목록 |
| `styleSheet.cellXfs` | `Array` | 셀 서식(xf) 목록 |

### `ExcelXmlStyleDataXf`

셀 서식(xf) 데이터이다.

```typescript
export interface ExcelXmlStyleDataXf {
  $: {
    numFmtId?: string;
    fontId?: string;
    fillId?: string;
    borderId?: string;
    xfId?: string;
    applyNumberFormat?: string;
    applyFont?: string;
    applyAlignment?: string;
    applyFill?: string;
    applyBorder?: string;
  };
  alignment?: [{ $: { horizontal?: "center" | "left" | "right"; vertical?: "center" | "top" | "bottom" } }];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$.numFmtId` | `string \| undefined` | 숫자 형식 ID |
| `$.fontId` | `string \| undefined` | 폰트 ID |
| `$.fillId` | `string \| undefined` | 채우기 ID |
| `$.borderId` | `string \| undefined` | 테두리 ID |
| `$.xfId` | `string \| undefined` | 부모 xf ID |
| `$.applyNumberFormat` | `string \| undefined` | 숫자 형식 적용 여부 |
| `$.applyFont` | `string \| undefined` | 폰트 적용 여부 |
| `$.applyAlignment` | `string \| undefined` | 정렬 적용 여부 |
| `$.applyFill` | `string \| undefined` | 채우기 적용 여부 |
| `$.applyBorder` | `string \| undefined` | 테두리 적용 여부 |
| `alignment` | `Array \| undefined` | 정렬 설정 (horizontal, vertical) |

### `ExcelXmlStyleDataFill`

채우기 스타일 데이터이다.

```typescript
export interface ExcelXmlStyleDataFill {
  patternFill: [{ $: { patternType: "none" | "solid" | "gray125" }; fgColor?: [{ $: { rgb: string } }] }];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `patternFill[0].$.patternType` | `"none" \| "solid" \| "gray125"` | 패턴 유형 |
| `patternFill[0].fgColor` | `[{ $: { rgb: string } }] \| undefined` | 전경색 (ARGB) |

### `ExcelXmlStyleDataBorder`

테두리 스타일 데이터이다. 각 방향은 선택적이며, `style`과 `color`를 가진다.

```typescript
export interface ExcelXmlStyleDataBorder {
  top?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  left?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  right?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
  bottom?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `top` | `Array \| undefined` | 상단 테두리 (`"thin"` 또는 `"medium"`) |
| `left` | `Array \| undefined` | 좌측 테두리 |
| `right` | `Array \| undefined` | 우측 테두리 |
| `bottom` | `Array \| undefined` | 하단 테두리 |
