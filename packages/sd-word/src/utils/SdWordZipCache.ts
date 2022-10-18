import { ISdWordXml } from "../commons";
import { XmlConvert } from "./XmlConvert";
import JSZip from "jszip";
import { SdWordXmlUnknown } from "../files/SdWordXmlUnknown";
import { SdWordXmlDocument } from "../files/SdWordXmlDocument";

export class SdWordZipCache {
  private readonly _cache = new Map<string, ISdWordXml | Buffer>();

  public constructor(private readonly _zip: JSZip = new JSZip()) {
  }

  public keys(): IterableIterator<string> {
    return this._cache.keys();
  }

  public async getAsync(filePath: string): Promise<ISdWordXml | Buffer | undefined> {
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath)!;
    }

    const file = this._zip.file(filePath);
    if (!file) {
      return undefined;
    }

    if (filePath.endsWith(".xml") || filePath.endsWith(".rels")) {
      const xml = await XmlConvert.parseAsync(await file.async("text"), { stripPrefix: false });
      if (filePath.endsWith("word/document.xml")) {
        this._cache.set(filePath, new SdWordXmlDocument(xml));
      }
      else {
        this._cache.set(filePath, new SdWordXmlUnknown(xml));
      }
    }
    else {
      const buffer = await file.async("nodebuffer");
      this._cache.set(filePath, buffer);
    }

    return this._cache.get(filePath);
  }

  public set(filePath: string, content: ISdWordXml | Buffer): void {
    this._cache.set(filePath, content);
  }

  public getZip(): JSZip {
    for (const filePath of this._cache.keys()) {
      const content = this._cache.get(filePath)!;
      if (content instanceof Buffer) {
        this._zip.file(filePath, content);
      }
      else {
        content.cleanup();
        this._zip.file(filePath, XmlConvert.stringify(content.data));
      }
    }

    return this._zip;
  }
}
