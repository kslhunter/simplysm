import type { Bytes } from "@simplysm/core-common";
import { DateOnly, DateTime, numParseFloat, Time } from "@simplysm/core-common";
import {
  type z,
  ZodBoolean,
  ZodDefault,
  ZodNullable,
  ZodNumber,
  ZodOptional,
  ZodString,
} from "zod";
import { ExcelWorkbook } from "./excel-workbook";
import type { ExcelValueType } from "./types";

/**
 * Zod schema-based Excel wrapper
 *
 * Infers type information from schema to provide type-safe read/write
 */
export class ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>> {
  /**
   * @param _schema Zod schema (defines record structure, use `.describe()` to specify Excel header names)
   */
  constructor(private readonly _schema: TSchema) {}

  /**
   * Read Excel file into record array
   */
  async read(
    file: Bytes | Blob,
    wsNameOrIndex: string | number = 0,
    options?: { excludes?: (keyof z.infer<TSchema>)[] },
  ): Promise<z.infer<TSchema>[]> {
    await using wb = new ExcelWorkbook(file);

    const excludes = options?.excludes as string[] | undefined;

    const ws = await wb.getWorksheet(wsNameOrIndex);
    const wsName = await ws.getName();

    const displayNameMap = this._getDisplayNameMap(excludes);
    const displayNames = Object.values(displayNameMap);
    const rawData = await ws.getDataTable({
      usableHeaderNameFn: (headerName) => displayNames.includes(headerName),
    });

    if (rawData.length === 0) {
      throw new Error(
        `[${wsName}] 엑셀파일에서 데이터를 찾을 수 없습니다. (기대 헤더: ${displayNames.join(", ")})`,
      );
    }

    const reverseMap = this._getReverseDisplayNameMap(excludes);
    const shape = this._schema.shape;
    const result: z.infer<TSchema>[] = [];

    for (const row of rawData) {
      const record: Record<string, unknown> = {};
      let hasNonNullValue = false;

      for (const [displayName, fieldKey] of reverseMap) {
        const rawValue = row[displayName];
        const fieldSchema = shape[fieldKey] as z.ZodType;

        if (rawValue != null && rawValue !== "") {
          hasNonNullValue = true;
        }

        record[fieldKey] = this._convertValue(rawValue, fieldSchema);
      }

      if (!hasNonNullValue) {
        continue;
      }

      // Validate with Zod schema
      const parseResult = this._schema.safeParse(record);
      if (!parseResult.success) {
        const errors = parseResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`[${wsName}] Data validation failed: ${errors}`);
      }

      result.push(parseResult.data);
    }

    return result;
  }

  /**
   * Record array to Excel workbook
   *
   * @remarks
   * The caller is responsible for managing the returned workbook's resources.
   * Use `await using` or call `close()` after use.
   *
   * @example
   * ```typescript
   * await using wb = await wrapper.write("Sheet1", records);
   * const bytes = await wb.getBytes();
   * ```
   */
  async write(
    wsName: string,
    records: Partial<z.infer<TSchema>>[],
    options?: { excludes?: (keyof z.infer<TSchema>)[] },
  ): Promise<ExcelWorkbook> {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet(wsName);

    const displayNameMap = this._getDisplayNameMap(options?.excludes as string[] | undefined);
    const keys = Object.keys(displayNameMap) as (keyof z.infer<TSchema>)[];
    const headers = keys.map((key) => displayNameMap[key as string]);

    // Write header row
    for (let c = 0; c < headers.length; c++) {
      await ws.cell(0, c).setVal(headers[c]);
    }

    // Write data rows
    for (let r = 0; r < records.length; r++) {
      for (let c = 0; c < keys.length; c++) {
        const key = keys[c];
        const value = records[r][key] as ExcelValueType;
        await ws.cell(r + 1, c).setVal(value);
      }
    }

    // Apply border style
    for (let r = 0; r < records.length + 1; r++) {
      for (let c = 0; c < keys.length; c++) {
        await ws.cell(r, c).setStyle({
          border: ["left", "right", "top", "bottom"],
        });
      }
    }

    // Highlight required field headers (yellow)
    const shape = this._schema.shape;
    for (let c = 0; c < keys.length; c++) {
      const fieldKey = keys[c] as string;
      const fieldSchema = shape[fieldKey] as z.ZodType;

      if (this._isRequired(fieldSchema) && !this._isBoolean(fieldSchema)) {
        await ws.cell(0, c).setStyle({
          background: "00FFFF00",
        });
      }
    }

    // View settings
    await ws.setZoom(85);
    await ws.setFix({ r: 0 });

    return wb;
  }

  //#region Private Methods

  private _getDisplayNameMap(excludes?: string[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const [key, fieldSchema] of Object.entries(this._schema.shape)) {
      if (excludes?.includes(key)) continue;
      map[key] = (fieldSchema as z.ZodType).description ?? key;
    }
    return map;
  }

  private _getReverseDisplayNameMap(excludes?: string[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const [fieldKey, displayName] of Object.entries(this._getDisplayNameMap(excludes))) {
      map.set(displayName, fieldKey);
    }
    return map;
  }

  private _convertValue(rawValue: ExcelValueType, fieldSchema: z.ZodType): unknown {
    if (rawValue == null || rawValue === "") {
      return this._getDefaultForSchema(fieldSchema);
    }

    const innerSchema = this._unwrapSchema(fieldSchema);

    if (innerSchema instanceof ZodString) {
      return typeof rawValue === "string" ? rawValue : String(rawValue);
    }

    if (innerSchema instanceof ZodNumber) {
      if (typeof rawValue === "number") return rawValue;
      return numParseFloat(String(rawValue));
    }

    if (innerSchema instanceof ZodBoolean) {
      if (typeof rawValue === "boolean") return rawValue;
      if (rawValue === "1" || rawValue === "true") return true;
      if (rawValue === "0" || rawValue === "false") return false;
      return Boolean(rawValue);
    }

    // DateOnly, DateTime, Time are handled via instanceof
    if (rawValue instanceof DateOnly || rawValue instanceof DateTime || rawValue instanceof Time) {
      return rawValue;
    }

    return rawValue;
  }

  private _unwrapSchema(schema: z.ZodType): z.ZodType {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      return this._unwrapSchema(schema.unwrap() as z.ZodType);
    }
    if (schema instanceof ZodDefault) {
      return this._unwrapSchema(schema.removeDefault() as z.ZodType);
    }
    return schema;
  }

  private _getDefaultForSchema(schema: z.ZodType): unknown {
    if (schema instanceof ZodDefault) {
      // ZodDefault.parse(undefined) returns the default value
      return schema.parse(undefined);
    }

    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      return undefined;
    }

    // Default value for required boolean fields is false
    const innerSchema = this._unwrapSchema(schema);
    if (innerSchema instanceof ZodBoolean) {
      return false;
    }

    return undefined;
  }

  private _isRequired(schema: z.ZodType): boolean {
    return (
      !(schema instanceof ZodOptional) &&
      !(schema instanceof ZodNullable) &&
      !(schema instanceof ZodDefault)
    );
  }

  private _isBoolean(schema: z.ZodType): boolean {
    const innerSchema = this._unwrapSchema(schema);
    return innerSchema instanceof ZodBoolean;
  }

  //#endregion
}
