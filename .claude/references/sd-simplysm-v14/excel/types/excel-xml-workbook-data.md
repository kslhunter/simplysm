# ExcelXmlWorkbookData

`workbook.xml` 데이터 구조이다. 내부 구현에 사용된다.

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
