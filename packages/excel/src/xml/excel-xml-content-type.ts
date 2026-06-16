import type { Bytes } from "@simplysm/core-common";
import { xml as xmlU } from "@simplysm/core-common";
import type { IContentTypeModel } from "../models/i-content-type-model";
import type { ExcelXmlContentTypeData } from "../types";

/**
 * [Content_Types].xml을 관리하는 클래스.
 * 파일별 MIME 타입 정보를 관리한다.
 */
export class ExcelXmlContentType implements IContentTypeModel {
  private readonly _data: ExcelXmlContentTypeData;

  constructor(data?: ExcelXmlContentTypeData) {
    if (data == null) {
      this._data = {
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
      this._data = data;
    }
  }

  /** @internal 테스트·디버그용 내부 트리 접근. 상위 레이어는 인터페이스만 사용. */
  get data(): ExcelXmlContentTypeData {
    return this._data;
  }

  add(partName: string, contentType: string): this {
    // 중복 검사
    const exists = this._data.Types.Override.some((item) => item.$.PartName === partName);
    if (exists) {
      return this;
    }

    this._data.Types.Override.push({
      $: {
        PartName: partName,
        ContentType: contentType,
      },
    });

    return this;
  }

  serialize(): Bytes {
    return new TextEncoder().encode(xmlU.stringify(this._data));
  }
}
