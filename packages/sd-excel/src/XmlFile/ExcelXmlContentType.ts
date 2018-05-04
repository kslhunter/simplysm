export class ExcelXmlContentType {
  private readonly _sheetLength: number;

  public constructor(sheetLength: number) {
    this._sheetLength = sheetLength;
  }

  public toString(): string {
    let sheetElements = "";
    for (let i = 0; i < this._sheetLength; i++) {
      sheetElements += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    }

    return `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
    ${sheetElements}
</Types>`.replace(/[\r\n]/g, "").replace(/\s\s+/g, " ").replace(/>\s</g, "><");
  }
}
