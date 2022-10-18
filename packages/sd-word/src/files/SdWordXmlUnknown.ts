import { ISdWordXml } from "../commons";

export class SdWordXmlUnknown implements ISdWordXml {
  public readonly data: Record<string, any>;

  public constructor(data: Record<string, any>) {
    this.data = data;
  }

  public cleanup(): void {
  }
}
