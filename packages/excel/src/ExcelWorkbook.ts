import {ExcelWorksheet} from "./ExcelWorksheet";
import * as JSZip from "jszip";
import {XmlConvert} from "./utils/XmlConvert";

export class ExcelWorkbook {
  private readonly _worksheets: ExcelWorksheet[] = [];
  private _zip!: JSZip;
  private relData!: any;
  private wbData!: any;
  private contentTypeData!: any;
  private wbRelData!: any;

  public static async createAsync(): Promise<ExcelWorkbook> {
    const wb = new ExcelWorkbook();
    wb._zip = new JSZip();

    // .rel
    wb.relData = {
      Relationships: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/package/2006/relationships"
        },
        Relationship: [
          {
            $: {
              Id: "rId1",
              Type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
              Target: "xl/workbook.xml"
            }
          }
        ]
      }
    };

    // Workbook
    wb.wbData = {
      workbook: {
        $: {
          "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
        }
      }
    };

    // ContentType
    wb.contentTypeData = {
      Types: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/package/2006/content-types"
        },
        Default: [
          {
            $: {
              Extension: "rels",
              ContentType: "application/vnd.openxmlformats-package.relationships+xml"
            }
          },
          {
            $: {
              Extension: "xml",
              ContentType: "application/xml"
            }
          }
        ],
        Override: [
          {
            $: {
              PartName: "/xl/workbook.xml",
              ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
            }
          }
        ]
      }
    };

    // Workbook Rel
    wb.wbRelData = {
      Relationships: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/package/2006/relationships"
        },
        Relationship: []
      }
    };

    return wb;
  }

  public static async loadAsync(buffer: Buffer): Promise<ExcelWorkbook>;
  public static async loadAsync(file: File): Promise<ExcelWorkbook>;
  public static async loadAsync(blob: Blob): Promise<ExcelWorkbook>;
  public static async loadAsync(arg: Buffer | Blob | File): Promise<ExcelWorkbook> {
    let buffer: Buffer | Blob;
    if (arg instanceof File) {
      buffer = await new Promise<Buffer>(resolve => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
          resolve(Buffer.from(fileReader.result as ArrayBuffer));
        };
        fileReader.readAsArrayBuffer(arg);
      });
    }
    else {
      buffer = arg;
    }

    const wb = new ExcelWorkbook();

    const zip = await new JSZip().loadAsync(buffer);
    wb._zip = zip;

    // .rel
    wb.relData = await XmlConvert.parseAsync(await zip.file("_rels/.rels").async("text"));

    // Workbook
    wb.wbData = await XmlConvert.parseAsync(await zip.file("xl/workbook.xml").async("text"));

    // ContentType
    wb.contentTypeData = await XmlConvert.parseAsync(await zip.file("[Content_Types].xml").async("text"));

    // Workbook Rel
    wb.wbRelData = await XmlConvert.parseAsync(await zip.file("xl/_rels/workbook.xml.rels").async("text"));

    // Worksheets
    const worksheets = wb.wbData.workbook.sheets[0].sheet.map((item: any) => ({id: item.$.sheetId, name: item.$.name}));
    for (const item of worksheets) {
      const sheetData = await XmlConvert.parseAsync(await zip.file(`xl/worksheets/sheet${item.id}.xml`).async("text"));
      wb._worksheets[item.id] = new ExcelWorksheet(wb, item.name, sheetData);
    }

    return wb;
  }

  public getWorksheet(name: string): ExcelWorksheet {
    if (!this._worksheets[name]) {
      throw new Error(`시트[${name}]가 존재하지 않습니다.`);
    }
    return this._worksheets[name];
  }

  public async createWorksheetAsync(name: string): Promise<ExcelWorksheet> {
    // Workbook
    this.wbData.workbook.sheets = this.wbData.workbook.sheets || [{}];
    this.wbData.workbook.sheets[0].sheet = this.wbData.workbook.sheets[0].sheet || [];
    const lastSheetId = this.wbData.workbook.sheets[0].sheet.max((item: any) => Number(item.$.sheetId)) || 0;
    const newSheetId = lastSheetId + 1;

    this.wbData.workbook.sheets[0].sheet.push({
      $: {
        "name": name,
        "sheetId": newSheetId,
        "r:id": `rId${newSheetId}`
      }
    });

    // ContentType
    this.contentTypeData.Types.Override.push({
      $: {
        PartName: `/xl/worksheets/sheet${newSheetId}.xml`,
        ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
      }
    });

    // Workbook Rel
    this.wbRelData.Relationships.Relationship = this.wbRelData.Relationships.Relationship || [];
    const sheetRelationships = this.wbRelData.Relationships.Relationship.filter((item: any) => item.$.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet");
    sheetRelationships.push({
      $: {
        Id: `rId${newSheetId}`,
        Type: `http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`,
        Target: `worksheets/sheet${newSheetId}.xml`
      }
    });

    const nonSheetRelationships = this.wbRelData.Relationships.Relationship.filter((item: any) => item.$.Type !== "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet");
    let cnt = newSheetId + 1;
    for (const nonSheetRelationship of nonSheetRelationships) {
      nonSheetRelationship.$.Id = "rId" + cnt;
      cnt++;
    }

    this.wbRelData.Relationships.Relationship = sheetRelationships.concat(nonSheetRelationships);

    // Worksheets
    const sheetData = {
      worksheet: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        },
        sheetData: [{}]
      }
    };
    this._worksheets[newSheetId] = new ExcelWorksheet(this, name, sheetData);
    return this._worksheets[newSheetId];
  }

  public async downloadAsync(filename: string): Promise<void> {
    // .rel
    this._zip.file("_rels/.rels", XmlConvert.stringify(this.relData));

    // Workbook
    this._zip.file("xl/workbook.xml", XmlConvert.stringify(this.wbData));

    // ContentType
    this._zip.file("[Content_Types].xml", XmlConvert.stringify(this.contentTypeData));

    // Workbook Rel
    this._zip.file("xl/_rels/workbook.xml.rels", XmlConvert.stringify(this.wbRelData));

    // Worksheets
    for (const wsId of Object.keys(this._worksheets)) {
      this._zip.file(`xl/worksheets/sheet${wsId}.xml`, XmlConvert.stringify(this._worksheets[wsId].sheetData));
    }

    const blob = await this._zip.generateAsync({type: "blob"});
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}