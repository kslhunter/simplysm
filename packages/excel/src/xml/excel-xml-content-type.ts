import type { ExcelXml, ExcelXmlContentTypeData } from "../types";

/**
 * Class managing [Content_Types].xml.
 * Manages MIME type information per file.
 */
export class ExcelXmlContentType implements ExcelXml {
  data: ExcelXmlContentTypeData;

  constructor(data?: ExcelXmlContentTypeData) {
    if (data == null) {
      this.data = {
        Types: {
          $: {
            xmlns: "http://schemas.openxmlformats.org/package/2006/content-types",
          },
          Default: [
            {
              $: {
                Extension: "rels",
                ContentType: "application/vnd.openxmlformats-package.relationships+xml",
              },
            },
            {
              $: {
                Extension: "xml",
                ContentType: "application/xml",
              },
            },
          ],
          Override: [
            {
              $: {
                PartName: "/xl/workbook.xml",
                ContentType:
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
              },
            },
          ],
        },
      };
    } else {
      this.data = data;
    }
  }

  add(partName: string, contentType: string): this {
    // Duplicate check
    const exists = this.data.Types.Override.some((item) => item.$.PartName === partName);
    if (exists) {
      return this;
    }

    this.data.Types.Override.push({
      $: {
        PartName: partName,
        ContentType: contentType,
      },
    });

    return this;
  }

  cleanup(): void {}
}
