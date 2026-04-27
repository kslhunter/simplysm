# `ExcelCell`

> **읽어야 하는 상황**: 개별 셀의 값·수식·스타일·병합을 조작할 때. 대량 데이터를 한번에 쓸 때는 [`ExcelWorksheet`](./excel-worksheet.md)의 `setDataMatrix()`/`setRecords()` 참조.

Excel 셀을 나타내는 클래스. 값 읽기/쓰기, 수식, 스타일, 셀 병합 기능을 제공한다.

## When to use

- ✅ 개별 셀의 값, 수식, 스타일, 병합을 조작할 때
- ✅ `ws.cell(r, c)`로 얻은 인스턴스를 통해 사용
- ❌ 대량 데이터를 한번에 쓸 때는 [`ExcelWorksheet.setDataMatrix()`](./excel-worksheet.md) 또는 [`ExcelWorksheet.setRecords()`](./excel-worksheet.md) -- 내부에서 동기 최적화를 수행한다

모든 메서드가 `async`인 이유는 셀 타입에 따라 필요한 XML만 선택적으로 로드하는 Lazy Loading 아키텍처 때문이다. 문자열 셀은 `sharedStrings.xml`을 로드하고, 숫자 셀은 로드하지 않는다.

```typescript
export class ExcelCell {
  readonly addr: ExcelAddressPoint;

  constructor(zipCache: ZipCache, targetFileName: string, r: number, c: number);

  // Value
  async setValue(val: ExcelValueType): Promise<void>;
  async getValue(): Promise<ExcelValueType>;
  async setFormula(val: string | undefined): Promise<void>;
  async getFormula(): Promise<string | undefined>;

  // Merge
  async merge(r: number, c: number): Promise<void>;

  // Style
  async getStyleId(): Promise<string | undefined>;
  async setStyleId(styleId: string | undefined): Promise<void>;
  async setStyle(opts: ExcelStyleOptions): Promise<void>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `addr` | property | `ExcelAddressPoint` | 셀 주소 (0 기반 행/열 인덱스, read-only) |
| `setValue` | method | `(val: ExcelValueType) => Promise<void>` | 셀 값 설정. `undefined` 전달 시 셀 삭제. `DateOnly`/`DateTime`/`Time`은 Excel 날짜 숫자로 변환하고 numFmt 설정 |
| `getValue` | method | `() => Promise<ExcelValueType>` | 셀 값 반환. 비어있는 셀은 `undefined` 반환. 셀 타입과 스타일에 따라 적절한 JS 타입으로 변환 |
| `setFormula` | method | `(val: string \| undefined) => Promise<void>` | 셀 수식 설정. `undefined` 전달 시 수식 제거 |
| `getFormula` | method | `() => Promise<string \| undefined>` | 셀 수식 반환. 수식 없으면 `undefined` 반환 |
| `merge` | method | `(r: number, c: number) => Promise<void>` | 현재 셀에서 지정된 끝 좌표까지 셀 병합 |
| `getStyleId` | method | `() => Promise<string \| undefined>` | 셀의 스타일 ID 반환. 스타일 없으면 `undefined` 반환 |
| `setStyleId` | method | `(styleId: string \| undefined) => Promise<void>` | 셀의 스타일 ID 직접 설정 |
| `setStyle` | method | `(opts: ExcelStyleOptions) => Promise<void>` | 셀 스타일 설정. 기존 스타일이 있으면 클론 후 병합 |

## Usage

```typescript
// 값 설정/읽기
await ws.cell(0, 0).setValue("텍스트");
await ws.cell(0, 1).setValue(42);
await ws.cell(0, 2).setValue(new DateOnly(2024, 6, 15));
await ws.cell(0, 3).setValue(true);
await ws.cell(0, 4).setValue(undefined); // 셀 삭제

const val = await ws.cell(0, 0).getValue(); // "텍스트"

// 수식
await ws.cell(1, 0).setFormula("SUM(A1:A10)");
const formula = await ws.cell(1, 0).getFormula(); // "SUM(A1:A10)"

// 셀 병합 (A1:C3 병합)
await ws.cell(0, 0).merge(2, 2);

// 스타일
await ws.cell(0, 0).setStyle({
  background: "00FFFF00",                    // 노란색 배경
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  verticalAlign: "center",
  numberFormat: "number",
});

// 커스텀 formatCode
await ws.cell(0, 0).setStyle({ numberFormatCode: "0.000000" });
```
