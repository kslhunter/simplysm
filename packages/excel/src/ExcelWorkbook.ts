import * as fs from "fs";
import * as stream from "stream";
import {ExcelWorksheet} from "./ExcelWorksheet";
import {ExcelXmlContentType} from "./XmlFile/ExcelXmlContentType";
import {ExcelXmlGlobalRels} from "./XmlFile/ExcelXmlGlobalRels";
import {ExcelXmlSharedStrings} from "./XmlFile/ExcelXmlSharedStrings";
import {ExcelXmlSheet} from "./XmlFile/ExcelXmlSheet";
import {ExcelXmlStyles} from "./XmlFile/ExcelXmlStyles";
import {ExcelXmlWorkbook} from "./XmlFile/ExcelXmlWorkbook";
import {ExcelXmlWorkbookRels} from "./XmlFile/ExcelXmlWorkbookRels";
import * as JSZip from "jszip";
import {ExcelNumberFormat} from "./ExcelEnums";
import {DateOnly} from "@simplism/core";

export class ExcelWorkbook {
    worksheets: ExcelWorksheet[];

    constructor() {
        this.worksheets = [];
    }

    createWorksheet(name: string): ExcelWorksheet {
        const sheet = new ExcelWorksheet(name);
        this.worksheets.push(sheet);
        return sheet;
    }

    async getBufferAsync(): Promise<Buffer> {
        const preset = {
            sheetNames: this.worksheets.map(item => item.name),
            styles: this.worksheets
                .mapMany(sheet => sheet.cells.mapMany(row => row.map(cell => cell.style)))
                .filter(item => item.hasStyle)
                .distinct(),
            sharedStrings: this.worksheets
                .mapMany(sheet => sheet.cells.mapMany(row => row.filter(item => !item.formula).map(cell => cell.value)))
                .filter(item => typeof item === "string")
                .distinct()
        };

        const zip = new JSZip();
        zip.file("[Content_Types].xml", new ExcelXmlContentType(preset.sheetNames.length).toString());
        zip.file("_rels/.rels", new ExcelXmlGlobalRels().toString());
        zip.file("xl/workbook.xml", new ExcelXmlWorkbook(preset.sheetNames).toString());
        zip.file("xl/_rels/workbook.xml.rels", new ExcelXmlWorkbookRels(preset.sheetNames.length).toString());
        zip.file("xl/styles.xml", new ExcelXmlStyles(preset.styles).toString());
        zip.file(`xl/sharedStrings.xml`, new ExcelXmlSharedStrings(preset.sharedStrings).toString());

        for (let i = 0; i < this.worksheets.length; i++) {
            zip.file(`xl/worksheets/sheet${i + 1}.xml`, new ExcelXmlSheet(this.worksheets[i], preset.sharedStrings, preset.styles).toString());
        }

        return new Buffer(await zip.generateAsync({type: "uint8array"}));
    }

    async getStreamAsync(): Promise<stream.PassThrough> {
        const buffer = await this.getBufferAsync();
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        return bufferStream;
    }

    async saveAsAsync(path: string): Promise<void> {
        const buffer = await this.getBufferAsync();
        const fd = fs.openSync(path, "w");
        fs.writeSync(fd, buffer, 0, buffer.length);
        fs.closeSync(fd);
    }

    static async loadAsync(pathOrBufferOrFile: any): Promise<ExcelWorkbook> {
        let buffer: Buffer;
        if (typeof(pathOrBufferOrFile) === "string") {
            const fd = fs.openSync(pathOrBufferOrFile, "r");
            buffer = new Buffer(fs.fstatSync(fd).size);
            fs.readSync(fd, buffer, 0, buffer.length, 0);
            fs.closeSync(fd);
        }
        else if (pathOrBufferOrFile instanceof Buffer) {
            buffer = pathOrBufferOrFile;
        }
        else {
            buffer = await new Promise<Buffer>(resolve => {
                const fileReader = new FileReader();
                fileReader.onload = function (): void {
                    resolve(new Buffer(this.result));
                };
                fileReader.readAsArrayBuffer(pathOrBufferOrFile);
            });
        }

        const zip = await new JSZip().loadAsync(buffer);
        const sheetNames = (await ExcelXmlWorkbook.parseAsync(await zip.file("xl/workbook.xml").async("text"))).sheetNames;
        const sharedStrings = (await ExcelXmlSharedStrings.parseAsync(await zip.file("xl/sharedStrings.xml").async("text"))).strings;
        const styles = (await ExcelXmlStyles.parseAsync(await zip.file("xl/styles.xml").async("text"))).styles;

        const result = new ExcelWorkbook();
        for (let i = 0; i < sheetNames.length; i++) {
            result.worksheets.push((
                await ExcelXmlSheet.parseAsync(
                    sheetNames[i],
                    await zip.file(`xl/worksheets/sheet${i + 1}.xml`).async("text"),
                    sharedStrings,
                    styles
                )
            ).sheet);
        }
        return result;
    }

    get json(): { [sheet: string]: { [column: string]: any }[] } {
        const result: { [sheet: string]: { [column: string]: any }[] } = {};
        for (const sheet of this.worksheets) {
            result[sheet.name] = [];
            for (let rowIndex = 1; rowIndex < sheet.rowCount; rowIndex++) {
                const rowData: { [column: string]: any } = {};
                for (let colIndex = 0; colIndex < sheet.colCount; colIndex++) {
                    rowData[sheet.cell(0, colIndex).value] = sheet.cell(rowIndex, colIndex).value;
                }
                result[sheet.name].push(rowData);
            }
        }

        return result;
    }

    set json(json: { [sheet: string]: { [column: string]: any }[] }) {
        this.worksheets.clear();

        for (const sheetName of Object.keys(json)) {
            const ws = this.createWorksheet(sheetName);

            const headers: string[] = [];
            for (const item of json[sheetName]) {
                const rowIndex = json[sheetName].indexOf(item) + 1;

                for (const header of Object.keys(item)) {
                    let colIndex = headers.indexOf(header);
                    if (colIndex < 0) {
                        colIndex = headers.length;
                        headers.push(header);
                    }

                    const cell = ws.cell(rowIndex, colIndex);

                    const value = item[header];
                    cell.value = value;
                    if (value instanceof Date) {
                        cell.style.numberFormat = ExcelNumberFormat.DateTime;
                    }
                    else if (value instanceof DateOnly) {
                        cell.style.numberFormat = ExcelNumberFormat.DateOnly;
                    }
                }
            }
            for (let i = 0; i < headers.length; i++) {
                ws.cell(0, i).value = headers[i];
            }
        }
    }
}