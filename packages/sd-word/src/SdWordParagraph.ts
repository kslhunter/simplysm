import { SdWordZipCache } from "./utils/SdWordZipCache";
import { SdWordBlock } from "./SdWordBlock";
import { SdWordXmlDocument } from "./files/SdWordXmlDocument";

export class SdWordParagraph {
  public constructor(private readonly _zipCache: SdWordZipCache,
                     private readonly _r: number) {
  }

  public block(c: number): SdWordBlock {
    return new SdWordBlock(this._zipCache, this._r, c);
  }

  public async createBlockAsync(c: number, val: string): Promise<SdWordBlock> {
    const docData = await this._getDocDataAsync();
    docData.createBlock(this._r, c);
    const block = new SdWordBlock(this._zipCache, this._r, c);
    await block.setValAsync(val);
    return block;
  }

  public async removeBlockAsync(c: number): Promise<void> {
    await this.block(c).removeAsync();
  }

  private async _getDocDataAsync(): Promise<SdWordXmlDocument> {
    return await this._zipCache.getAsync(`word/document.xml`) as SdWordXmlDocument;
  }
}
