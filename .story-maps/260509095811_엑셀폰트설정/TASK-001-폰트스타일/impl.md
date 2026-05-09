# TASK-001-폰트스타일 Implementation

## 메타
- implemented: 2026-05-09

## 구현 결과

- **Story 1 (workbook default)**:
  - `packages/excel/src/excel-workbook.ts` — `async setDefaultStyle(opts: ExcelStyleOptions): Promise<void>` 추가. `getOrCreateStyleData(zipCache)` 호출 후 `ExcelXmlStyle.setDefaultStyle(convertExcelStyleOptions(opts))` 위임.
  - `packages/excel/src/xml/excel-xml-style.ts` — `setDefaultStyle(style: ExcelStyle): void` 추가. `cellXfs[0].xf[0]` 자리에 새 xf 빌드 후 덮어쓴다 (`_applyStyleToXf` 공유 빌더 사용).
  - `packages/excel/src/utils/excel-style-data.ts` — `getOrCreateStyleData(zipCache)` 헬퍼 신규. `ExcelCell._getOrCreateStyleData` 와 동일 흐름을 모듈로 추출해 cell/workbook 양쪽 재사용.

- **Story 2 (cell override)**:
  - `packages/excel/src/types.ts` — `ExcelStyleOptions.font?: ExcelFont` 필드 추가.
  - `packages/excel/src/excel-cell.ts` — `setStyle` 본문을 `convertExcelStyleOptions` 호출로 단순화. 검증·numFmt 분기 등이 헬퍼로 이동해 cell/workbook 이 동일 변환 경로 공유.
  - `packages/excel/src/xml/excel-xml-style.ts` — `add` / `addWithClone` 의 font 분기 추가 (`_validateFont` + `_buildFontXml` + `_getSameOrCreateFont`). `get` 에 font 복원 분기 + `_parseFontXml` 추가.

- **Story 3 (공통 7속성)**:
  - `packages/excel/src/types.ts` — 신규 타입:
    - `ExcelFontUnderline = "single" | "double" | "singleAccounting" | "doubleAccounting"`
    - `ExcelFont` (size/family/bold/italic/underline/color/strike, 모두 optional)
    - `ExcelXmlStyleDataFont` (sz/name/b/i/u/strike/color)
    - `ExcelXmlStyleData.fonts.font` 의 항목 타입을 `{}` → `ExcelXmlStyleDataFont` 로 강화.
  - `packages/excel/src/xml/excel-xml-style.ts` — `_buildFontXml(font)` / `_parseFontXml(item)` / `_validateFont(font)` / `_getSameOrCreateFont(item)` 추가. OOXML 매핑:
    - `bold/italic/strike: true` → `<b/>` / `<i/>` / `<strike/>` (val 없음)
    - `underline: <enum>` → `<u val="..."/>`
    - `size` → `<sz val="..."/>`, `family` → `<name val="..."/>`, `color` → `<color rgb="..."/>` (대문자 정규화)
    - 미지정 속성은 자식 엘리먼트 자체 emit X.
  - `_validateFont` 에서 `color` 만 ARGB 8자리 정규식 검증 (`/^[0-9A-F]{8}$/i`). 그 외 속성은 Excel 에 위임.

- **테스트**:
  - `packages/excel/tests/excel-font.spec.ts` 신규 — 18 케이스. workbook default / cell override / 7속성 OOXML 매핑 / dedup / 형식 검증 / 미호출 회귀 커버.

### design 대비 차이

- 헬퍼 위치: design.md 가 "ExcelXmlStyle 의 정적 헬퍼나 별도 유틸로 추출" 두 옵션을 제시. 실제 구현은 `packages/excel/src/utils/excel-style-data.ts` 신규 파일. `excel-xml-style.ts ↔ zip-cache.ts` 사이의 순환 import 회피가 결정 근거. (design 의 두 번째 옵션 채택, 차이 아님)
- `_parseFontXml` 은 design.md 에 메서드명 명시 X. get() 의 font 복원 로직 명시에 함의되어 자연 추가.
- `ExcelXmlStyleDataFont.u` 정의를 `[{ $?: { val?: ExcelFontUnderline } }]` 로 partial 처리. OOXML 의 `<u/>` (val 생략 = single 기본) read 호환.

## 패키지 레벨 검증

- `pnpm check --fix -t excel` — typecheck 0 에러 / lint 0 에러·경고.
- `pnpm exec vitest run --project node packages/excel` — 14 파일 / 197 테스트 (기존 179 + 신규 18) 전부 통과.

## 정방향 검토

- story-map.md (Activity 1, Task 1) → task.md AC 6건 → design.md (Resolved Q1.A·Q1.B 포함) → impl 와 code 일관. 변질·누락 없음.
- 조건부 서식(`ExcelConditionalRuleStyle`) 미터치 — task.md AC 와 일치.
- sheet 단위 default 미도입 — task.md AC 와 일치.

## 안내

라이브러리 API 변경. UI 시연 불필요. 사용 예:

```typescript
const wb = new ExcelWorkbook();
await wb.setDefaultStyle({ font: { family: "맑은 고딕", size: 10 } });
const ws = await wb.addWorksheet("Sheet1");
await ws.cell(0, 0).setStyle({ font: { bold: true, color: "00FF0000" } });
```

커밋은 사용자 정책에 따라 본 워크플로에서 수행하지 않음.
