import type { Bytes } from "@simplysm/core-common";
import { ZipArchive } from "@simplysm/core-common";
import { BiffModelFactory } from "../biff/biff-model-factory";
import type { ExcelFormat } from "../models/excel-format";
import type { IExcelModel } from "../models/excel-model";
import type { IExcelModelFactory } from "../models/excel-model-factory";
import type { IContentTypeModel } from "../models/i-content-type-model";
import type { IDrawingModel } from "../models/i-drawing-model";
import type { IRelationshipModel } from "../models/i-relationship-model";
import type { ISharedStringModel } from "../models/i-shared-string-model";
import type { IStyleModel } from "../models/i-style-model";
import type { IWorkbookModel } from "../models/i-workbook-model";
import type { IWorksheetModel } from "../models/i-worksheet-model";
import { XmlModelFactory } from "../xml/xml-model-factory";

/**
 * Excel ZIP 아카이브의 파일 캐시를 관리하는 클래스.
 * 모델 파트는 포맷별 팩토리로 파싱/직렬화하고, 기타 파일(media 등)은 바이트 배열로 캐싱한다.
 *
 * @remarks
 * ## 포맷 판별, 경로 정규화
 *
 * 기존 파일은 `xl/workbook.bin` 존재 여부로 xlsx/xlsb 를 1회 판별한다(없으면 xlsx).
 * 상위 레이어는 `xl/workbook.xml` 같은 OOXML(.xml) 경로를 사용하므로, xlsb 워크북에서는
 * 이를 `.bin` 경로로 정규화하여 상위 레이어가 포맷을 모르게 한다.
 *
 * ## Lazy Loading
 *
 * 파일은 최초 접근 시에만 ZIP 에서 읽고 파싱하며, 이후 접근은 캐싱된 객체를 반환한다.
 */
export class ZipCache {
  private readonly _cache = new Map<string, IExcelModel | Bytes | undefined>();
  private readonly _zip: ZipArchive;
  private _factory: IExcelModelFactory | undefined;

  constructor(arg?: Blob | Bytes, format?: ExcelFormat) {
    this._zip = new ZipArchive(arg);
    if (format != null) {
      this._factory = format === "xlsb" ? new BiffModelFactory() : new XmlModelFactory();
    }
  }

  /** 워크북 포맷. 미판별 시 xlsx 로 간주. */
  get format(): ExcelFormat {
    return (this._factory ??= new XmlModelFactory()).format;
  }

  /** 기존 파일 포맷을 1회 판별해 팩토리 확정 (async). */
  private async _resolveFactory(): Promise<IExcelModelFactory> {
    if (this._factory == null) {
      const isXlsb = (await this._zip.get("xl/workbook.bin")) != null;
      this._factory = isXlsb ? new BiffModelFactory() : new XmlModelFactory();
    }
    return this._factory;
  }

  /** 새(빈) 워크북의 동기 생성 경로용 팩토리. 빈 워크북은 xlsx 로 본다. */
  private get _syncFactory(): IExcelModelFactory {
    return (this._factory ??= new XmlModelFactory());
  }

  /** 상위 레이어의 .xml 고정 경로를 xlsb 의 실제 .bin 경로로 정규화. */
  private _resolvePath(filePath: string): string {
    if (this._factory?.format !== "xlsb") return filePath;
    switch (filePath) {
      case "xl/workbook.xml":
        return "xl/workbook.bin";
      case "xl/sharedStrings.xml":
        return "xl/sharedStrings.bin";
      case "xl/styles.xml":
        return "xl/styles.bin";
      case "xl/_rels/workbook.xml.rels":
        return "xl/_rels/workbook.bin.rels";
      default: {
        const m = /^(xl\/worksheets\/_rels\/sheet\d+)\.xml\.rels$/.exec(filePath);
        return m != null ? `${m[1]}.bin.rels` : filePath;
      }
    }
  }

  async get(filePath: string): Promise<IExcelModel | Bytes | undefined> {
    const factory = await this._resolveFactory();
    const path = this._resolvePath(filePath);

    if (this._cache.has(path)) {
      return this._cache.get(path);
    }

    const fileData = await this._zip.get(path);
    if (fileData == null) {
      this._cache.set(path, undefined);
      return undefined;
    }

    if (factory.isModelPart(path)) {
      this._cache.set(path, factory.parse(path, fileData));
    } else {
      this._cache.set(path, fileData);
    }

    return this._cache.get(path);
  }

  set(filePath: string, content: IExcelModel | Bytes): void {
    this._cache.set(this._resolvePath(filePath), content);
  }

  //#region Factory Delegation (빈 모델 생성)

  createWorkbook(): IWorkbookModel {
    return this._syncFactory.createWorkbook();
  }
  createWorksheet(): IWorksheetModel {
    return this._syncFactory.createWorksheet();
  }
  createStyle(): IStyleModel {
    return this._syncFactory.createStyle();
  }
  createSharedString(): ISharedStringModel {
    return this._syncFactory.createSharedString();
  }
  createContentType(): IContentTypeModel {
    return this._syncFactory.createContentType();
  }
  createRelationship(): IRelationshipModel {
    return this._syncFactory.createRelationship();
  }
  createDrawing(): IDrawingModel {
    return this._syncFactory.createDrawing();
  }

  //#endregion

  //#region Part 등록 (포맷별 content-type, rel, part 생성)

  /**
   * 워크시트 파트를 등록한다. content-type override, workbook rels, 빈 worksheet 모델을 포맷에 맞게 생성하고
   * worksheet 파일명(`sheetN.xml` | `sheetN.bin`)을 반환한다.
   */
  async registerWorksheet(relId: number): Promise<string> {
    const xlsb = this.format === "xlsb";
    const fileName = `sheet${relId}.${xlsb ? "bin" : "xml"}`;

    const typeXml = (await this.get("[Content_Types].xml")) as IContentTypeModel;
    typeXml.add(
      `/xl/worksheets/${fileName}`,
      xlsb
        ? "application/vnd.ms-excel.worksheet"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
    );

    const wbRel = (await this.get("xl/_rels/workbook.xml.rels")) as IRelationshipModel;
    wbRel.insert(
      relId,
      `worksheets/${fileName}`,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
    );

    this.set(`xl/worksheets/${fileName}`, this.createWorksheet());
    return fileName;
  }

  /** sharedStrings 파트를 보장(없으면 생성+등록)하고 모델을 반환한다. */
  async ensureSharedStrings(): Promise<ISharedStringModel> {
    let ss = (await this.get("xl/sharedStrings.xml")) as ISharedStringModel | undefined;
    if (ss == null) {
      const xlsb = this.format === "xlsb";
      ss = this.createSharedString();
      this.set("xl/sharedStrings.xml", ss);

      const typeXml = (await this.get("[Content_Types].xml")) as IContentTypeModel;
      typeXml.add(
        `/xl/sharedStrings.${xlsb ? "bin" : "xml"}`,
        xlsb
          ? "application/vnd.ms-excel.sharedStrings"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
      );

      const wbRel = (await this.get("xl/_rels/workbook.xml.rels")) as IRelationshipModel;
      wbRel.add(
        `sharedStrings.${xlsb ? "bin" : "xml"}`,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
      );
    }
    return ss;
  }

  /** styles 파트를 보장(없으면 생성+등록)하고 모델을 반환한다. */
  async ensureStyles(): Promise<IStyleModel> {
    let st = (await this.get("xl/styles.xml")) as IStyleModel | undefined;
    if (st == null) {
      const xlsb = this.format === "xlsb";
      st = this.createStyle();
      this.set("xl/styles.xml", st);

      const typeXml = (await this.get("[Content_Types].xml")) as IContentTypeModel;
      typeXml.add(
        `/xl/styles.${xlsb ? "bin" : "xml"}`,
        xlsb
          ? "application/vnd.ms-excel.styles"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
      );

      const wbRel = (await this.get("xl/_rels/workbook.xml.rels")) as IRelationshipModel;
      wbRel.add(
        `styles.${xlsb ? "bin" : "xml"}`,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
      );
    }
    return st;
  }

  //#endregion

  async toBytes(): Promise<Bytes> {
    for (const filePath of this._cache.keys()) {
      const content = this._cache.get(filePath);
      if (content == null) continue;

      if ("serialize" in content) {
        this._zip.write(filePath, content.serialize());
      } else {
        this._zip.write(filePath, content);
      }
    }

    return this._zip.compress();
  }

  async close(): Promise<void> {
    await this._zip.close();
    this._cache.clear();
  }
}
