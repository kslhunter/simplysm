import { ISdWordBlockData, ISdWordParaData, ISdWordXml, ISdWordXmlDocumentData } from "../commons";

export class SdWordXmlDocument implements ISdWordXml {
  public readonly data: ISdWordXmlDocumentData;

  public constructor(data?: ISdWordXmlDocumentData) {
    if (data === undefined) {
      this.data = {
        "w:document": {
          "$": {
            "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          }
        }
      };
    }
    else {
      this.data = data;
    }
  }

  public getBlockText(r: number, c: number): string | undefined {
    return this._getBlockData(r, c)?.["w:t"]?.[0];
  }

  public setBlockText(r: number, c: number, text: string): void {
    const blockData = this._getOrCreateBlockData(r, c);
    blockData["w:t"] = [text];
  }

  public createBlock(r: number, c: number): void {
    this._createBlockData(r, c);
  }

  public removeBlock(r: number, c: number): void {
    this._getParaData(r)?.["w:r"]?.splice(c, 1);
  }

  public cleanup(): void {
  }

  private _getParaData(r: number): ISdWordParaData | undefined {
    return this.data["w:document"]["w:body"]?.[0]["w:p"]?.[r];
  }

  private _getBlockData(r: number, c: number): ISdWordBlockData | undefined {
    return this._getParaData(r)?.["w:r"]?.[c];
  }

  private _getOrCreateBlockData(r: number, c: number): ISdWordBlockData {
    const alreadyBlock = this._getBlockData(r, c);
    if (alreadyBlock !== undefined) {
      return alreadyBlock;
    }

    const body = this.data["w:document"]["w:body"] = this.data["w:document"]["w:body"] ?? [{}];
    const paras = body[0]["w:p"] = body[0]["w:p"] ?? [];
    const para = paras[r] = paras[r] ?? {};
    const blocks = para["w:r"] = para["w:r"] ?? [];
    return blocks[c] = blocks[c] ?? {};
  }

  private _createBlockData(r: number, c: number): ISdWordBlockData {
    const body = this.data["w:document"]["w:body"] = this.data["w:document"]["w:body"] ?? [{}];
    const paras = body[0]["w:p"] = body[0]["w:p"] ?? [];
    const para = paras[r] = paras[r] ?? {};
    const blocks = para["w:r"] = para["w:r"] ?? [];

    blocks.insert(c, {});

    return blocks[c];
  }
}
