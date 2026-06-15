import type { Bytes } from "@simplysm/core-common";
import { DateOnly, DateTime, num, Time } from "@simplysm/core-common";
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
 * Zod 스키마 기반 Excel 래퍼
 *
 * 스키마에서 타입 정보를 추론하여 타입 안전한 읽기/쓰기를 제공한다
 */
export class ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>> {
  /**
   * @param _schema Zod 스키마 (레코드 구조를 정의하며, `.describe()`로 Excel 헤더 이름을 지정)
   */
  constructor(private readonly _schema: TSchema) {}

  /**
   * Excel 파일을 레코드 배열로 읽기
   */
  async read(
    file: Bytes | Blob,
    wsNameOrIndex: string | number = 0,
    options?: { excludes?: (keyof z.infer<TSchema>)[] },
  ): Promise<z.infer<TSchema>[]> {
    const wb = new ExcelWorkbook(file);
    try {
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
          `[${wsName}] Excel 파일에서 데이터를 찾을 수 없습니다. (기대하는 헤더: ${displayNames.join(", ")})`,
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

        // Zod 스키마로 유효성 검사
        const parseResult = this._schema.safeParse(record);
        if (!parseResult.success) {
          const errors = parseResult.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", ");
          throw new Error(`[${wsName}] 데이터 유효성 검사 실패: ${errors}`);
        }

        result.push(parseResult.data);
      }

      return result;
    } finally {
      await wb.close();
    }
  }

  /**
   * 레코드 배열을 Excel 워크북으로 변환
   *
   * @remarks
   * 반환된 워크북의 리소스 관리는 호출자의 책임이다.
   * 사용 후 `close()`를 호출해야 한다.
   */
  async write(
    wsName: string,
    records: Partial<z.infer<TSchema>>[],
    options?: { excludes?: (keyof z.infer<TSchema>)[] },
  ): Promise<ExcelWorkbook> {
    const wb = new ExcelWorkbook();
    try {
      const ws = await wb.addWorksheet(wsName);

      const displayNameMap = this._getDisplayNameMap(options?.excludes as string[] | undefined);
      const keys = Object.keys(displayNameMap) as (keyof z.infer<TSchema>)[];
      const headers = keys.map((key) => displayNameMap[key as string]);

      // 헤더 행 쓰기
      for (let c = 0; c < headers.length; c++) {
        await ws.cell(0, c).setValue(headers[c]);
      }

      // 데이터 행 쓰기
      for (let r = 0; r < records.length; r++) {
        for (let c = 0; c < keys.length; c++) {
          const key = keys[c];
          const value = records[r][key] as ExcelValueType;
          await ws.cell(r + 1, c).setValue(value);
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

      // 보기 설정
      await ws.setZoom(85);
      await ws.freezeAt({ r: 0 });

      // 헤더 자동 필터 (표 전체 범위: 헤더행 + 데이터행)
      await ws.setAutoFilter({
        s: { r: 0, c: 0 },
        e: { r: records.length, c: keys.length - 1 },
      });

      return wb;
    } catch (e) {
      await wb.close();
      throw e;
    }
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
      return num.parseFloat(String(rawValue));
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
      // ZodDefault.parse(undefined)는 기본값을 반환한다
      return schema.parse(undefined);
    }

    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      return undefined;
    }

    // 필수 boolean 필드의 기본값은 false
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
