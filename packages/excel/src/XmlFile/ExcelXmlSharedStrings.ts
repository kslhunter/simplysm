import * as XML from "xml2js";

export class ExcelXmlSharedStrings {
    constructor(public strings: string[]) {
    }

    toString(): string {
        const sharedStringElements = this.strings.map(item => `<si><t>${item}</t></si>`).join("");

        let result = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
        result += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`;
        result += sharedStringElements;
        result += "</sst>";
        return result;
    }

    static async parseAsync(xmlString: string): Promise<ExcelXmlSharedStrings> {
        return new Promise<any>((resolve, reject) => {
            XML.parseString(xmlString, (err: any, parsed: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (parsed.sst.si) {
                    const strings = parsed.sst.si.map((item: any) => {
                        if (item.t) {
                            return item.t.join("");
                        }
                        else {
                            return item.r.map((r: any) => r.t.join("")).join("");
                        }
                    });
                    resolve(new ExcelXmlSharedStrings(strings));
                } else {
                    resolve(new ExcelXmlSharedStrings([]));
                }
            });
        });
    }
}