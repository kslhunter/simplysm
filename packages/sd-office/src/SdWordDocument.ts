import * as JSZip from "jszip";
import { XmlConvert } from "./utils/XmlConvert";

export class SdWordDocument {
  private _zip!: JSZip;
  private _docData!: any;

  public static loadAsync(buffer: Buffer): Promise<SdWordDocument>;
  public static loadAsync(file: File): Promise<SdWordDocument>;
  public static loadAsync(blob: Blob): Promise<SdWordDocument>;
  public static async loadAsync(arg: Buffer | Blob | File): Promise<SdWordDocument> {
    let buffer: Buffer | Blob;
    if (arg["lastModified"] !== undefined) {
      buffer = await new Promise<Buffer>((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = (): void => {
          resolve(Buffer.from(fileReader.result as ArrayBuffer));
        };
        fileReader.readAsArrayBuffer(arg as any);
      });
    }
    else {
      buffer = arg;
    }

    const wb = new SdWordDocument();

    const zip = await new JSZip().loadAsync(buffer);
    wb._zip = zip;

    wb._docData = await XmlConvert.parseAsync(await zip.file("word/document.xml")!.async("text"));

    return wb;
  }

  public async downloadAsync(filename: string): Promise<void> {
    this._writeZipObject();

    const blob = await this._zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  public async getBufferAsync(): Promise<Buffer> {
    this._writeZipObject();

    return await this._zip.generateAsync({ type: "nodebuffer" });
  }

  public replaceText(fromStr: string, toStr: string): void {
    const pItems = this._docData["w:document"]["w:body"][0]["w:p"].filter((p: any) => (p["w:r"]?.map((r: any) => (typeof r["w:t"]?.[0] === "string" ? r["w:t"]?.[0] : "")).join("").includes(fromStr)));
    // console.log("pItems: ", pItems);

    for (const pItem of pItems) {
      if (pItem["w:r"] === undefined) continue;

      const pStr = pItem["w:r"].map((r: any) => (typeof r["w:t"]?.[0] === "string" ? r["w:t"]?.[0] : "")).join("");
      const fromStrIndex = pStr.indexOf(fromStr);

      let pStrIndex = 0;
      const removeRs = [];
      for (const rItem of pItem["w:r"]) {
        const tItem: string | undefined = typeof rItem["w:t"]?.[0] === "string" ? rItem["w:t"]?.[0] : undefined;
        if (tItem === undefined) continue;
        let startIndex: number | undefined;
        const removeIndexes: number[] = [];
        for (let tItemCharIndex = 0; tItemCharIndex < tItem.length; tItemCharIndex++) {
          if (pStrIndex === fromStrIndex) {
            startIndex = pStrIndex;
          }
          if (pStrIndex >= fromStrIndex && pStrIndex < fromStrIndex + fromStr.length) {
            removeIndexes.push(pStrIndex);
          }
          pStrIndex++;
        }

        if (removeIndexes.length > 0) {
          for (const removeIndex of removeIndexes.orderByDesc()) {
            rItem["w:t"][0] = rItem["w:t"][0].slice(removeIndex, removeIndex);
          }
        }
        if (startIndex !== undefined) {
          rItem["w:t"][0] = rItem["w:t"][0].substring(0, startIndex - 1) + toStr + rItem["w:t"][0].substring(startIndex);
        }

        if (rItem["w:t"][0] === "") {
          removeRs.push(rItem);
        }
      }
      pItem["w:r"].remove(...removeRs);
    }
  }

  private _writeZipObject(): void {
    this._zip.file("word/document.xml", XmlConvert.stringify(this._docData));
  }
}
