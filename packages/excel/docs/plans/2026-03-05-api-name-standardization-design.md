# Excel Package API Name Standardization

## Goal

Align public API names in `packages/excel` with industry standards (ExcelJS, SheetJS, openpyxl).

## Changes

| Current | New | Class | Priority |
|---------|-----|-------|----------|
| `createWorksheet(name)` | `addWorksheet(name)` | `ExcelWorkbook` | P1 |
| `getBytes()` | `toBytes()` | `ExcelWorkbook` | P2 |
| `getBlob()` | `toBlob()` | `ExcelWorkbook` | P2 |
| `setFix(point)` | `freezeAt(point)` | `ExcelWorksheet` | P0 |
| `getVal()` | `getValue()` | `ExcelCell` | P2 |
| `setVal(val)` | `setValue(val)` | `ExcelCell` | P2 |
| `parseRowAddrCode(s)` | `parseRowAddr(s)` | `ExcelUtils` | P1 |
| `parseColAddrCode(s)` | `parseColAddr(s)` | `ExcelUtils` | P1 |
| `parseCellAddrCode(s)` | `parseCellAddr(s)` | `ExcelUtils` | P1 |
| `parseRangeAddrCode(s)` | `parseRangeAddr(s)` | `ExcelUtils` | P1 |
| `setFix(point)` | `freezeAt(point)` | `ExcelXmlWorksheet` (internal) | P0 |

## Impact Scope

- **src/**: 6 files (workbook, worksheet, cell, utils, xml-worksheet, wrapper)
- **tests/**: up to 8 spec files
- **docs/**: 3 markdown files (workbook.md, utils.md, wrapper.md)
- **External**: none (no other packages import from `@simplysm/excel`)

## Approach

Pure rename — no logic or signature changes. All method signatures remain identical.
