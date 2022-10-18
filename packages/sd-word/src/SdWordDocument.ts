import JSZip from "jszip";
import { SdWordZipCache } from "./utils/SdWordZipCache";
import { SdWordXmlDocument } from "./files/SdWordXmlDocument";
import { SdWordXmlContentType } from "./files/SdWordXmlContentType";
import { SdWordXmlRelationship } from "./files/SdWordXmlRelationship";
import { SdWordParagraph } from "./SdWordParagraph";

export class SdWordDocument {
  private constructor(private readonly _zipCache: SdWordZipCache) {
  }

  public static async loadAsync(arg: Buffer | Blob): Promise<SdWordDocument> {
    const zip = await new JSZip().loadAsync(arg);
    const fileCache = new SdWordZipCache(zip);
    return new SdWordDocument(fileCache);
  }

  public static create(): SdWordDocument {
    const fileCache = new SdWordZipCache();

    //-- Global ContentTypes
    const typeXml = new SdWordXmlContentType();
    fileCache.set("[Content_Types].xml", typeXml);

    //-- Global Rels
    fileCache.set(
      "_rels/.rels",
      new SdWordXmlRelationship()
        .add(
          "word/document.xml",
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
        )
    );

    //-- Document
    const docXml = new SdWordXmlDocument();
    fileCache.set("word/document.xml", docXml);


    //-- Document Rels
    const docRelXml = new SdWordXmlRelationship();
    fileCache.set("word/_rels/document.xml.rels", docRelXml);

    return new SdWordDocument(fileCache);
  }

  public paragraph(r: number): SdWordParagraph {
    return new SdWordParagraph(this._zipCache, r);
  }

  public async getBufferAsync(): Promise<Buffer> {
    return await this._zipCache.getZip().generateAsync({ type: "nodebuffer" });
  }

  public async getBlobAsync(): Promise<Blob> {
    return await this._zipCache.getZip().generateAsync({ type: "blob" });
  }
}
