export class ExcelXmlWorkbookRels {
    public constructor(private _sheetLength: number) {
    }

    public toString(): string {
        let sheetElements = "";
        for (let i = 0; i < this._sheetLength; i++) {
            sheetElements += `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`;
        }

        return `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    ${sheetElements}
    <Relationship Id="rId${sheetElements.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
    <Relationship Id="rId${sheetElements.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`.replace(/[\r\n]/g, "").replace(/\s\s+/g, " ").replace(/>\s</g, "><");
    }
}