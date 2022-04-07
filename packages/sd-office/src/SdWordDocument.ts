import JSZip from "jszip";
import xml from "xml-js";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdWordDocument {
  private _zip!: JSZip;
  private _docData!: xml.Element;

  public static async loadAsync(arg: Buffer | Blob): Promise<SdWordDocument> {
    const wb = new SdWordDocument();

    const zip = await new JSZip().loadAsync(arg);
    wb._zip = zip;

    wb._docData = xml.xml2js(await zip.file("word/document.xml")!.async("text")) as xml.Element;

    return wb;
  }

  public async getBlobAsync(): Promise<Blob> {
    this._writeZipObject();
    return await this._zip.generateAsync({ type: "blob" });
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

  public replaceText(fromStr: string, toStr: string, rootEl?: xml.Element): void {
    const toStrList = toStr.split("\n");

    const insertRowElObjs: { index: number; el: xml.Element }[] = [];
    const rootChildEls = (rootEl ?? this._bodyEl).elements!;
    for (let rootChildElIndex = 0; rootChildElIndex < rootChildEls.length; rootChildElIndex++) {
      if (rootChildEls[rootChildElIndex].name !== "w:p") continue;
      const rowEl = rootChildEls[rootChildElIndex];

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

                insertRowElObjs.push({ index: rootChildElIndex + 1, el: newRowEl });
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
      rootChildEls.insert(insertRowElObj.index, insertRowElObj.el);
    }
  }

  public fillTable(firstCellStrList: string[], data: string[][]): void {
    const bodyChildEls = this._bodyEl.elements!;
    for (const bodyChildEl of bodyChildEls) {
      if (bodyChildEl.name !== "w:tbl") continue;
      const tblEl = bodyChildEl;

      for (let tblChildElIndex = 0; tblChildElIndex < tblEl.elements!.length; tblChildElIndex++) {
        if (tblEl.elements![tblChildElIndex].name !== "w:tr") continue;
        const trEl = tblEl.elements![tblChildElIndex];

        for (let trChildElIndex = 0; trChildElIndex < trEl.elements!.length; trChildElIndex++) {
          if (trEl.elements![trChildElIndex].name !== "w:tc") continue;
          const tcEl = trEl.elements![trChildElIndex];

          for (let firstCellStrIndex = 0; firstCellStrIndex < firstCellStrList.length; firstCellStrIndex++) {
            if (tcEl.elements!.some((tcChildEl) => tcChildEl.name === "w:p" && this._getRowText(tcChildEl)?.includes(firstCellStrList[firstCellStrIndex]))) {
              let prevOrgTrEl: xml.Element | undefined;
              for (let dataRowIndex = 0; dataRowIndex < data.length; dataRowIndex++) {
                let currTrEl = tblEl.elements![tblChildElIndex + dataRowIndex];
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (currTrEl === undefined) {
                  currTrEl = ObjectUtil.clone(prevOrgTrEl!);
                  tblEl.elements!.push(currTrEl);
                }
                prevOrgTrEl = ObjectUtil.clone(currTrEl);

                const currTcEl = currTrEl.elements![trChildElIndex];
                this.replaceText(firstCellStrList[firstCellStrIndex], data[dataRowIndex][firstCellStrIndex], currTcEl);
              }
            }
          }
        }
      }
    }
  }
}
