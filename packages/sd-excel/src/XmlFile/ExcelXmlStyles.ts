import * as XML from "xml2js";
import {ExcelCellStyle} from "../ExcelCellStyle";
import {ExcelCellStyleFontWeight} from "../ExcelEnums";

export class ExcelXmlStyles {
  public constructor(public styles: ExcelCellStyle[]) {
  }

  public toString(): string {
    const fonts = this.styles.map((item) => ({
      color: item.color,
      fontWeight: item.fontWeight
    })).filter((item) => !!item.color || !!item.fontWeight).distinct();
    const fontElements = fonts
      .map((item) => `<font>${item.fontWeight && item.fontWeight === ExcelCellStyleFontWeight.Bold ? "<b/>" : ""}${item.color ? `<color rgb="${item.color.replace("#", "FF")}"/>` : ""}</font>`)
      .join("\n        ");

    const backgrounds = this.styles.map((item) => item.background).distinct().filter((item) => item).map((item) => item!);
    const fillElements = backgrounds
      .map((item) => `<fill><patternFill patternType="solid"><fgColor rgb="${item.replace("#", "FF")}" /></patternFill></fill>`)
      .join("\n        ");

    const borders = this.styles.map((item) => item.borderColor).distinct().filter((item) => item).map((item) => item!);
    const borderElements = borders
      .map((item) => `
<border>
  <left style="thin">
    <color rgb="${item.replace("#", "FF")}"/>
  </left>
  <right style="thin">
    <color rgb="${item.replace("#", "FF")}"/>
  </right>
  <top style="thin">
    <color rgb="${item.replace("#", "FF")}"/>
  </top>
  <bottom style="thin">
    <color rgb="${item.replace("#", "FF")}"/>
  </bottom>
  <diagonal />
</border>`);

    const xfElements = this.styles
      .map((item) => {
        const fontId = (item.color || item.fontWeight)
          ? fonts.indexOf(fonts.single((item1) => item1.color === item.color && item1.fontWeight === item.fontWeight)!) + 1
          : 0;
        const fillId = item.background ? backgrounds.indexOf(item.background) + 2 : 0;
        const alignmentElement = (item.textAlign || item.verticalAlign || item.wrapText)
          ? `<alignment${item.wrapText ? ' wrapText="1"' : ""}${item.textAlign ? ` horizontal="${item.textAlign}"` : ""}${item.verticalAlign ? ` vertical="${item.verticalAlign }"` : ""}/>`
          : "";
        const borderId = item.borderColor ? borders.indexOf(item.borderColor) + 1 : 0;

        return `<xf numFmtId="${Number(item.numberFormat)}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}">${alignmentElement}</xf>`;
      })
      .join("\n        ");

    return `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <numFmts>
        <numFmt numFmtId="178" formatCode="&quot;₩&quot;#,##0"/>
    </numFmts>
    <fonts>
        <font/>
        ${fontElements}
    </fonts>
    <fills>
        <fill>
            <patternFill patternType="none" />
        </fill>
        <fill>
            <patternFill patternType="gray125" />
        </fill>
        ${fillElements}
    </fills>
    <borders>
        <border>
            <left/>
            <right/>
            <top/>
            <bottom/>
            <diagonal/>
        </border>
        ${borderElements}
    </borders>
    <cellXfs>
        <xf fontId="0"/>
        ${xfElements}
    </cellXfs>
</styleSheet>`.replace(/[\r\n]/g, "").replace(/\s\s+/g, " ").replace(/>\s</g, "><");
  }

  public static async parseAsync(xmlString: string): Promise<ExcelXmlStyles> {
    return new Promise<any>((resolve, reject) => {
      XML.parseString(xmlString, (err, parsed) => {
        if (err) {
          reject(err);
          return;
        }
        const fonts = parsed.styleSheet.fonts[0].font.map((item: any) => ({
          color: item.color ? item.color[0].$.rgb : undefined,
          isBold: !!item.b
        }));
        const fills = parsed.styleSheet.fills[0].fill.map((item: any) => item.patternFill[0]).map((item: any) => ({
          background: item.fgColor ? item.fgColor[0].$.rgb : undefined
        }));
        const borders = parsed.styleSheet.borders[0].border.map((item: any) => item.top[0]).map((item: any) => ({
          borderColor: item.color ? item.color[0].$.rgb : undefined
        }));

        const styles = parsed.styleSheet.cellXfs[0].xf.map((item: any) => {
          const result = new ExcelCellStyle();

          const font = fonts[Number.parseInt(item.$.fontId)];
          if (font && font.color) {
            result.color = `#${font.color.substr(2, 6)}`;
          }
          if (font && font.isBold) {
            result.fontWeight = ExcelCellStyleFontWeight.Bold;
          }

          const fill = fills[Number.parseInt(item.$.fillId)];
          if (fill && fill.background) {
            result.background = `#${fill.background.substr(2, 6)}`;
          }

          if (item.alignment && item.alignment[0].$.horizontal) {
            result.textAlign = item.alignment[0].$.horizontal;
          }

          if (item.alignment && item.alignment[0].$.vertical) {
            result.verticalAlign = item.alignment[0].$.vertical;
          }

          const border = borders[Number.parseInt(item.$.borderId)];
          if (border && border.borderColor) {
            result.borderColor = `#${border.borderColor.substr(2, 6)}`;
          }

          result.numberFormat = item.$.numFmtId;

          return result;
        });
        resolve(new ExcelXmlStyles(styles));
      });
    });
  }
}