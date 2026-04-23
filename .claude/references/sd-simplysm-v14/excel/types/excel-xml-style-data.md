# ExcelXmlStyleData

`styles.xml` 데이터 구조이다. 내부 구현에 사용된다.

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

## Related Types

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
