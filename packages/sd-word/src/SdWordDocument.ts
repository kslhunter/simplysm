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

    // .rel
    wb._docData = await XmlConvert.parseAsync(await zip.file("word/document.xml")!.async("text"), { stripPrefix: true });

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

  private _writeZipObject(): void {
    this._zip.file("word/document.xml", XmlConvert.stringify(this._docData));
  }
}
