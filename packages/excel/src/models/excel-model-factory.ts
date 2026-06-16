import type { Bytes } from "@simplysm/core-common";
import type { ExcelFormat } from "./excel-format";
import type { IExcelModel } from "./excel-model";
import type { IContentTypeModel } from "./i-content-type-model";
import type { IDrawingModel } from "./i-drawing-model";
import type { IRelationshipModel } from "./i-relationship-model";
import type { ISharedStringModel } from "./i-shared-string-model";
import type { IStyleModel } from "./i-style-model";
import type { IWorkbookModel } from "./i-workbook-model";
import type { IWorksheetModel } from "./i-worksheet-model";

/**
 * 포맷별 파트 모델 팩토리 계약.
 *
 * - `createXxx()`: 빈(신규) 파트 모델 생성 — 상위 레이어의 `new XmlXxx()` 직접 생성을 대체.
 * - `parse()`: ZIP 내부 파일 바이트를 경로 패턴에 맞는 파트 모델로 역직렬화 — `ZipCache.get` 의 분기 대체.
 *
 * `ZipCache` 는 워크북 포맷에 맞는 팩토리 1개를 보유하고 모든 파트 생성·복원을 위임한다.
 */
export interface IExcelModelFactory {
  readonly format: ExcelFormat;
  /** 이 파일 경로를 모델로 파싱할 파트인지(true) 원시 바이트로 둘지(false) 판정. */
  isModelPart(filePath: string): boolean;
  createWorkbook(): IWorkbookModel;
  createWorksheet(): IWorksheetModel;
  createStyle(): IStyleModel;
  createSharedString(): ISharedStringModel;
  createContentType(): IContentTypeModel;
  createRelationship(): IRelationshipModel;
  createDrawing(): IDrawingModel;
  /** 경로 패턴 → 적절한 파트 모델로 역직렬화. 매칭 없으면 unknown(패스스루) 모델. */
  parse(filePath: string, bytes: Bytes): IExcelModel;
}
