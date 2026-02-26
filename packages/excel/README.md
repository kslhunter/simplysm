# @simplysm/excel

Excel file processing library

## Installation

pnpm add @simplysm/excel

## Source Index

### Types and utilities

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/types.ts` | `ExcelXmlContentTypeData`, `ExcelXmlRelationshipData`, `ExcelRelationshipData`, `ExcelXmlWorkbookData`, `ExcelXmlWorksheetData`, `ExcelRowData`, `ExcelCellData`, `ExcelXmlDrawingData`, `ExcelXmlSharedStringData`, `ExcelXmlSharedStringDataSi`, `ExcelXmlSharedStringDataText`, `ExcelXmlStyleData`, `ExcelXmlStyleDataXf`, `ExcelXmlStyleDataFill`, `ExcelXmlStyleDataBorder`, `ExcelValueType`, `ExcelNumberFormat`, `ExcelCellType`, `ExcelAddressPoint`, `ExcelAddressRangePoint`, `ExcelXml`, `ExcelBorderPosition`, `ExcelHorizontalAlign`, `ExcelVerticalAlign`, `ExcelStyleOptions` | All shared XML data types, value types, address types, and style option interfaces | - |
| `src/utils/excel-utils.ts` | `ExcelUtils` | Utility functions for address conversion, date/number format mapping | `excel-utils.spec.ts` |

### Core classes

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/excel-cell.ts` | `ExcelCell` | Single cell with value, formula, style, and merge operations | `excel-cell.spec.ts` |
| `src/excel-row.ts` | `ExcelRow` | Row container providing cell access by column index | `excel-row.spec.ts` |
| `src/excel-col.ts` | `ExcelCol` | Column container providing cell access and column width setting | `excel-col.spec.ts` |
| `src/excel-worksheet.ts` | `ExcelWorksheet` | Worksheet with cell/row/col access, copy, data table, and image support | `excel-worksheet.spec.ts` |
| `src/excel-workbook.ts` | `ExcelWorkbook` | Workbook with lazy-loading ZIP, worksheet management, and export | `excel-workbook.spec.ts` |

### Wrapper classes

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/excel-wrapper.ts` | `ExcelWrapper` | Zod schema-based type-safe Excel read/write wrapper | `excel-wrapper.spec.ts` |

## License

Apache-2.0
