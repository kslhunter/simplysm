# @simplysm/excel — OOXML XML-shape 타입

ZIP 내 OOXML/BIFF XML 파트의 파싱 결과 구조 타입. 일반 workbook API 사용보다 패키지 내부 XML 모델·디버그에서 `ExcelXml.data` 트리 shape 를 해석할 때 사용. 모든 필드는 OOXML 속성/엘리먼트를 `xml2js` 스타일(`$` = 속성, `_` = 텍스트, 배열 래핑)로 표현.

## 패키지 메타데이터 XML

### ExcelXmlContentTypeData

```typescript
interface ExcelXmlContentTypeData {
  Types: {
    $: { xmlns: string };
    Default: { $: { Extension: string; ContentType: string } }[];
    Override: { $: { PartName: string; ContentType: string } }[];
  };
}
```

- `Types` — `[Content_Types].xml` 루트. `$.xmlns` 는 content types XML namespace.
- `Default` — 확장자별 기본 content type 목록. `Extension` 적용 확장자, `ContentType` 연결할 MIME 문자열.
- `Override` — part 경로별 content type override. `PartName` ZIP 내부 절대 경로, `ContentType` 해당 part content type.

### ExcelXmlRelationshipData / ExcelRelationshipData

```typescript
interface ExcelXmlRelationshipData {
  Relationships: { $: { xmlns: string }; Relationship?: ExcelRelationshipData[] };
}
interface ExcelRelationshipData {
  $: { Id: string; Target: string; Type: string };
}
```

- `Relationships` — `.rels` 파일 루트. `$.xmlns` relationship namespace, `Relationship` 관계 항목 배열(없으면 관계 없는 rels).
- `Id` — 관계 ID. workbook/worksheet/drawing 에서 `r:id` 로 참조된다.
- `Target` — 관계 대상 part 경로.
- `Type` — 관계 타입 URI.

## workbook / worksheet XML

### ExcelXmlWorkbookData

```typescript
interface ExcelXmlWorkbookData {
  workbook: {
    $: { "xmlns": string; "xmlns:r"?: string };
    bookViews?: [{ workbookView: [{}] }];
    sheets?: [{ sheet: { $: { "name": string; "sheetId": string; "r:id": string } }[] }];
  };
}
```

- `workbook.$.xmlns` / `$["xmlns:r"]` — spreadsheet main / relationship namespace(시트 `r:id` 사용 시 필요).
- `bookViews` — workbook view 골격(zoom/freeze 전 보장).
- `sheets.sheet.$.name` / `sheetId` / `r:id` — 시트 이름 / workbook 내 sheet ID / workbook rels 연결 관계 ID.

### ExcelXmlWorksheetData

```typescript
interface ExcelXmlWorksheetData {
  worksheet: {
    $: { "xmlns": string; "xmlns:r"?: string };
    sheetPr?: [{ tabColor?: [{ $: { rgb: string } }] }];
    dimension?: [{ $: { ref: string } }];
    sheetViews?: [
      {
        sheetView: {
          $: { workbookViewId: string; zoomScale?: string };
          pane?: [
            {
              $: {
                xSplit?: string;
                ySplit?: string;
                topLeftCell?: string;
                activePane?: string;
                state?: string;
              };
            },
          ];
        }[];
      },
    ];
    sheetFormatPr?: [{ $: { defaultRowHeight: string } }];
    cols?: [
      {
        col: {
          $: { min: string; max: string; width?: string; bestFit?: string; customWidth?: string };
        }[];
      },
    ];
    sheetData: [{ row?: ExcelRowData[] }];
    autoFilter?: [{ $: { ref: string } }];
    mergeCells?: [{ $: { count: string }; mergeCell: { $: { ref: string } }[] }];
    conditionalFormatting?: ExcelXmlConditionalFormattingData[];
    drawing?: { $: { "r:id": string } }[];
  };
}
```

- `sheetPr.tabColor.$.rgb` — 시트 탭 색상.
- `dimension.$.ref` — 데이터 범위 A1 주소.
- `sheetViews.sheetView.$.zoomScale` — 확대/축소 비율; `pane.$.{xSplit,ySplit,topLeftCell,activePane,state}` — 틀 고정 pane 정보(`state="frozen"`).
- `sheetFormatPr.$.defaultRowHeight` — 기본 행 높이.
- `cols.col.$.{min,max,width,bestFit,customWidth}` — 1 기반 시작/끝 열, 너비, 자동 맞춤/사용자 너비 플래그.
- `sheetData` — 행/셀 데이터 컨테이너.
- `autoFilter.$.ref` — 자동 필터 범위 A1 주소.
- `mergeCells` — 병합 개수(`count`)와 병합 범위(`mergeCell.$.ref`) 목록.
- `conditionalFormatting` — 조건부 서식 블록 배열.
- `drawing.$["r:id"]` — worksheet rels 의 drawing 관계 ID.

### ExcelRowData / ExcelCellData

```typescript
interface ExcelRowData {
  $: { r: string };
  c?: ExcelCellData[];
}
interface ExcelCellData {
  $: { r: string; s?: string; t?: ExcelCellType };
  v?: [string];
  f?: [string];
  is?: { t?: (string | { _?: string })[] }[];
}
```

- `ExcelRowData.$.r` — 1 기반 행 주소; `c` — 해당 행 셀 배열.
- `ExcelCellData.$.r` — 셀 A1 주소; `$.s` — styleId; `$.t` — 셀 타입(`ExcelCellType`).
- `v` — 셀 값 tuple; `f` — formula tuple; `is` — inline string 컨테이너(`is.t` 는 문자열 또는 `{ _: string }`).

### ExcelXmlConditionalFormattingData / ExcelXmlCfRuleData

```typescript
interface ExcelXmlConditionalFormattingData {
  $: { sqref: string };
  cfRule: ExcelXmlCfRuleData[];
}
interface ExcelXmlCfRuleData {
  $: {
    type: "cellIs" | "containsText" | "notContainsText" | "beginsWith" | "endsWith" | "expression";
    operator?:
      | "lessThan"
      | "lessThanOrEqual"
      | "equal"
      | "notEqual"
      | "greaterThanOrEqual"
      | "greaterThan"
      | "between"
      | "notBetween"
      | "containsText"
      | "notContains"
      | "beginsWith"
      | "endsWith";
    priority: string;
    dxfId: string;
    text?: string;
  };
  formula: string[];
}
```

- `sqref` — 조건부 서식 적용 범위.
- `type` — OOXML cfRule type(비교/텍스트/수식 구분).
- `operator` — 비교·텍스트 매칭 연산자(expression 규칙에는 없음).
- `priority` — 시트 전역 우선순위; `dxfId` — styles dxfs 인덱스; `text` — 텍스트 매칭 원본 검색 문자열.
- `formula` — cfRule formula 문자열 배열.

## drawing / shared string XML

### ExcelXmlDrawingData

```typescript
interface ExcelXmlDrawingData {
  wsDr: {
    $: { xmlns: string; "xmlns:a"?: string; "xmlns:r"?: string };
    twoCellAnchor?: {
      from?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      to?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      pic?: { nvPicPr?: ...; blipFill?: { "a:blip"?: [{ $: { "r:embed": string } }]; ... }[]; spPr?: { "a:xfrm"?: ...; "a:prstGeom"?: ... }[] }[];
      clientData?: unknown[];
    }[];
  };
}
```

- `wsDr.$.{xmlns,xmlns:a,xmlns:r}` — drawing spreadsheet / drawing main / relationship namespace.
- `twoCellAnchor` — 두 셀 anchor 기반 그림 배치 배열.
- `from`/`to` — 시작/끝 anchor. `col`/`row` 0 기반 열/행 문자열, `colOff`/`rowOff` EMU 오프셋.
- `pic` — 그림 메타(`nvPicPr`), blip 채움(`blipFill["a:blip"].$["r:embed"]` = 이미지 관계 ID), shape 속성(`spPr` 의 `a:xfrm` 위치·크기, `a:prstGeom` 도형).
- `clientData` — drawing clientData 컨테이너.

### ExcelXmlSharedStringData / ExcelXmlSharedStringDataSi / ExcelXmlSharedStringDataText

```typescript
interface ExcelXmlSharedStringData {
  sst: { $: { xmlns: string }; si?: ExcelXmlSharedStringDataSi[] };
}
type ExcelXmlSharedStringDataSi =
  { t: ExcelXmlSharedStringDataText } | { r: { t: ExcelXmlSharedStringDataText }[] };
type ExcelXmlSharedStringDataText = [string | { $: { space?: "preserve" }; _?: string }];
```

- `sst` — sharedStrings part 루트(`$.xmlns` namespace), `si` shared string item 배열.
- `si.t` — 단일 텍스트 shared string; `si.r` — rich text run 배열(`r.t` 각 run 텍스트).
- `ExcelXmlSharedStringDataText` — `string`(속성 없는 텍스트) 또는 `{ $: { space?: "preserve" }; _?: string }`(공백 보존 플래그 + 텍스트).

## styles XML

### ExcelXmlStyleData

```typescript
interface ExcelXmlStyleData {
  styleSheet: {
    $: { xmlns: string };
    numFmts?: [
      { $: { count: string }; numFmt?: { $: { numFmtId: string; formatCode: string } }[] },
    ];
    fonts: [{ $: { count: string }; font: ExcelXmlStyleDataFont[] }];
    fills: [{ $: { count: string }; fill: ExcelXmlStyleDataFill[] }];
    borders: [{ $: { count: string }; border: ExcelXmlStyleDataBorder[] }];
    cellXfs: [{ $: { count: string }; xf: ExcelXmlStyleDataXf[] }];
    dxfs?: [{ $: { count: string }; dxf: ExcelXmlStyleDataDxf[] }];
  };
}
```

- `numFmts` — 사용자 정의 숫자 형식(`numFmt.$.numFmtId`/`formatCode`).
- `fonts`/`fills`/`borders`/`cellXfs` — 각 자원 배열(`$.count` 개수). `cellXfs.xf` 가 셀 스타일 xf 목록.
- `dxfs` — 조건부 서식 differential style(dxf) 배열.

### ExcelXmlStyleDataFont

```typescript
interface ExcelXmlStyleDataFont {
  sz?: [{ $: { val: string } }];
  name?: [{ $: { val: string } }];
  b?: [{}];
  i?: [{}];
  u?: [{ $?: { val?: ExcelFontUnderline } }];
  strike?: [{}];
  color?: [{ $: { rgb: string } }];
}
```

- `sz.$.val` 크기, `name.$.val` 폰트명, `color.$.rgb` 글자색.
- `b`/`i`/`strike` — 존재하면 bold/italic/취소선으로 파싱.
- `u.$.val` — 밑줄 literal(`ExcelFontUnderline`). val 없으면 `"single"` 로 처리.

### ExcelXmlStyleDataDxf

```typescript
interface ExcelXmlStyleDataDxf {
  font?: [{ b?: [{ $: { val: "0" | "1" } }]; color?: [{ $: { rgb: string } }] }];
  fill?: [{ patternFill: [{ $: { patternType?: "solid" }; bgColor?: [{ $: { rgb: string } }] }] }];
}
```

- `font.b.$.val` — 조건부 서식 font weight(`"1"` bold, `"0"` normal 강제); `font.color.$.rgb` 글자색.
- `fill.patternFill.$.patternType` — `"solid"`; `bgColor.$.rgb` 배경색.

### ExcelXmlStyleDataXf

```typescript
interface ExcelXmlStyleDataXf {
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
  alignment?: [
    { $: { horizontal?: "center" | "left" | "right"; vertical?: "center" | "top" | "bottom" } },
  ];
}
```

- `$.{numFmtId,fontId,fillId,borderId}` — 적용할 자원 인덱스; `xfId` 기반 xf.
- `$.apply*` — 각 항목 적용 플래그 문자열.
- `alignment.$.horizontal`/`vertical` — 가로/세로 정렬 literal.

### ExcelXmlStyleDataFill / ExcelXmlStyleDataBorder

```typescript
interface ExcelXmlStyleDataFill { patternFill: [{ $: { patternType: "none" | "solid" | "gray125" }; fgColor?: [{ $: { rgb: string } }] }] }
interface ExcelXmlStyleDataBorder { top?: [{ $: { style: "thin" | "medium" }; color?: [{ $: { rgb: string } }] }]; left?: ...; right?: ...; bottom?: ... }
```

- `patternFill.$.patternType` — `"none"` 채우기 없음 / `"solid"` 단색(배경색 셀) / `"gray125"` 기본 fill 슬롯; `fgColor.$.rgb` 일반 셀 전경색.
- `top`/`left`/`right`/`bottom` — 각 방향 border. `style` `"thin"`/`"medium"`, `color.$.rgb` 테두리 색.
