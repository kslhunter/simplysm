import type { ISdExcelXml, ISdExcelXmlContentTypeData } from "../types";

export class SdExcelXmlContentType implements ISdExcelXml {
  data: ISdExcelXmlContentTypeData;

  constructor(data?: ISdExcelXmlContentTypeData) {
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
    this.data.Types.Override.push({
      $: {
        PartName: partName,
        ContentType: contentType,
      },
    });

    return this;
  }

  cleanup() {}
}
