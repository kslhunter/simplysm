import type { Bytes } from "@simplysm/core-common";
import { DateOnly, DateTime, numParseFloat, Time } from "@simplysm/core-common";
import { type z, ZodBoolean, ZodDefault, ZodNullable, ZodNumber, ZodOptional, ZodString } from "zod";
import { ExcelWorkbook } from "./excel-workbook";
import type { ExcelValueType } from "./types";

/**
 * Zod 스키마 기반 Excel 래퍼
 *
 * 스키마에서 타입 정보를 추론하여 타입 안전한 읽기/쓰기 제공
 */
export class ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>> {
  /**
   * @param _schema Zod 스키마 (레코드 구조 정의)
   * @param _displayNameMap 필드명-표시명 매핑 (Excel 헤더로 사용)
   */
  constructor(
    private readonly _schema: TSchema,
    private readonly _displayNameMap: Record<keyof z.infer<TSchema>, string>,
  ) {}

  /**
   * Excel 파일 읽기 → 레코드 배열
   */
  async read(file: Bytes | Blob, wsNameOrIndex: string | number = 0): Promise<z.infer<TSchema>[]> {
    await using wb = new ExcelWorkbook(file);

    const ws = await wb.getWorksheet(wsNameOrIndex);
    const wsName = await ws.getName();

    const displayNames = Object.values(this._displayNameMap);
    const rawData = await ws.getDataTable({
      usableHeaderNameFn: (headerName) => displayNames.includes(headerName),
    });

    if (rawData.length === 0) {
      throw new Error(`[${wsName}] 엑셀파일에서 데이터를 찾을 수 없습니다. (기대 헤더: ${displayNames.join(", ")})`);
    }

    const reverseMap = this._getReverseDisplayNameMap();
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

      // Zod 스키마로 검증
      const parseResult = this._schema.safeParse(record);
      if (!parseResult.success) {
        const errors = parseResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
        throw new Error(`[${wsName}] 데이터 검증 실패: ${errors}`);
      }

      result.push(parseResult.data);
    }

    return result;
  }

  /**
   * 레코드 배열 → Excel 워크북
   *
   * @remarks
   * 반환된 워크북은 호출자가 리소스를 관리해야 합니다.
   * `await using`을 사용하거나 작업 완료 후 `close()`를 호출하세요.
   *
   * @example
   * ```typescript
   * await using wb = await wrapper.write("Sheet1", records);
   * const bytes = await wb.getBytes();
   * ```
   */
  async write(wsName: string, records: Partial<z.infer<TSchema>>[]): Promise<ExcelWorkbook> {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet(wsName);

    const keys = Object.keys(this._displayNameMap) as (keyof z.infer<TSchema>)[];
    const headers = keys.map((key) => this._displayNameMap[key]);

    // 헤더 행 작성
    for (let c = 0; c < headers.length; c++) {
      await ws.cell(0, c).setVal(headers[c]);
    }

    // 데이터 행 작성
    for (let r = 0; r < records.length; r++) {
      for (let c = 0; c < keys.length; c++) {
        const key = keys[c];
        const value = records[r][key] as ExcelValueType;
        await ws.cell(r + 1, c).setVal(value);
      }
    }

    // 테두리 스타일 적용
    for (let r = 0; r < records.length + 1; r++) {
      for (let c = 0; c < keys.length; c++) {
        await ws.cell(r, c).setStyle({
          border: ["left", "right", "top", "bottom"],
        });
      }
    }

    // 필수 필드 헤더 강조 (노란색)
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

    // 뷰 설정
    await ws.setZoom(85);
    await ws.setFix({ r: 0 });

    return wb;
  }

  //#region Private Methods

  private _getReverseDisplayNameMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [fieldKey, displayName] of Object.entries(this._displayNameMap)) {
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

    // DateOnly, DateTime, Time은 instanceof로 처리
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
      // ZodDefault.parse(undefined)는 기본값을 반환함
      return schema.parse(undefined);
    }

    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      return undefined;
    }

    // Boolean 필수 필드의 기본값은 false
    const innerSchema = this._unwrapSchema(schema);
    if (innerSchema instanceof ZodBoolean) {
      return false;
    }

    return undefined;
  }

  private _isRequired(schema: z.ZodType): boolean {
    return !(schema instanceof ZodOptional) && !(schema instanceof ZodNullable) && !(schema instanceof ZodDefault);
  }

  private _isBoolean(schema: z.ZodType): boolean {
    const innerSchema = this._unwrapSchema(schema);
    return innerSchema instanceof ZodBoolean;
  }

  //#endregion
}
