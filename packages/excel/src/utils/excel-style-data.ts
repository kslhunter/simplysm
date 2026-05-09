import type { ZipCache } from "./zip-cache";
import { ExcelXmlContentType } from "../xml/excel-xml-content-type";
import { ExcelXmlRelationship } from "../xml/excel-xml-relationship";
import { ExcelXmlStyle } from "../xml/excel-xml-style";

/**
 * `xl/styles.xml` 을 가져오거나, 없으면 새로 만들어 ZipCache 에 등록한다.
 * Content_Types / workbook.xml.rels 에도 styles.xml 항목을 추가한다.
 *
 * `ExcelCell.setStyle` 과 `ExcelWorkbook.setDefaultStyle` 양쪽이 공유한다.
 */
export async function getOrCreateStyleData(zipCache: ZipCache): Promise<ExcelXmlStyle> {
  let styleData = (await zipCache.get("xl/styles.xml")) as ExcelXmlStyle | undefined;
  if (styleData == null) {
    styleData = new ExcelXmlStyle();
    zipCache.set("xl/styles.xml", styleData);

    const typeData = (await zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
    typeData.add(
      "/xl/styles.xml",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
    );

    const wbRelData = (await zipCache.get("xl/_rels/workbook.xml.rels")) as ExcelXmlRelationship;
    wbRelData.add(
      "styles.xml",
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
    );
  }
  return styleData;
}
