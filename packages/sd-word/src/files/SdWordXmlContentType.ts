import { ISdWordXml, ISdWordXmlContentTypeData } from "../commons";

export class SdWordXmlContentType implements ISdWordXml {
  public readonly data: ISdWordXmlContentTypeData;

  public constructor(data?: ISdWordXmlContentTypeData) {
    if (data === undefined) {
      this.data = {
        "Types": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/package/2006/content-types"
          },
          "Default": [
            {
              "$": {
                "Extension": "rels",
                "ContentType": "application/vnd.openxmlformats-package.relationships+xml"
              }
            },
            {
              "$": {
                "Extension": "xml",
                "ContentType": "application/xml"
              }
            }
          ],
          "Override": [
            {
              "$": {
                "PartName": "/word/document.xml",
                "ContentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
              }
            }
          ]
        }
      };
    }
    else {
      this.data = data;
    }
  }

  public add(partName: string, contentType: string): this {
    this.data.Types.Override.push({
      "$": {
        "PartName": partName,
        "ContentType": contentType
      }
    });

    return this;
  }

  public cleanup(): void {
  }
}
