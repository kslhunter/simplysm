# TASK-001-폰트스타일 Design

## 메타
- designed: 2026-05-09

## Current State

- **Story 1 (workbook default)**: `packages/excel/src/xml/excel-xml-style.ts:39-44` 에서 새 워크북은 `fonts: [{ $: { count: "1" }, font: [{}] }]` (빈 `<font/>` 1개) 으로 초기화한다. `cellXfs[0]` 은 `xf: [{ $: { numFmtId: "0" } }]` 라 fontId 를 명시하지 않아 자연스럽게 fonts[0] 을 가리킨다. 기존 파일 read 시에는 `data` 인자로 받은 styleSheet 을 그대로 보존한다. 워크북 default 폰트를 외부에서 설정할 API 는 없음.
- **Story 2 (cell override)**: `ExcelStyleOptions` (`packages/excel/src/types.ts:444-460`) 는 background/border/horizontalAlign/verticalAlign/numberFormat/numberFormatCode 만 지원. `ExcelCell.setStyle` (`packages/excel/src/excel-cell.ts:237-266`) 도 폰트 분기 없음. 내부 `ExcelStyle` (`excel-xml-style.ts:16-23`) 인터페이스도 폰트 필드 없음.
- **Story 3 (공통)**: `xl/styles.xml` 의 `fonts[]` 배열은 워크북 전체 공유 자원이고, `cellXfs[X].fontId` 가 fonts 배열 인덱스를 가리키는 구조. 현재 빈 `font: [{}]` 1개만 있어 fonts 누적 로직 자체가 부재. fills/borders 는 이미 `_getSameOrCreateFill` / `_getSameOrCreateBorder` 패턴으로 dedup 누적 구현되어 있어 동일 패턴을 fonts 에 적용하면 됨.

## Solution

- **Story 1**: `ExcelWorkbook.setDefaultStyle(opts: ExcelStyleOptions): Promise<void>` 진입점 추가. 내부적으로 `ExcelXmlStyle.setDefaultStyle(style: ExcelStyle)` 호출 — `cellXfs[0].xf[0]` (OOXML default cell style 자리) 을 입력 옵션으로 새로 빌드해 덮어쓴다. fonts/fills/borders/numFmts 자원은 기존 `_getSameOrCreate*` 패턴으로 누적/dedup 후 인덱스를 cellXfs[0].xf 의 fontId/fillId/borderId/numFmtId 에 박는다. 미호출 시 현행대로 빈 `cellXfs[0] = { numFmtId: "0" }` 보존. font 외 필드(background/border/horizontalAlign/verticalAlign/numberFormat/numberFormatCode) 도 동일 빌더로 default 적용된다.
- **Story 2**: `ExcelStyleOptions` 에 `font?: ExcelFont` 필드 추가. `ExcelFont` 는 7속성 partial 타입. `ExcelCell.setStyle` 에서 `opts.font` 가 있으면 내부 `ExcelStyle.font` 로 전달. `ExcelXmlStyle.add` / `addWithClone` 에서 `style.font` 가 있으면 `_getSameOrCreateFont(font)` 로 fontId 를 얻어 `xf.$.fontId / applyFont = "1"` 박는다. fonts 누적 + dedup 은 기존 fills/borders 의 `_getSameOrCreate*` 패턴과 동형.
- **Story 3**: `ExcelFont` 타입을 default / override 양쪽이 공유. emit 시점에 OOXML `<font>` 자식 엘리먼트로 직접 매핑(아래 Detailed Design). 7속성 중 미지정은 엘리먼트 자체 emit X (Excel 기본값으로 위임).

## Detailed Design

### 신규 타입 (`packages/excel/src/types.ts`)

```typescript
/**
 * 폰트 속성. default 와 cell override 양쪽이 공유한다.
 * 미지정 속성은 OOXML <font> 자식 엘리먼트로 emit 되지 않으며, Excel 자체 기본값으로 표시된다.
 */
export interface ExcelFont {
  /** 폰트 크기 (pt) */
  size?: number;
  /** 폰트명 (예: "맑은 고딕", "Calibri"). Excel 에 없는 폰트도 그대로 emit. */
  family?: string;
  /** 굵게 */
  bold?: boolean;
  /** 기울임 */
  italic?: boolean;
  /** 밑줄 — `<u val="..."/>` 의 val 에 그대로 매핑. 미지정 = 밑줄 없음. */
  underline?: ExcelFontUnderline;
  /** 글자색 (ARGB 8자리, 예: "00FF0000"). 형식 검증은 background 와 동일 (`/^[0-9A-F]{8}$/i`). */
  color?: string;
  /** 취소선 */
  strike?: boolean;
}

export type ExcelFontUnderline = "single" | "double" | "singleAccounting" | "doubleAccounting";
```

`ExcelStyleOptions` 변경:
```typescript
export interface ExcelStyleOptions {
  background?: string;
  border?: ExcelBorderPosition[];
  horizontalAlign?: ExcelHorizontalAlign;
  verticalAlign?: ExcelVerticalAlign;
  numberFormat?: ExcelNumberFormat;
  numberFormatCode?: string;
  /** 폰트 override (미지정 시 워크북 default 폰트 적용) */
  font?: ExcelFont;
}
```

`ExcelXmlStyleData.fonts` 의 `font` 항목 타입을 OOXML 구조에 맞게 강화 (현재 `{}[]`):
```typescript
fonts: [
  {
    $: { count: string };
    font: ExcelXmlStyleDataFont[];
  },
];

export interface ExcelXmlStyleDataFont {
  sz?: [{ $: { val: string } }];
  name?: [{ $: { val: string } }];
  b?: [{}];                                         // <b/> 자체 존재 = true
  i?: [{}];
  u?: [{ $?: { val: ExcelFontUnderline } }];        // val 생략 = single
  strike?: [{}];
  color?: [{ $: { rgb: string } }];
}
```

OOXML 매핑 규칙:
- `bold: true` → `<b/>` (val 속성 없음). false/미지정 → emit X.
- `italic: true` → `<i/>`. 동일.
- `strike: true` → `<strike/>`. 동일.
- `underline` → `<u val="..."/>`. (val 표현은 Q1 결정에 따름.)
- `size: 11` → `<sz val="11"/>`.
- `family: "맑은 고딕"` → `<name val="맑은 고딕"/>`.
- `color: "00FF0000"` → `<color rgb="00FF0000"/>`.

### `ExcelXmlStyle` 변경 (`packages/excel/src/xml/excel-xml-style.ts`)

```typescript
export interface ExcelStyle {
  // 기존 필드 ...
  font?: ExcelFont;   // 신규
}

class ExcelXmlStyle {
  /**
   * 워크북 default cell style 설정. `cellXfs[0].xf[0]` 자리를 입력 옵션으로 새 빌드해 덮어쓴다.
   * fonts/fills/borders/numFmts 자원은 `_getSameOrCreate*` 로 누적/dedup 되고 그 인덱스가 cellXfs[0].xf 에 박힌다.
   */
  setDefaultStyle(style: ExcelStyle): void {
    const newXf: ExcelXmlStyleDataXf = { $: { numFmtId: "0" } };
    this._applyStyleToXf(newXf, style);     // add() 와 동일한 빌더 (font/fill/border/numFmt/alignment)
    this.data.styleSheet.cellXfs[0].xf[0] = newXf;
  }

  // add() / addWithClone() 의 font 분기:
  if (style.font != null) {
    this._validateFont(style.font);
    newXf.$.applyFont = "1";
    newXf.$.fontId = this._getSameOrCreateFont(this._buildFontXml(style.font));
  }

  // get() 에서 font 복원도 추가 (xf.$.fontId 가 가리키는 fonts[X] → ExcelFont).

  private _buildFontXml(font: ExcelFont): ExcelXmlStyleDataFont { /* OOXML 매핑 규칙 적용 */ }
  private _getSameOrCreateFont(item: ExcelXmlStyleDataFont): string { /* fills/borders 와 동형 */ }
  private _validateFont(font: ExcelFont): void {
    if (font.color != null && !/^[0-9A-F]{8}$/i.test(font.color)) {
      throw new Error("잘못된 폰트 색상 형식입니다. (형식: 00000000: alpha(반전)+rgb)");
    }
    // size: 양수 / 그 외는 검증 없음 (Excel 에 위임)
  }
  private _applyStyleToXf(xf: ExcelXmlStyleDataXf, style: ExcelStyle): void {
    // add() 의 numFmt/font/fill/border/alignment 빌더를 공통 함수로 추출.
    // setDefaultStyle 과 add() 가 공유.
  }
}
```

### `ExcelCell.setStyle` 변경 (`packages/excel/src/excel-cell.ts`)

`opts.font != null` 분기를 추가해 `style.font = opts.font` 로 전달. 색상 검증은 `_validateFont` 에서 처리하므로 여기서는 위임만.

### `ExcelWorkbook` 진입점

```typescript
class ExcelWorkbook {
  /**
   * 워크북 default cell style 설정. ExcelStyleOptions 의 모든 필드를 cellXfs[0] 에 default 로 적용.
   * 미호출 시 현행대로 default 를 변경하지 않는다 (read 시 원본 보존).
   */
  async setDefaultStyle(opts: ExcelStyleOptions): Promise<void> {
    const styleData = await this._getOrCreateStyleData();   // ExcelCell._getOrCreateStyleData 와 동형
    const style = this._convertOptsToStyle(opts);            // ExcelCell.setStyle 의 변환 로직과 공유 (헬퍼 추출)
    styleData.setDefaultStyle(style);
  }
}
```

`_getOrCreateStyleData` 는 현재 `ExcelCell` 에 있는 헬퍼 (`excel-cell.ts:330-349`) 와 동형. 둘 다 `ZipCache` 와 `ExcelXmlContentType` / `ExcelXmlRelationship` 만 의존하므로 `ExcelXmlStyle` 의 정적 헬퍼나 별도 유틸로 추출해 두 곳에서 재사용한다.

`opts → ExcelStyle` 변환(font/background ARGB 검증/numberFormat 분기 등) 은 `ExcelCell.setStyle` (`excel-cell.ts:237-266`) 의 본문이 거의 그대로. 동일하게 사용하기 위해 `convertExcelStyleOptions(opts: ExcelStyleOptions): ExcelStyle` 같은 순수 함수로 추출해 cell/workbook 양쪽에서 호출.

## Testing

- **Story 1 (workbook default)**:
  - 새 워크북에 `wb.setDefaultStyle({ font: { family: "맑은 고딕", size: 10 } })` 호출 후 `toBytes()` → ZIP 내 `xl/styles.xml` 의 fonts 누적·dedup 결과와 `cellXfs[0].xf[0]` 이 그 fontId 를 가리키는지 확인.
  - `wb.setDefaultStyle({ background: "00FFFF00", horizontalAlign: "center" })` 등 폰트 외 필드만 지정 시 cellXfs[0] 의 fillId/alignment 가 박히는지 확인 (스코프 일반화 검증).
  - default 미호출 시 cellXfs[0] 이 현행대로 `{ numFmtId: "0" }` 유지 (회귀).
  - 기존 워크북 read 후 default 미호출 시 원본 styleSheet 보존 확인.
- **Story 2**:
  - `cell.setStyle({ font: { bold: true } })` 후 styleSheet.fonts 길이 2(=default + bold) + cellXf.applyFont/fontId 확인.
  - 동일 폰트 조합으로 두 셀 setStyle → fonts 길이가 1 만 늘어 dedup 검증.
  - 기존 background 와 font 동시 지정 시 cellXf 가 `applyFill / applyFont` 둘 다 박는지.
  - 색상 형식 오류 (`color: "FF0000"` 6자리) → throw.
- **Story 3**:
  - 7속성 각각 단독 적용 → emit XML 의 자식 엘리먼트 매핑 검증 (`bold`→`<b/>`, `strike`→`<strike/>`, `color`→`<color rgb="..."/>` 등).
  - 미지정 속성은 자식 엘리먼트 부재 검증.
  - default 와 override 7속성 동일 입력 시 OOXML 매핑이 동일한 형식인지 (default 와 override 가 같은 빌더 경유).

테스트 위치: `packages/excel/tests/excel-cell.spec.ts` (cell 폰트), 신규 `packages/excel/tests/excel-workbook-font.spec.ts` 또는 기존 `excel-workbook.spec.ts` (default 폰트), `packages/excel/tests/xml/excel-xml-style.spec.ts` (없으면 신규, OOXML 매핑 단위 테스트).

## Rollout

단일 PR. Story 의존성:
1. Story 3(공통 타입) → `types.ts` 에 `ExcelFont` / `ExcelFontUnderline` / `ExcelXmlStyleDataFont` 추가 + `ExcelStyleOptions.font?` 추가.
2. 내부 빌더 → `excel-xml-style.ts` 에 `_buildFontXml / _getSameOrCreateFont / _validateFont / setDefaultStyle / _applyStyleToXf` 추가 + `add/addWithClone/get` 에 font 분기.
3. 옵션 변환 헬퍼 → `convertExcelStyleOptions(opts) → ExcelStyle` 추출 (cell/workbook 양쪽 공유).
4. Story 2 표면 → `excel-cell.ts` `setStyle` 에서 추출된 헬퍼 사용.
5. Story 1 표면 → `excel-workbook.ts` 에 `setDefaultStyle(opts)` 추가 + `_getOrCreateStyleData` 헬퍼 공유.
6. 테스트.

조건부 서식(`ExcelConditionalRuleStyle`) 은 본 스코프 밖 (task.md AC).

## Open Questions

- **Resolved Q1.A (underline 타입)**: `ExcelFontUnderline = "single" | "double" | "singleAccounting" | "doubleAccounting"`. OOXML `<u val="..."/>` 의 val 에 직접 매핑. 미지정 시 `<u/>` emit X. (2026-05-09)
  - 근거: 사용자 답변 (2026-05-09).

- **Resolved Q1.B (workbook default 진입점)**: `ExcelWorkbook.setDefaultStyle(opts: ExcelStyleOptions): Promise<void>` 메서드. 폰트만이 아니라 `ExcelStyleOptions` 의 모든 필드(background/border/horizontalAlign/verticalAlign/numberFormat/numberFormatCode/font) 를 default cell style 로 동일 빌더로 처리한다. `cellXfs[0]` 자리에 새 xf 를 빌드해 덮어쓴다. (2026-05-09)
  - 근거: 사용자 답변 (2026-05-09) "wb.setDefaultStyle({font: ...}) 여야". OOXML `cellXfs[0]` 가 default cell style 자리이고 `cell.setStyle` 표면이 `ExcelStyleOptions` 인 점과 일관.
