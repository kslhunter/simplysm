import * as JSZip from "jszip";
import * as xml from "xml-js";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdWordDocument {
  private _zip!: JSZip;
  private _docData!: xml.Element;

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

    wb._docData = xml.xml2js(await zip.file("word/document.xml")!.async("text")) as xml.Element;
    // wb._docData = await XmlConvert.parseAsync(await zip.file("word/document.xml")!.async("text"));

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
    this._zip.file("word/document.xml", xml.js2xml(this._docData));
  }

  private get _bodyEl(): xml.Element {
    return this._docData.elements![0].elements![0]!;
  }

  private _getRowText(rowEl: xml.Element): string | undefined {
    return rowEl.elements!.map((item) => item.elements?.single((el) => el.name === "w:t")?.elements?.[0].text ?? "").join("");
  }

  public replaceText(fromStr: string, toStr: string): void {
    const toStrList = toStr.split("\n");

    const insertRowElObjs: { index: number; el: xml.Element }[] = [];
    const bodyChildEls = this._bodyEl.elements!;
    for (let bodyChildElIndex = 0; bodyChildElIndex < bodyChildEls.length; bodyChildElIndex++) {
      if (bodyChildEls[bodyChildElIndex].name !== "w:p") continue;
      const rowEl = bodyChildEls[bodyChildElIndex];

      const rowText = this._getRowText(rowEl) ?? "";
      const fromStrIndex = rowText.indexOf(fromStr);
      if (fromStrIndex < 0) continue;

      const insertWrapElObjs: { index: number; el: xml.Element }[] = [];
      let cursorIndex = 0;
      for (let wrapElIndex = 0; wrapElIndex < rowEl.elements!.length; wrapElIndex++) {
        const wrapEl = rowEl.elements![wrapElIndex];
        if (!wrapEl.elements) continue;

        const removeStrEls: xml.Element[] = [];
        for (const strEl of wrapEl.elements) {
          if (strEl.name !== "w:t") continue;
          if (!strEl.elements) continue;

          let startCharIndex: number | undefined;
          const removeCharIndexes: number[] = [];
          const str = strEl.elements[0].text as string;
          for (let charIndex = 0; charIndex < str.length; charIndex++) {
            if (cursorIndex === fromStrIndex) {
              startCharIndex = charIndex;
            }
            if (cursorIndex >= fromStrIndex && cursorIndex < fromStrIndex + fromStr.length) {
              removeCharIndexes.push(charIndex);
            }
            cursorIndex++;
          }

          let newStr = str;
          for (const removeIndex of removeCharIndexes) {
            newStr = newStr.slice(removeIndex, removeIndex);
          }
          if (startCharIndex !== undefined) {
            newStr = (startCharIndex === 0 ? "" : newStr.slice(0, startCharIndex - 1))
              + toStrList[0]
              + newStr.slice(startCharIndex);

            if (toStrList.length > 1) {
              for (const currToStr of toStrList.slice(1)) {
                const newRowEl = ObjectUtil.clone(rowEl);
                newRowEl.elements!.remove((item) => item.name === "w:r");

                const tabSplitToStrList = currToStr.split("\t");
                const newWrapEl = ObjectUtil.clone(wrapEl);
                newRowEl.elements!.push(newWrapEl);
                newWrapEl.elements!.single((item) => item.name === "w:t")!.elements![0].text = tabSplitToStrList[0];

                for (const tabSplitToStr of tabSplitToStrList.slice(1)) {
                  const newWrapEl2 = ObjectUtil.clone(wrapEl);
                  newWrapEl2.elements!.remove((item) => item.name === "w:t");
                  newWrapEl2.elements!.push({ type: "element", name: "w:tab" });
                  newRowEl.elements!.push(newWrapEl2);

                  const newWrapEl3 = ObjectUtil.clone(wrapEl);
                  newWrapEl3.elements!.single((item) => item.name === "w:t")!.elements![0].text = tabSplitToStr;
                  newRowEl.elements!.push(newWrapEl3);
                }

                insertRowElObjs.push({ index: bodyChildElIndex + 1, el: newRowEl });
              }
            }
          }

          if (newStr === "") {
            removeStrEls.push(strEl);
          }
          else {
            const tabSplitToStrList = newStr.split("\t");

            strEl.elements[0].text = tabSplitToStrList[0];

            for (const tabSplitToStr of tabSplitToStrList.slice(1)) {
              const newWrapEl2 = ObjectUtil.clone(wrapEl);
              newWrapEl2.elements!.remove((item) => item.name === "w:t");
              newWrapEl2.elements!.push({ type: "element", name: "w:tab" });
              insertWrapElObjs.push({ index: wrapElIndex + 1, el: newWrapEl2 });

              const newWrapEl3 = ObjectUtil.clone(wrapEl);
              newWrapEl3.elements!.single((item) => item.name === "w:t")!.elements![0].text = tabSplitToStr;
              insertWrapElObjs.push({ index: wrapElIndex + 1, el: newWrapEl3 });
            }
          }
        }

        for (const removeStrEl of removeStrEls) {
          wrapEl.elements.remove(removeStrEl);
        }
      }

      for (const insertWrapElObj of insertWrapElObjs.reverse()) {
        rowEl.elements!.insert(insertWrapElObj.index, insertWrapElObj.el);
      }
    }

    for (const insertRowElObj of insertRowElObjs.reverse()) {
      bodyChildEls.insert(insertRowElObj.index, insertRowElObj.el);
    }
  }

  public fillTable(firstCellStr: string, data: string[][]): void {
    const bodyChildEls = this._bodyEl.elements!;
    for (let bodyChildElIndex = 0; bodyChildElIndex < bodyChildEls.length; bodyChildElIndex++) {
      if (bodyChildEls[bodyChildElIndex].name !== "w:tbl") continue;
      const tblEl = bodyChildEls[bodyChildElIndex];
      console.log(tblEl);

      /*
      const rowText = this._getRowText(rowEl) ?? "";
      const fromStrIndex = rowText.indexOf(fromStr);
      if (fromStrIndex < 0) continue;

      const insertWrapElObjs: { index: number; el: xml.Element }[] = [];
      let cursorIndex = 0;
      for (let wrapElIndex = 0; wrapElIndex < rowEl.elements!.length; wrapElIndex++) {
        const wrapEl = rowEl.elements![wrapElIndex];
        if (!wrapEl.elements) continue;

        const removeStrEls: xml.Element[] = [];
        for (const strEl of wrapEl.elements) {
          if (strEl.name !== "w:t") continue;
          if (!strEl.elements) continue;

          let startCharIndex: number | undefined;
          const removeCharIndexes: number[] = [];
          const str = strEl.elements[0].text as string;
          for (let charIndex = 0; charIndex < str.length; charIndex++) {
            if (cursorIndex === fromStrIndex) {
              startCharIndex = charIndex;
            }
            if (cursorIndex >= fromStrIndex && cursorIndex < fromStrIndex + fromStr.length) {
              removeCharIndexes.push(charIndex);
            }
            cursorIndex++;
          }

          let newStr = str;
          for (const removeIndex of removeCharIndexes) {
            newStr = newStr.slice(removeIndex, removeIndex);
          }
          if (startCharIndex !== undefined) {
            newStr = (startCharIndex === 0 ? "" : newStr.slice(0, startCharIndex - 1))
              + toStrList[0]
              + newStr.slice(startCharIndex);

            if (toStrList.length > 1) {
              for (const currToStr of toStrList.slice(1)) {
                const newRowEl = ObjectUtil.clone(rowEl);
                newRowEl.elements!.remove((item) => item.name === "w:r");

                const tabSplitToStrList = currToStr.split("\t");
                const newWrapEl = ObjectUtil.clone(wrapEl);
                newRowEl.elements!.push(newWrapEl);
                newWrapEl.elements!.single((item) => item.name === "w:t")!.elements![0].text = tabSplitToStrList[0];

                for (const tabSplitToStr of tabSplitToStrList.slice(1)) {
                  const newWrapEl2 = ObjectUtil.clone(wrapEl);
                  newWrapEl2.elements!.remove((item) => item.name === "w:t");
                  newWrapEl2.elements!.push({ type: "element", name: "w:tab" });
                  newRowEl.elements!.push(newWrapEl2);

                  const newWrapEl3 = ObjectUtil.clone(wrapEl);
                  newWrapEl3.elements!.single((item) => item.name === "w:t")!.elements![0].text = tabSplitToStr;
                  newRowEl.elements!.push(newWrapEl3);
                }

                insertRowElObjs.push({ index: bodyChildElIndex + 1, el: newRowEl });
              }
            }
          }

          if (newStr === "") {
            removeStrEls.push(strEl);
          }
          else {
            const tabSplitToStrList = newStr.split("\t");

            strEl.elements[0].text = tabSplitToStrList[0];

            for (const tabSplitToStr of tabSplitToStrList.slice(1)) {
              const newWrapEl2 = ObjectUtil.clone(wrapEl);
              newWrapEl2.elements!.remove((item) => item.name === "w:t");
              newWrapEl2.elements!.push({ type: "element", name: "w:tab" });
              insertWrapElObjs.push({ index: wrapElIndex + 1, el: newWrapEl2 });

              const newWrapEl3 = ObjectUtil.clone(wrapEl);
              newWrapEl3.elements!.single((item) => item.name === "w:t")!.elements![0].text = tabSplitToStr;
              insertWrapElObjs.push({ index: wrapElIndex + 1, el: newWrapEl3 });
            }
          }
        }

        for (const removeStrEl of removeStrEls) {
          wrapEl.elements.remove(removeStrEl);
        }
      }

      for (const insertWrapElObj of insertWrapElObjs.reverse()) {
        rowEl.elements!.insert(insertWrapElObj.index, insertWrapElObj.el);
      }*/
    }

    /*for (const insertRowElObj of insertRowElObjs.reverse()) {
      bodyChildEls.insert(insertRowElObj.index, insertRowElObj.el);
    }*/

    /*for (const tblItem of this._docData["w:document"]["w:body"][0]["w:tbl"]) {
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
    }*/
  }
}
