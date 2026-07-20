import { path, type Bytes } from "@simplysm/core-common";
import { ExcelWorksheet } from "./excel-worksheet";
import type { IRelationshipModel } from "./models/i-relationship-model";
import type { IWorkbookModel } from "./models/i-workbook-model";
import type { ExcelFormat } from "./models/excel-format";
import { convertExcelStyleOptions } from "./models/shared/excel-style";
import { ZipCache } from "./utils/zip-cache";
import { getOrCreateStyleData } from "./utils/excel-style-data";
import type { ExcelStyleOptions } from "./types";

/**
 * Excel 워크북 처리 클래스
 *
 * @remarks
 * 이 클래스는 내부적으로 ZIP 리소스를 관리한다.
 * 사용 후 반드시 리소스를 해제해야 한다.
 *
 * ## 비동기 설계
 *
 * 대용량 Excel 파일의 메모리 효율을 위해 Lazy Loading 아키텍처를 채택:
 * - ZIP 내부의 XML은 접근 시점에만 읽고 파싱함
 * - SharedStrings, Styles 등 대용량 XML은 필요할 때만 로드함
 * - 극단적인 경우에도 메모리 효율적 (예: 1TB SharedStrings가 있는 파일에서 숫자 셀 하나만 읽기)
 */
export class ExcelWorkbook {
  readonly zipCache: ZipCache;
  private readonly _wsMap = new Map<number, ExcelWorksheet>();
  private _isClosed = false;

  /**
   * @param arg 기존 Excel 파일 데이터 (Blob 또는 Uint8Array). 생략하면 새 워크북을 생성한다.
   */
  constructor(arg?: Blob | Bytes | { format?: ExcelFormat }) {
    if (arg instanceof Blob || ArrayBuffer.isView(arg)) {
      this.zipCache = new ZipCache(arg);
    } else {
      const format = arg?.format ?? "xlsx";
      this.zipCache = new ZipCache(undefined, format);

      // 전역 ContentTypes (포맷별 골격)
      this.zipCache.set("[Content_Types].xml", this.zipCache.createContentType());

      // 전역 Rels (xlsb 는 workbook.bin 을 가리킨다)
      const wbPartName = format === "xlsb" ? "xl/workbook.bin" : "xl/workbook.xml";
      this.zipCache.set(
        "_rels/.rels",
        this.zipCache.createRelationship().add(
          wbPartName,
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
        ),
      );

      // 워크북 + 워크북 Rels
      this.zipCache.set("xl/workbook.xml", this.zipCache.createWorkbook());
      this.zipCache.set("xl/_rels/workbook.xml.rels", this.zipCache.createRelationship());
    }
  }

  //#region Worksheet Methods

  private _ensureNotClosed(): void {
    if (this._isClosed) {
      throw new Error("ExcelWorkbook이 이미 닫혔습니다. close() 호출 후에는 사용할 수 없습니다.");
    }
  }

  /** 워크북의 모든 워크시트 이름 반환 */
  async getWorksheetNames(): Promise<string[]> {
    this._ensureNotClosed();
    const wbData = (await this.zipCache.get("xl/workbook.xml")) as IWorkbookModel;
    return wbData.sheetNames;
  }

  /** 새 워크시트를 생성하여 반환 */
  async addWorksheet(name: string): Promise<ExcelWorksheet> {
    this._ensureNotClosed();
    // 워크북에 시트 엔트리 추가
    const wbXml = (await this.zipCache.get("xl/workbook.xml")) as IWorkbookModel;
    const newWsRelId = wbXml.addWorksheet(name).lastWsRelId!;

    // content-type, rels, 빈 worksheet 파트 등록 (포맷별 처리는 ZipCache 위임)
    const fileName = await this.zipCache.registerWorksheet(newWsRelId);

    const ws = new ExcelWorksheet(this.zipCache, newWsRelId, fileName);
    this._wsMap.set(newWsRelId, ws);
    return ws;
  }

  /** 이름 또는 인덱스(0 기반)로 워크시트 조회 */
  async getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet> {
    this._ensureNotClosed();
    const wbData = (await this.zipCache.get("xl/workbook.xml")) as IWorkbookModel;
    const wsId =
      typeof nameOrIndex === "string"
        ? wbData.getWsRelIdByName(nameOrIndex)
        : wbData.getWsRelIdByIndex(nameOrIndex);

    if (wsId == null) {
      if (typeof nameOrIndex === "string") {
        throw new Error(`이름이 '${nameOrIndex}'인 시트를 찾을 수 없습니다.`);
      } else {
        throw new Error(`인덱스 '${nameOrIndex}'에 해당하는 시트를 찾을 수 없습니다.`);
      }
    }

    if (this._wsMap.has(wsId)) {
      return this._wsMap.get(wsId)!;
    }

    const relData = (await this.zipCache.get("xl/_rels/workbook.xml.rels")) as IRelationshipModel;
    const targetFilePath = relData.getTargetByRelId(wsId);
    if (targetFilePath == null) {
      throw new Error(`시트 관계 정보를 찾을 수 없습니다: rId${wsId}`);
    }

    const fileName = path.basename(targetFilePath);
    if (fileName === "") {
      throw new Error(`시트 파일명을 추출할 수 없습니다: ${targetFilePath}`);
    }

    const ws = new ExcelWorksheet(this.zipCache, wsId, fileName);
    this._wsMap.set(wsId, ws);
    return ws;
  }

  //#endregion

  //#region Style Methods

  /**
   * 워크북 default cell style 설정. `xl/styles.xml` 의 `fonts[0]` / `fills[0]` / `borders[0]`
   * (OOXML default 자원 슬롯) 자체를 입력 옵션으로 덮어쓴다. 셀의 xf 가 해당 자원 id 를 명시하지 않으면
   * 0번 슬롯이 자동 fallback 되므로, "표준" 셀 스타일이 워크북 전역(즉 fontId/fillId/borderId 를 별도로
   * 박지 않은 모든 셀) 에 적용된다.
   *
   * 폰트/배경/테두리뿐 아니라 horizontalAlign/verticalAlign/numberFormat/numberFormatCode 도 받는다.
   * 후자는 0번 자원 슬롯 개념이 없어 `cellXfs[0].xf[0]` 에 그대로 박힌다.
   *
   * 옵션이 없는 자원은 0번 슬롯이 빈 슬롯 (`{}` / patternType="none") 으로 reset 된다.
   * 미호출 시 `cellXfs[0]` 과 0번 슬롯 모두 원본이 그대로 보존된다.
   */
  async setDefaultStyle(opts: ExcelStyleOptions): Promise<void> {
    this._ensureNotClosed();
    const styleData = await getOrCreateStyleData(this.zipCache);
    styleData.setDefaultStyle(convertExcelStyleOptions(opts));
  }

  //#endregion

  //#region Export Methods

  /** 워크북을 바이트 배열로 내보내기 */
  async toBytes(): Promise<Bytes> {
    this._ensureNotClosed();
    return this.zipCache.toBytes();
  }

  /** 워크북을 Blob으로 내보내기 */
  async toBlob(): Promise<Blob> {
    this._ensureNotClosed();
    const bytes = await this.zipCache.toBytes();
    return new Blob([new Uint8Array(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  //#endregion

  //#region Lifecycle Methods

  /**
   * 워크북 리소스 해제
   *
   * @remarks
   * ZIP 리더와 내부 캐시를 정리한다.
   * 이 호출 이후에는 워크북 인스턴스를 사용할 수 없다.
   * 이미 닫힌 워크북에 대해 호출해도 안전하다 (no-op).
   */
  async close(): Promise<void> {
    if (this._isClosed) {
      return; // 이미 닫힌 경우 무시
    }
    this._isClosed = true;
    this._wsMap.clear();
    await this.zipCache.close();
  }

  //#endregion
}
