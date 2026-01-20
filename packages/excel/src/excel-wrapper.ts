import type { z } from "zod";
import { ExcelWorkbook } from "./excel-workbook";
import type { ExcelValueType } from "./types";
import { DateOnly, DateTime, NumberUtils, Time } from "@simplysm/core-common";

/**
 * Zod 스키마 기반 Excel 래퍼
 *
 * 스키마에서 타입 정보를 추론하여 타입 안전한 읽기/쓰기 제공
 */
export class ExcelWrapper<T extends z.ZodObject<z.ZodRawShape>> {
  constructor(
    private readonly _schema: T,
    private readonly _displayNameMap: Record<keyof z.infer<T>, string>,
  ) {}

  /**
   * Excel 파일 읽기 → 레코드 배열
   */
  async read(
    file: Uint8Array | Blob,
    wsNameOrIndex: string | number = 0,
  ): Promise<z.infer<T>[]> {
    await using wb = new ExcelWorkbook(file);

    const ws = await wb.getWorksheet(wsNameOrIndex);
    const wsName = await ws.getName();

    const displayNames = Object.values(this._displayNameMap);
    const rawData = await ws.getDataTable({
      usableHeaderNameFn: (headerName) => displayNames.includes(headerName),
    });

    if (rawData.length === 0) {
      throw new Error("엑셀파일에서 데이터를 찾을 수 없습니다.");
    }

    const reverseMap = this._getReverseDisplayNameMap();
    const shape = this._schema.shape;
    const result: z.infer<T>[] = [];

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
        const errors = parseResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
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
  async write(wsName: string, records: Partial<z.infer<T>>[]): Promise<ExcelWorkbook> {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet(wsName);

    const keys = Object.keys(this._displayNameMap) as (keyof z.infer<T>)[];
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

  private _convertValue(
    rawValue: ExcelValueType,
    fieldSchema: z.ZodType,
  ): unknown {
    if (rawValue == null || rawValue === "") {
      return this._getDefaultForSchema(fieldSchema);
    }

    const innerSchema = this._unwrapSchema(fieldSchema);
    const typeName = this._getTypeName(innerSchema);

    if (typeName === "ZodString") {
      return typeof rawValue === "string" ? rawValue : String(rawValue);
    }

    if (typeName === "ZodNumber") {
      if (typeof rawValue === "number") return rawValue;
      const parsed = NumberUtils.parseFloat(String(rawValue));
      return parsed;
    }

    if (typeName === "ZodBoolean") {
      if (typeof rawValue === "boolean") return rawValue;
      if (rawValue === "1" || rawValue === "true") return true;
      if (rawValue === "0" || rawValue === "false") return false;
      return Boolean(rawValue);
    }

    // DateOnly, DateTime, Time은 instanceof로 처리
    if (rawValue instanceof DateOnly || rawValue instanceof DateTime || rawValue instanceof Time) {
      return rawValue;
    }

    // 문자열에서 날짜 파싱 시도
    if (typeof rawValue === "string") {
      if (typeName === "ZodDate") {
        return DateTime.parse(rawValue);
      }
    }

    return rawValue;
  }

  private _unwrapSchema(schema: z.ZodType): z.ZodType {
    const typeName = this._getTypeName(schema);

    if (typeName === "ZodOptional" || typeName === "ZodNullable" || typeName === "ZodDefault") {
      const def = schema._def as unknown as { innerType: z.ZodType };
      return this._unwrapSchema(def.innerType);
    }

    return schema;
  }

  private _getTypeName(schema: z.ZodType): string {
    const def = schema._def as unknown as { typeName: string };
    return def.typeName;
  }

  private _getDefaultForSchema(schema: z.ZodType): unknown {
    const typeName = this._getTypeName(schema);

    if (typeName === "ZodDefault") {
      const def = schema._def as unknown as { defaultValue: () => unknown };
      return def.defaultValue();
    }

    if (typeName === "ZodOptional" || typeName === "ZodNullable") {
      return undefined;
    }

    // Boolean 필수 필드의 기본값은 false
    const innerSchema = this._unwrapSchema(schema);
    if (this._getTypeName(innerSchema) === "ZodBoolean") {
      return false;
    }

    return undefined;
  }

  private _isRequired(schema: z.ZodType): boolean {
    const typeName = this._getTypeName(schema);
    return typeName !== "ZodOptional" && typeName !== "ZodNullable";
  }

  private _isBoolean(schema: z.ZodType): boolean {
    const innerSchema = this._unwrapSchema(schema);
    return this._getTypeName(innerSchema) === "ZodBoolean";
  }

  //#endregion
}
