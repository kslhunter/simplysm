import * as XML from "xml2js";

export class ExcelXmlWorkbook {
    public constructor(public sheetNames: string[]) {
    }

    public toString(): string {
        const sheetElements = this.sheetNames.map((item, index) => `<sheet name="${item}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`);

        return `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>${sheetElements.join("")}</sheets>
</workbook>`.replace(/[\r\n]/g, "").replace(/\s\s+/g, " ").replace(/>\s</g, "><");
    }

    public static async parseAsync(xmlString: string): Promise<ExcelXmlWorkbook> {
        return new Promise<any>((resolve, reject) => {
            XML.parseString(xmlString, (err, parsed) => {
                if (err) {
                    reject(err);
                    return;
                }
                const sheetNames = parsed.workbook.sheets[0].sheet.map((item: any) => item.$.name);
                resolve(new ExcelXmlWorkbook(sheetNames));
            });
        });
    }
}