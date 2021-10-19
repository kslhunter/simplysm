import { SdExcelWorksheet } from "./SdExcelWorksheet";
import * as JSZip from "jszip";
import { XmlConvert } from "./utils/XmlConvert";

export class SdExcelWorkbook {
  private readonly _worksheets: SdExcelWorksheet[] = [];
  private _zip!: JSZip;
  private _relData: any;
  private _wbData: any;
  public contentTypeData: any;
  private _wbRelData: any;
  public sstData: any;
  public stylesData: any;
  public drawingData: any;
  public medias!: {
    name: string;
    buffer: Buffer;
  }[];

  public get worksheetNames(): string[] {
    return this._worksheets.map((item) => item.name);
  }

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
        numFmts: [{
          numFmt: []
        }],
        fonts: [{
          font: [{}]
        }],
        fills: [{
          fill: [
            { patternFill: [{ $: { patternType: "none" } }] },
            { patternFill: [{ $: { patternType: "none" } }] }
          ]
        }],
        borders: [{
          border: [{}]
        }],
        cellXfs: [{
          xf: [{}]
        }]
      }
    };

    // Drawing
    wb.drawingData = undefined;

    wb.medias = [];

    return wb;
  }

  public static async loadAsync(arg: Buffer | Blob): Promise<SdExcelWorkbook> {
    const wb = new SdExcelWorkbook();

    const zip = await new JSZip().loadAsync(arg);
    wb._zip = zip;

    // .rel
    wb._relData = await XmlConvert.parseAsync(await zip.file("_rels/.rels")!.async("text"), { stripPrefix: true });

    // Workbook
    wb._wbData = await XmlConvert.parseAsync(await zip.file("xl/workbook.xml")!.async("text"), { stripPrefix: true });

    // ContentType
    wb.contentTypeData = await XmlConvert.parseAsync(await zip.file("[Content_Types].xml")!.async("text"), { stripPrefix: true });

    // Workbook Rel
    wb._wbRelData = await XmlConvert.parseAsync(await zip.file("xl/_rels/workbook.xml.rels")!.async("text"), { stripPrefix: true });

    // Worksheets
    const worksheets = wb._wbData.workbook?.sheets[0].sheet.map((item) => ({
      rid: item.$["r:id"],
      name: item.$.name
    }));
    for (const item of worksheets) {
      const r = wb._wbRelData.Relationships.Relationship.single((item1) => item1.$.Id === item.rid);
      const id = Number(r.$.Target.match(/\/sheet(.*)\./)[1]);

      const sheetData = await XmlConvert.parseAsync(await zip.file(`xl/${r.$.Target as string}`)!.async("text"), { stripPrefix: true });
      wb._worksheets[id] = new SdExcelWorksheet(wb, item.name, sheetData);

      // Drawing
      if (zip.file(`xl/worksheets/_rels/sheet${id}.xml.rels`)) {
        const wsRelData = await XmlConvert.parseAsync(await zip.file(`xl/worksheets/_rels/sheet${id}.xml.rels`)!.async("text"), { stripPrefix: true });
        wb._worksheets[id].relData = wsRelData;

        const drawingRelationship = wsRelData.Relationships.Relationship.single((item1) => (/drawing[0-9]/).test(item1.$.Target));
        if (drawingRelationship !== undefined) {
          // drawing rel
          const drawingRelFile = zip.file(`xl/drawings/_rels/drawing1.xml.rels`);
          if (drawingRelFile) {
            wb._worksheets[id].drawingRelData = await XmlConvert.parseAsync(await drawingRelFile.async("text"), { stripPrefix: true });
          }
          else {
            wb._worksheets[id].drawingRelData = {};
          }
          // wb._worksheets[id].drawingRelData = await XmlConvert.parseAsync(await zip.file(`xl/drawings/_rels/drawing1.xml.rels`).async("text"));

          // drawing
          wb._worksheets[id].drawingData = await XmlConvert.parseAsync(await zip.file(`xl/drawings/drawing1.xml`)!.async("text"), { stripPrefix: true });
        }
      }
    }

    // SharedStrings
    wb.sstData = await XmlConvert.parseAsync(await zip.file("xl/sharedStrings.xml")!.async("text"), { stripPrefix: true });

    // Styles
    const stylesFile = zip.file("xl/styles.xml");
    wb.stylesData = stylesFile ? await XmlConvert.parseAsync(await stylesFile.async("text"), { stripPrefix: true }) : undefined;

    wb.medias = [];
    const mediaFiles = Object.keys(zip.files).map((key) => zip.files[key]).filter((item) => item.name.startsWith("xl/media"));
    for (const key of Object.keys(mediaFiles)) {
      wb.medias.push({
        name: mediaFiles[key].name,
        buffer: await mediaFiles[key].async("nodebuffer")
      });
    }

    return wb;
  }

  public getWorksheet(index: number): SdExcelWorksheet;
  public getWorksheet(name: string): SdExcelWorksheet;
  public getWorksheet(arg: string | number): SdExcelWorksheet {
    if (typeof arg === "string") {
      const ws = this._worksheets.single((item) => item.name === arg);
      if (!ws) {
        throw new Error(`시트[${arg}]가 존재하지 않습니다.`);
      }
      return ws;
    }
    else {
      if (typeof this._worksheets[arg + 1] === "undefined") {
        throw new Error(`시트[${arg}]가 존재하지 않습니다.`);
      }
      return this._worksheets[arg + 1];
    }
  }

  public createWorksheet(name: string): SdExcelWorksheet {
    const replacedName = name.replace(/[:\\/?*[]']/g, "_");

    // Workbook
    this._wbData.workbook.sheets = this._wbData.workbook.sheets ?? [{}];
    this._wbData.workbook.sheets[0].sheet = this._wbData.workbook.sheets[0].sheet ?? [];
    const lastSheetId: number = this._wbData.workbook.sheets[0].sheet.max((item) => Number(item.$.sheetId)) ?? 0;
    const newSheetId = lastSheetId + 1;

    this._wbData.workbook.sheets[0].sheet.push({
      $: {
        "name": replacedName,
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
    this._wbRelData.Relationships.Relationship = this._wbRelData.Relationships.Relationship ?? [];
    const sheetRelationships = this._wbRelData.Relationships.Relationship.filter((item) => item.$.Type === "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet");
    sheetRelationships.push({
      $: {
        Id: `rId${newSheetId}`,
        Type: `http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`,
        Target: `worksheets/sheet${newSheetId}.xml`
      }
    });

    const nonSheetRelationships = this._wbRelData.Relationships.Relationship.filter((item) => item.$.Type !== "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet");
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
          "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
        },
        cols: [],
        sheetData: [{}]
      }
    };

    this._worksheets[newSheetId] = new SdExcelWorksheet(this, replacedName, sheetData);
    return this._worksheets[newSheetId];
  }

  public async getBlobAsync(progressCb?: (prog: { percent: number; currentFile: string }) => void): Promise<Blob> {
    this._writeZipObject();
    return await this._zip.generateAsync({ type: "blob" }, (metadata) => {
      if (progressCb) {
        progressCb(metadata);
      }
    });
  }

  public async getBufferAsync(progressCb?: (prog: { percent: number; currentFile: string }) => void): Promise<Buffer> {
    this._writeZipObject();
    return await this._zip.generateAsync({ type: "nodebuffer" }, (metadata) => {
      if (progressCb) {
        progressCb(metadata);
      }
    });
  }

  private _writeZipObject(): void {
    // .rel
    this._zip.file("_rels/.rels", XmlConvert.stringify(this._relData));

    // Workbook
    this._zip.file("xl/workbook.xml", XmlConvert.stringify(this._wbData));

    // ContentType
    this._zip.file("[Content_Types].xml", XmlConvert.stringify(this.contentTypeData));

    // Workbook Rel
    this._zip.file("xl/_rels/workbook.xml.rels", XmlConvert.stringify(this._wbRelData));

    // Worksheets
    for (const wsId of Object.keys(this._worksheets)) {
      this._zip.file(`xl/worksheets/sheet${wsId}.xml`, XmlConvert.stringify(this._worksheets[wsId].sheetData));

      if (this._worksheets[wsId].relData !== undefined) {
        this._zip.file(`xl/worksheets/_rels/sheet${wsId}.xml.rels`, XmlConvert.stringify(this._worksheets[wsId].relData));

        const drawingRel = this._worksheets[wsId].relData.Relationships.Relationship.single((item1) => item1.$.Target.includes("drawing1"));
        if (drawingRel !== undefined) {
          this._zip.file(`xl/drawings/_rels/drawing1.xml.rels`, XmlConvert.stringify(this._worksheets[wsId].drawingRelData));
          this._zip.file(`xl/drawings/drawing1.xml`, XmlConvert.stringify(this._worksheets[wsId].drawingData));
        }
      }
    }

    // SharedStrings
    this._zip.file(
      "xl/sharedStrings.xml",
      XmlConvert.stringify(this.sstData)
        .replace(/&#xD;/g, "\r")
        .replace(/<t xml:space="preserve"\/>/g, "<t xml:space=\"preserve\"> </t>")
    );

    // Styles
    this._zip.file("xl/styles.xml", XmlConvert.stringify(this.stylesData));

    // Medias
    for (const media of this.medias) {
      this._zip.file(media.name, media.buffer);
    }
  }

  public get json(): Record<string, Record<string, any>[]> {
    const result: Record<string, Record<string, any>[]> = {};

    for (const sheet of this._worksheets.filterExists()) {
      const sheetData: Record<string, any>[] = [];
      for (let r = 1; r < sheet.rowLength; r++) {
        const data: Record<string, any> = {};
        for (let c = 0; c < sheet.row(r).columnLength; c++) {
          const header = sheet.cell(0, c).value;
          if (header !== undefined) {
            data[header] = sheet.cell(r, c).value;
          }
        }
        sheetData.push(data);
      }
      result[sheet.name] = sheetData;
    }

    return result;
  }

  public set json(data: Record<string, Record<string, any>[]>) {
    for (const sheetName of Object.keys(data)) {
      let sheet = this._worksheets.single((item) => item.name === sheetName);
      if (!sheet) {
        // new sheet
        sheet = this.createWorksheet(sheetName);
      }
      else {
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
      const headerColumns = rowItems.mapMany((item) => Object.keys(item).map((item1, i) => [item1, i] as [string, number]));
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
