# Wrapper

Type-safe Excel read/write wrapper with field validation and automatic type conversion.

## SdExcelWrapper

Generic class that wraps `SdExcelWorkbook` to provide validated, type-safe Excel I/O. Defines a field schema (`TExcelValidObject`) that maps record keys to display names, types, and validation constraints.

```typescript
class SdExcelWrapper<VT extends TExcelValidObject> {
  constructor(
    private readonly _fieldConf: VT | (() => VT),
    private readonly _additionalFieldConf?: (item: TExcelValidateObjectRecord<VT>) => {
      [P in keyof VT]?: Partial<TValidFieldSpec<VT[P]["type"]>>;
    },
  );

  async writeAsync(
    wsName: string,
    items: Partial<TExcelValidateObjectRecord<VT>>[],
  ): Promise<SdExcelWorkbook>;

  async readAsync(
    file: Buffer | Blob,
    wsNameOrIndex?: string | number,
  ): Promise<TExcelValidateObjectRecord<VT>[]>;
}
```

### Constructor

| Parameter | Type | Description |
|-----------|------|-------------|
| `_fieldConf` | `VT \| (() => VT)` | Field schema object or factory function. Each key maps to a `TValidFieldSpec` |
| `_additionalFieldConf` | `((item: TExcelValidateObjectRecord<VT>) => { ... }) \| undefined` | Optional per-row field overrides. Receives the current row data and returns partial field spec overrides |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `writeAsync(wsName, items)` | `Promise<SdExcelWorkbook>` | Creates a new workbook with a single worksheet containing the given records. Applies borders to all cells, yellow background to required (non-boolean notnull) header cells, 85% zoom, and freezes the header row |
| `readAsync(file, wsNameOrIndex?)` | `Promise<TExcelValidateObjectRecord<VT>[]>` | Reads records from an existing workbook. Filters headers by the field schema, auto-converts types (`String`, `Number`, `Boolean`, `DateOnly`, `DateTime`), skips rows where the first notnull field is empty, and validates the result. `wsNameOrIndex` defaults to `0` |

---

## TValidFieldSpec

Field specification type used within `TExcelValidObject`.

```typescript
type TValidFieldSpec<T extends Type<any>> = {
  displayName: string;
  type: T;
  notnull?: boolean;
  includes?: InstanceType<T>[];
  hidden?: boolean;
};
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | `string` | Column header text used in the Excel file |
| `type` | `T` | Constructor type (`String`, `Number`, `Boolean`, `DateOnly`, `DateTime`, etc.) |
| `notnull` | `boolean \| undefined` | When `true`, the field is required. In `writeAsync`, required non-boolean columns get a yellow background |
| `includes` | `InstanceType<T>[] \| undefined` | When set, restricts allowed values to this list |
| `hidden` | `boolean \| undefined` | When `true`, the field is excluded from read/write operations |

---

## TExcelValidObject

Record type mapping field keys to `TValidFieldSpec` entries.

```typescript
export type TExcelValidObject = Record<string, TValidFieldSpec<any>>;
```

---

## TInferField

Utility type that infers the TypeScript value type from a constructor type parameter.

```typescript
type TInferField<T extends Type<any>> = T extends StringConstructor
  ? string
  : T extends NumberConstructor
    ? number
    : T extends BooleanConstructor
      ? boolean
      : T extends DateConstructor
        ? Date
        : InstanceType<T>;
```

---

## TFieldValue

Resolves the value type from a `TValidFieldSpec`. If `includes` is provided, the type narrows to the union of included values; otherwise falls back to `TInferField`.

```typescript
type TFieldValue<T extends TValidFieldSpec<any>> =
  T["includes"] extends Array<infer U> ? U : TInferField<T["type"]>;
```

---

## TExcelValidateObjectRecord

Maps a `TExcelValidObject` schema to a TypeScript record type. Fields with `notnull: true` become required properties; all others become optional.

```typescript
export type TExcelValidateObjectRecord<VT extends TExcelValidObject> = {
  [P in keyof VT as VT[P]["notnull"] extends true ? P : never]: TFieldValue<VT[P]>;
} & {
  [P in keyof VT as VT[P]["notnull"] extends true ? never : P]?: TFieldValue<VT[P]>;
};
```
