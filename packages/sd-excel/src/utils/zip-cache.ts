import { ISdExcelXml } from "../types";
import { XmlConvert } from "./xml-convert";
import { SdExcelXmlRelationShip } from "../xmls/sd-excel-xml-relation-ship";
import { SdExcelXmlContentType } from "../xmls/sd-excel-xml-content-type";
import { SdExcelXmlWorkbook } from "../xmls/sd-excel-xml-workbook";
import { SdExcelXmlWorksheet } from "../xmls/sd-excel-xml-worksheet";
import { SdExcelXmlSharedString } from "../xmls/sd-excel-xml-shared-string";
import { SdExcelXmlUnknown } from "../xmls/sd-excel-xml-unknown";
import { SdExcelXmlStyle } from "../xmls/sd-excel-xml-style";
import {
  BlobReader,
  BlobWriter,
  Entry,
  TextReader,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";

export class ZipCache {
  private readonly _cache = new Map<string, ISdExcelXml | Buffer>();

  constructor(private readonly _entries?: Entry[]) {
  }

  static async fromAsync(arg: Blob | Buffer) {
    if (Buffer.isBuffer(arg)) {
      const reader = new ZipReader(new Uint8ArrayReader(new Uint8Array(arg)));
      return new ZipCache(await reader.getEntries());
    }
    else {
      const reader = new ZipReader(new BlobReader(arg));
      return new ZipCache(await reader.getEntries());
    }
  }

  /*keys(): IterableIterator<string> {
    return this._cache.keys();
  }*/

  async getAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined> {
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath)!;
    }

    if (!this._entries) {
      return undefined;
    }

    const entry = this._entries.single(item => item.filename === filePath);
    if (!entry) {
      return undefined;
    }

    const fileData = await entry.getData!(new Uint8ArrayWriter());

    if (filePath.endsWith(".xml") || filePath.endsWith(".rels")) {
      const fileText = new TextDecoder().decode(fileData);
      const xml = XmlConvert.parse(fileText, { stripTagPrefix: true });
      if (filePath.endsWith(".rels")) {
        this._cache.set(filePath, new SdExcelXmlRelationShip(xml));
      }
      else if (filePath === "[Content_Types].xml") {
        this._cache.set(filePath, new SdExcelXmlContentType(xml));
      }
      else if (filePath === "xl/workbook.xml") {
        this._cache.set(filePath, new SdExcelXmlWorkbook(xml));
      }
      else if (filePath.startsWith("xl/worksheets/sheet")) {
        this._cache.set(filePath, new SdExcelXmlWorksheet(xml));
      }
      else if (filePath.startsWith("xl/sharedStrings.xml")) {
        this._cache.set(filePath, new SdExcelXmlSharedString(xml));
      }
      else if (filePath.startsWith("xl/styles.xml")) {
        this._cache.set(filePath, new SdExcelXmlStyle(xml));
      }
      else {
        this._cache.set(filePath, new SdExcelXmlUnknown(xml));
      }
    }
    else {
      this._cache.set(filePath, Buffer.from(fileData));
    }

    return this._cache.get(filePath);
  }

  set(filePath: string, content: ISdExcelXml | Buffer): void {
    this._cache.set(filePath, content);
  }

  async toBufferAsync(): Promise<Buffer> {
    const writer = new ZipWriter(new Uint8ArrayWriter());

    if (this._entries) {
      const cacheKeys = Array.from(this._cache.keys());
      for (const entry of this._entries) {
        if (entry.directory) {
          // 디렉토리는 추가하지 않아도 된다 (ZipWriter가 알아서 생성)
          continue;
        }
        if (cacheKeys.includes(entry.filename)) {
          // 캐시에 있는건 캐시데이터 사용
          continue;
        }

        const fileData = await entry.getData!(new BlobWriter());
        await writer.add(entry.filename, new BlobReader(fileData));
      }
    }

    for (const filePath of this._cache.keys()) {
      const content = this._cache.get(filePath)!;
      if ("cleanup" in content) {
        content.cleanup();
        await writer.add(filePath, new TextReader(XmlConvert.stringify(content.data)));
      }
      else {
        await writer.add(filePath, new Uint8ArrayReader(content));
      }
    }

    return Buffer.from(await writer.close());
  }
}
