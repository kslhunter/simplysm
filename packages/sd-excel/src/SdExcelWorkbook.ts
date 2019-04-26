import { SdExcelWorksheet } from "./SdExcelWorksheet";
import * as JSZip from "jszip";
import { XmlConvert } from "@simplysm/sd-common";

export class SdExcelWorkbook {
  private readonly _worksheets: SdExcelWorksheet[] = [];
  private _zip!: JSZip;
  private _relData: any;
  private _wbData: any;
  private _contentTypeData: any;
  private _wbRelData: any;
  public sstData: any;
  public stylesData: any;

  public static create(): SdExcelWorkbook {
    const wb = new SdExcelWorkbook();

    wb._zip = new JSZip();

    // .rel
    wb._relData = {
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
    wb._wbData = {
      workbook: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
        }
      }
    };

    // ContentType
    wb._contentTypeData = {
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
          },
          {
            $: {
              PartName: "/xl/sharedStrings.xml",
              ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"
            }
          },
          {
            $: {
              PartName: "/xl/styles.xml",
              ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"
            }
          }
        ]
      }
    };

    // Workbook Rel
    wb._wbRelData = {
      Relationships: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/package/2006/relationships"
        },
        Relationship: [
          {
            $: {
              Id: "rId1",
              Type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
              Target: "sharedStrings.xml"
            }
          },
          {
            $: {
              Id: "rId2",
              Type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
              Target: "styles.xml"
            }
          }
        ]
      }
    };

    // SharedStrings
    wb.sstData = {
      sst: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        }
      }
    };

    // Styles
    wb.stylesData = {
      styleSheet: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        },
        fonts: [
          {
            font: [{}]
          }
        ],
        fills: [
          {
            fill: [{ patternFill: [{ $: { patternType: "none" } }] }, { patternFill: [{ $: { patternType: "none" } }] }]
          }
        ],
        borders: [
          {
            border: [{}]
          }
        ],
        cellXfs: [
          {
            xf: [{}]
          }
        ]
      }
    };

    return wb;
  }

  public static async loadAsync(buffer: Buffer): Promise<SdExcelWorkbook>;
  public static async loadAsync(file: File): Promise<SdExcelWorkbook>;
  public static async loadAsync(blob: Blob): Promise<SdExcelWorkbook>;
  public static async loadAsync(arg: Buffer | Blob | File): Promise<SdExcelWorkbook> {
    let buffer: Buffer | Blob;
    if (arg instanceof File) {
      buffer = await new Promise<Buffer>(resolve => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
          resolve(Buffer.from(fileReader.result as ArrayBuffer));
        };
        fileReader.readAsArrayBuffer(arg);
      });
    } else {
      buffer = arg;
    }

    const wb = new SdExcelWorkbook();

    const zip = await new JSZip().loadAsync(buffer);
    wb._zip = zip;

    // .rel
    wb._relData = await XmlConvert.parseAsync(await zip.file("_rels/.rels").async("text"));

    // Workbook
    wb._wbData = await XmlConvert.parseAsync(await zip.file("xl/workbook.xml").async("text"));

    // ContentType
    wb._contentTypeData = await XmlConvert.parseAsync(await zip.file("[Content_Types].xml").async("text"));

    // Workbook Rel
    wb._wbRelData = await XmlConvert.parseAsync(await zip.file("xl/_rels/workbook.xml.rels").async("text"));

    // Worksheets
    const worksheets = wb._wbData.workbook.sheets[0].sheet.map((item: any) => ({
      rid: item.$["r:id"],
      name: item.$.name
    }));
    for (const item of worksheets) {
      const r = wb._wbRelData.Relationships.Relationship.single((item1: any) => item1.$.Id === item.rid);
      const sheetData = await XmlConvert.parseAsync(await zip.file(`xl/${r.$.Target}`).async("text"));
      const id = Number(r.$.Target.match(/\/sheet(.*)\./)[1]);
      wb._worksheets[id] = new SdExcelWorksheet(wb, item.name, sheetData);
    }

    // SharedStrings
    wb.sstData = await XmlConvert.parseAsync(await zip.file("xl/sharedStrings.xml").async("text"));

    // Styles
    wb.stylesData = await XmlConvert.parseAsync(await zip.file("xl/styles.xml").async("text"));

    return wb;
  }

  public getWorksheet(name: string): SdExcelWorksheet {
    const ws = this._worksheets.single(item => item.name === name);
    if (!ws) {
      throw new Error(`시트[${name}]가 존재하지 않습니다.`);
    }
    return ws;
  }

  public createWorksheet(name: string): SdExcelWorksheet {
    // Workbook
    this._wbData.workbook.sheets = this._wbData.workbook.sheets || [{}];
    this._wbData.workbook.sheets[0].sheet = this._wbData.workbook.sheets[0].sheet || [];
    const lastSheetId = this._wbData.workbook.sheets[0].sheet.max((item: any) => Number(item.$.sheetId)) || 0;
    const newSheetId = lastSheetId + 1;

    this._wbData.workbook.sheets[0].sheet.push({
      $: {
        name,
        sheetId: newSheetId,
        "r:id": `rId${newSheetId}`
      }
    });

    // ContentType
    this._contentTypeData.Types.Override.push({
      $: {
        PartName: `/xl/worksheets/sheet${newSheetId}.xml`,
        ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
      }
    });

    // Workbook Rel
    this._wbRelData.Relationships.Relationship = this._wbRelData.Relationships.Relationship || [];
    const sheetRelationships = this._wbRelData.Relationships.Relationship.filter(
      (item: any) => item.$.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
    );
    sheetRelationships.push({
      $: {
        Id: `rId${newSheetId}`,
        Type: `http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`,
        Target: `worksheets/sheet${newSheetId}.xml`
      }
    });

    const nonSheetRelationships = this._wbRelData.Relationships.Relationship.filter(
      (item: any) => item.$.Type !== "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
    );
    let cnt = newSheetId + 1;
    for (const nonSheetRelationship of nonSheetRelationships) {
      nonSheetRelationship.$.Id = "rId" + cnt;
      cnt++;
    }

    this._wbRelData.Relationships.Relationship = sheetRelationships.concat(nonSheetRelationships);

    // Worksheets
    const sheetData = {
      worksheet: {
        $: {
          xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        },
        cols: [],
        sheetData: [{}]
      }
    };
    this._worksheets[newSheetId] = new SdExcelWorksheet(this, name, sheetData);
    return this._worksheets[newSheetId];
  }

  public async downloadAsync(filename: string): Promise<void> {
    // .rel
    this._zip.file("_rels/.rels", XmlConvert.stringify(this._relData));

    // Workbook
    this._zip.file("xl/workbook.xml", XmlConvert.stringify(this._wbData));

    // ContentType
    this._zip.file("[Content_Types].xml", XmlConvert.stringify(this._contentTypeData));

    // Workbook Rel
    this._zip.file("xl/_rels/workbook.xml.rels", XmlConvert.stringify(this._wbRelData));

    // Worksheets
    for (const wsId of Object.keys(this._worksheets)) {
      this._zip.file(`xl/worksheets/sheet${wsId}.xml`, XmlConvert.stringify(this._worksheets[wsId].sheetData));
    }

    // SharedStrings
    this._zip.file("xl/sharedStrings.xml", XmlConvert.stringify(this.sstData));

    // Styles
    this._zip.file("xl/styles.xml", XmlConvert.stringify(this.stylesData));

    const blob = await this._zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  public get json(): { [sheetName: string]: { [key: string]: any }[] } {
    const result: { [sheetName: string]: { [key: string]: any }[] } = {};

    for (const sheet of this._worksheets.filterExists()) {
      const sheetData = [];
      for (let r = 1; r < sheet.rowLength; r++) {
        const data = {};
        for (let c = 0; c < sheet.row(r).columnLength; c++) {
          const header = sheet.cell(0, c).value;
          if (header) {
            data[header] = sheet.cell(r, c).value;
          }
        }
        sheetData.push(data);
      }
      result[sheet.name] = sheetData;
    }

    return result;
  }

  public set json(data: { [sheetName: string]: { [key: string]: any }[] }) {
    for (const sheetName of Object.keys(data)) {
      let sheet = this._worksheets.single(item => item.name === sheetName);
      if (!sheet) {
        // new sheet
        sheet = this.createWorksheet(sheetName);
      } else {
        // clear
        for (let r = 0; r < sheet.rowLength; r++) {
          for (let c = 0; c < sheet.row(r).columnLength; c++) {
            sheet.cell(r, c).value = undefined;
          }
        }
      }

      const rowItems: any[] = data[sheetName];
      // const headerColumnIndexMap = rowItems.mapMany(item => Object.keys(item)).distinct()
      //   .toMap(item => item, (item, index) => index);
      const headerColumns = rowItems.mapMany(item =>
        Object.keys(item).map((item1, i) => [item1, i] as [string, number])
      );
      const headerColumnIndexMap = new Map<string, number>();
      for (const headerColumn of headerColumns) {
        headerColumnIndexMap.set(
          headerColumn[0],
          headerColumnIndexMap.has(headerColumn[0])
            ? Math.max(headerColumnIndexMap.get(headerColumn[0])!, headerColumn[1])
            : headerColumn[1]
        );
      }

      for (const colName of Array.from(headerColumnIndexMap.keys())) {
        const c = headerColumnIndexMap.get(colName)!;
        sheet.cell(0, c).value = colName;
      }

      for (let r = 0; r < rowItems.length; r++) {
        const rowItem = rowItems[r];
        for (const colName of Object.keys(rowItem)) {
          const c = headerColumnIndexMap.get(colName)!;
          sheet.cell(r + 1, c).value = rowItem[colName];
        }
      }
    }
  }
}
