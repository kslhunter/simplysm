import { ISdExcelXml } from "../commons";

export class SdExcelXmlUnknown implements ISdExcelXml{
  public readonly data: Record<string, any>;

  public constructor(data: Record<string, any>) {
    this.data = data;
  }
}
