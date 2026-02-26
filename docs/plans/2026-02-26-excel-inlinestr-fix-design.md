# Excel inlineStr getCellVal Bug Fix

## Problem

`ExcelXmlWorksheet.getCellVal()` fails to read inline string (`t="inlineStr"`) cell values.

```typescript
// excel-xml-worksheet.ts:102
const val = cellData?.v?.[0] ?? cellData?.is?.[0]?.t?.[0]?._;
```

fast-xml-parser (with project config `textNodeName: "_"`) parses `<t>` tags differently based on attributes:
- `<t>ID</t>` → `t: ["ID"]` (plain string) → `._` returns `undefined`
- `<t xml:space="preserve">ID</t>` → `t: [{ _: "ID", $: {...} }]` → `._` returns `"ID"`

Current code only handles the object case, so attribute-less inline strings always return `undefined`.

## Verified by

Direct parsing test with fast-xml-parser 5.3.7 + project XMLParser options:

| Case | `t[0]` | `typeof` | `t[0]._` |
|------|--------|----------|----------|
| `<t>ID</t>` | `"ID"` | string | `undefined` |
| `<t xml:space="preserve">ID</t>` | `{ _: "ID", $: {...} }` | object | `"ID"` |
| `<t></t>` | `""` | string | `undefined` |

## Existing Pattern

SharedStrings already handles the same duality in `_getStringFromTTag`:

```typescript
private _getStringFromTTag(t: ExcelXmlSharedStringDataText): string {
  const firstItem = t[0];
  if (typeof firstItem === "string") { return firstItem; }
  return firstItem._ ?? " ";
}
```

## Fix

### 1. Type definition (`types.ts`)

```typescript
// before
is?: {
  t?: {
    _?: string;
  }[];
}[];

// after
is?: {
  t?: (string | { _?: string })[];
}[];
```

### 2. getCellVal (`excel-xml-worksheet.ts`)

```typescript
// before
const val = cellData?.v?.[0] ?? cellData?.is?.[0]?.t?.[0]?._;

// after
const tVal = cellData?.is?.[0]?.t?.[0];
const val = cellData?.v?.[0] ?? (typeof tVal === "string" ? tVal : tVal?._);
```

## Scope

- 2 files, 3 lines changed
- No new dependencies or utilities
- Consistent with existing SharedStrings pattern
