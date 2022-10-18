import { SdWordZipCache } from "./utils/SdWordZipCache";
import { SdWordXmlDocument } from "./files/SdWordXmlDocument";

export class SdWordBlock {
  public constructor(private readonly _zipCache: SdWordZipCache,
                     private readonly _r: number,
                     private readonly _c: number) {
  }

  public async getValAsync(): Promise<string | undefined> {
    const docData = await this._getDocDataAsync();
    return docData.getBlockText(this._r, this._c);
  }

  public async setValAsync(val: string): Promise<void> {
    const docData = await this._getDocDataAsync();
    return docData.setBlockText(this._r, this._c, val);
  }

  public async removeAsync(): Promise<void> {
    const docData = await this._getDocDataAsync();
    return docData.removeBlock(this._r, this._c);
  }

  private async _getDocDataAsync(): Promise<SdWordXmlDocument> {
    return await this._zipCache.getAsync(`word/document.xml`) as SdWordXmlDocument;
  }
}
