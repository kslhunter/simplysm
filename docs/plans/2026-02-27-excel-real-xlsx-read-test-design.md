# Excel Real XLSX Read Test Design

## Summary

Add a test that reads an actual `.xlsx` file (`초기화.xlsx`) and verifies each sheet's data using `getDataTable()`.

## Motivation

Existing Excel tests only create workbooks programmatically. There is no test that reads an externally created `.xlsx` file, leaving a gap in coverage for real-world file parsing.

## Design

### File Placement

Copy `docs/example/초기화.xlsx` to `packages/excel/tests/fixtures/초기화.xlsx`.

### Test Location

Add a new `describe("Reading real xlsx file")` block to `packages/excel/tests/excel-workbook.spec.ts`.

### Test Structure

Code (describe/it descriptions, variables, comments) in English. Excel data values (sheet names, headers) remain in Korean as-is.

```
describe("Reading real xlsx file")
  beforeAll → fs.readFileSync + new ExcelWorkbook(buffer)
  afterAll → wb.close()
  it("Can read worksheet names")
  it("Can read permission group sheet data")
  it("Can read permission group permission sheet data")
  it("Can read employee sheet data")
```

### Assertions

Each sheet test calls `getDataTable()` and uses `toEqual` for exact value + type matching.

| Sheet | Expected Data |
|-------|--------------|
| 권한그룹 | `[{ "ID": 1, "명칭": "관리자" }]` |
| 권한그룹권한 | `[{ "권한그룹.ID": 1, "코드": "ALL", "값": true }]` |
| 직원 | `[{ "ID": 1, "이름": "관리자", "이메일": "admin@test.com", "비밀번호": "1234", "권한그룹.ID": 1, "삭제": false }]` |

### Data Types Verified

- `toEqual` verifies both value and type:
  - `1` (number), not `"1"` (string)
  - `true`/`false` (boolean), not `"true"`/`"false"` (string)
  - `"관리자"` (string)
