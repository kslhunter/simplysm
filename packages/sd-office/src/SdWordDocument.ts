import * as JSZip from "jszip";
import { XmlConvert } from "./utils/XmlConvert";
import { ObjectUtil, StringUtil } from "@simplysm/sd-core-common";

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
    console.log(wb._docData["w:document"]["w:body"][0]);

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

  public replaceText(fromStr: string, toStr: string | string[]): void {
    const toStrList = typeof toStr === "string" ? [toStr] : toStr;
    const pItems: any[] = this._docData["w:document"]["w:body"][0]["w:p"];

    const startPIndexes: number[] = [];
    for (let pItemIndex = 0; pItemIndex < pItems.length; pItemIndex++) {
      const pItem = pItems[pItemIndex];
      if (pItem["w:r"]?.map((r: any) => (typeof r["w:t"]?.[0] === "string" ? r["w:t"]?.[0] : "")).join("").includes(fromStr) !== true) continue;
      if (pItem["w:r"] === undefined) continue;

      const pStr = pItem["w:r"].map((r: any) => (typeof r["w:t"]?.[0] === "string" ? r["w:t"]?.[0] : "")).join("");
      const fromStrIndex = pStr.indexOf(fromStr);

      let pStrIndex = 0;
      const removeRs = [];
      const tabSplitTexts = [];
      for (let rItemIndex = 0; rItemIndex < pItem["w:r"].length; rItemIndex++) {
        const rItem = pItem["w:r"][rItemIndex];
        const tItem: string | undefined = typeof rItem["w:t"]?.[0] === "string" ? rItem["w:t"]?.[0] : undefined;
        if (tItem === undefined) continue;
        let startIndex: number | undefined;
        const removeIndexes: number[] = [];
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
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
          startPIndexes.push(pItemIndex);
          if (toStrList[0].split("\t").length === 1) {
            rItem["w:t"][0] = rItem["w:t"][0].substring(0, startIndex - 1) + toStrList[0] + rItem["w:t"][0].substring(startIndex);
          }
          else {
            rItem["w:t"][0] = rItem["w:t"][0].substring(0, startIndex - 1) + toStrList[0].split("\t")[0] + rItem["w:t"][0].substring(startIndex);
            tabSplitTexts.push({
              rItemIndex,
              texts: toStrList[0].split("\t").slice(1)
            });
          }
        }

        if (rItem["w:t"][0] === "") {
          removeRs.push(rItem);
        }
      }

      for (const tabSplitTextsItem of tabSplitTexts.orderByDesc((item) => item.rItemIndex)) {
        for (const tabSplitText of tabSplitTextsItem.texts.reverse()) {
          const newRItem = ObjectUtil.clone(pItem["w:r"][tabSplitTextsItem.rItemIndex]);
          delete newRItem["w:t"];
          newRItem["w:tab"] = [{}];
          if (!StringUtil.isNullOrEmpty(tabSplitText)) {
            newRItem["w:t"] = [tabSplitText];
          }
          pItem["w:r"].insert(tabSplitTextsItem.rItemIndex + 1, newRItem);
        }
      }

      pItem["w:r"].remove(...removeRs);
    }

    if (toStrList.length > 1 && startPIndexes.length > 0) {
      for (const startPIndex of startPIndexes) {
        for (const additionalToStr of toStrList.slice(1)) {
          const newPItem = ObjectUtil.clone(pItems[startPIndex]);
          newPItem["w:r"] = [newPItem["w:r"].last((r: any) => typeof r["w:t"]?.[0] === "string")];

          const splitTexts = additionalToStr.split("\t");
          newPItem["w:r"][0]["w:t"][0] = splitTexts[0];

          let additionalIndex = 1;
          if (splitTexts.slice(1).length > 0) {
            for (const splitText of splitTexts.slice(1)) {
              newPItem["w:r"][additionalIndex] = ObjectUtil.clone(newPItem["w:r"][0]);
              delete newPItem["w:r"][additionalIndex]["w:t"];
              newPItem["w:r"][additionalIndex]["w:tab"] = [{}];
              if (!StringUtil.isNullOrEmpty(splitText)) {
                newPItem["w:r"][additionalIndex]["w:t"] = [splitText];
              }
              additionalIndex++;
            }
          }

          pItems.insert(startPIndex + 1, newPItem);
        }
      }
    }
  }

  public fillTable(firstCellStr: string, data: string[][]): void {
    for (const tblItem of this._docData["w:document"]["w:body"][0]["w:tbl"]) {
      let firstTrIndex: number | undefined;
      let firstTcIndex: number | undefined;
      for (let trItemIndex = 0; trItemIndex < tblItem["w:tr"].length; trItemIndex++) {
        const trItem = tblItem["w:tr"][trItemIndex];

        for (let tcItemIndex = 0; tcItemIndex < trItem["w:tc"].length; tcItemIndex++) {
          const tcItem = trItem["w:tc"][tcItemIndex];
          if (tcItem["w:p"][0]["w:r"]?.map((r: any) => (typeof r["w:t"]?.[0] === "string" ? r["w:t"]?.[0] : "")).join("") === firstCellStr) {
            firstTrIndex = trItemIndex;
            firstTcIndex = tcItemIndex;
          }
        }
      }

      if (firstTrIndex === undefined || firstTcIndex === undefined) {
        continue;
      }

      for (let dataRowIndex = 0; dataRowIndex < data.length; dataRowIndex++) {
        for (let dataColIndex = 0; dataColIndex < data[dataRowIndex].length; dataColIndex++) {
          let currTrItem = tblItem["w:tr"][firstTrIndex + dataRowIndex];
          if (currTrItem === undefined) {
            currTrItem = ObjectUtil.clone(tblItem["w:tr"][firstTrIndex]);
            tblItem["w:tr"].push(currTrItem);
          }

          const currTcItem = currTrItem["w:tc"][firstTcIndex + dataColIndex];
          if (currTcItem["w:p"][0]["w:r"] === undefined) {
            currTcItem["w:p"][0]["w:r"] = [ObjectUtil.clone(currTrItem["w:tc"][firstTcIndex]["w:p"][0]["w:r"][0])];
          }
          else {
            currTcItem["w:p"][0]["w:r"] = [ObjectUtil.clone(currTcItem["w:p"][0]["w:r"][0])];
          }
          currTcItem["w:p"][0]["w:r"][0]["w:t"][0] = data[dataRowIndex][dataColIndex];
        }
      }
    }
  }

  private _writeZipObject(): void {
    this._zip.file("word/document.xml", XmlConvert.stringify(this._docData));
  }
}
