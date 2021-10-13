import * as JSZip from "jszip";
import * as xml from "xml-js";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdWordDocument {
  private _zip!: JSZip;
  private _docData!: xml.Element;
  private _docRelsData!: xml.Element;
  private _docContentType!: xml.Element;
  private _images!: ({ buffer: Buffer; ext: string } | undefined)[];

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
    wb._docRelsData = xml.xml2js(await zip.file("word/_rels/document.xml.rels")!.async("text")) as xml.Element;
    wb._docContentType = xml.xml2js(await zip.file("[Content_Types].xml")!.async("text")) as xml.Element;
    const imageRecord = zip.folder("word/media")?.files;
    wb._images = imageRecord ? Object.keys(imageRecord).map(() => undefined) : [];

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
    this._zip.file("word/_rels/document.xml.rels", xml.js2xml(this._docRelsData));
    this._zip.file("[Content_Types].xml", xml.js2xml(this._docContentType));

    for (let i = 0; i < this._images.length; i++) {
      if (!this._images[i]) continue;
      this._zip.file(`word/media/image${i + 1}.${this._images[i]!.ext}`, this._images[i]!.buffer);
    }
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

  public replaceImages(fromStr: string, toImages: { buffer: Buffer; ext: string }[]): void {
    this._images.push(...toImages);

    const lastId = this._docRelsData.elements![0].elements!.max((item: any) => Number(item.attributes.Id.replace(/rId/, ""))) ?? 0;
    const relTexts = this._images
      .map((item, i) => (item === undefined ? undefined : `<Relationship Id="rId${lastId + i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}.${item.ext}"/>`))
      .filterExists()
      .join("");
    this._docRelsData.elements!.single((item) => item.name === "Relationships")!.elements!.push(...xml.xml2js(relTexts).elements);

    const docContentTypeTexts = this._images.filterExists().map((item) => item.ext).distinct()
      .map((item) => `<Default Extension="${item}" ContentType="image/${item}"/>`)
      .join("");
    this._docContentType.elements!.single((item) => item.name === "Types")!.elements!.push(...xml.xml2js(docContentTypeTexts).elements);

    const rootChildEls = this._bodyEl.elements!;
    for (const rootChildEl of rootChildEls) {
      if (rootChildEl.name !== "w:p") continue;
      const rowEl = rootChildEl;

      const rowText = this._getRowText(rowEl) ?? "";
      const fromStrIndex = rowText.indexOf(fromStr);
      if (fromStrIndex < 0) continue;

      rowEl.elements!.remove((item) => item.name === "w:r");

      const xmlTexts: string[] = [];
      for (let i = 0; i < this._images.length; i++) {
        if (this._images[i] === undefined) continue;

        xmlTexts.push(`
<w:r>
    <w:rPr>
        <w:noProof/>
    </w:rPr>
    <w:drawing>
        <wp:inline>
            <wp:extent cx="685114" cy="685800"/>
            <wp:docPr id="${100 + i + 1}" name="그림 ${10 + i}">
                <a:extLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:ext uri="{FF2B5EF4-FFF2-40B4-BE49-F238E27FC236}">
                        <a16:creationId xmlns:a16="http://schemas.microsoft.com/office/drawing/2014/main" id="{6085D45C-671E-4908-A28E-8237C2D983C1}"/>
                    </a:ext>
                </a:extLst>
            </wp:docPr>
            <wp:cNvGraphicFramePr>
                <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:nvPicPr>
                            <pic:cNvPr id="${100 + i + 1}" name="그림 ${10 + i}">
                                <a:extLst>
                                    <a:ext uri="{FF2B5EF4-FFF2-40B4-BE49-F238E27FC236}">
                                        <a16:creationId xmlns:a16="http://schemas.microsoft.com/office/drawing/2014/main" id="{6085D45C-671E-4908-A28E-8237C2D983C1}"/>
                                    </a:ext>
                                </a:extLst>
                            </pic:cNvPr>
                            <pic:cNvPicPr>
                                <a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
                            </pic:cNvPicPr>
                        </pic:nvPicPr>
                        <pic:blipFill>
                            <a:blip r:embed="rId${lastId + i + 1}" cstate="print">
                                <a:extLst>
                                    <a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}">
                                        <a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/>
                                    </a:ext>
                                </a:extLst>
                            </a:blip>
                            <a:srcRect/>
                            <a:stretch>
                                <a:fillRect/>
                            </a:stretch>
                        </pic:blipFill>
                        <pic:spPr bwMode="auto">
                            <a:xfrm>
                                <a:off x="0" y="0"/>
                                <a:ext cx="685114" cy="685800"/>
                            </a:xfrm>
                            <a:prstGeom prst="rect">
                                <a:avLst/>
                            </a:prstGeom>
                            <a:noFill/>
                            <a:extLst>
                                <a:ext uri="{909E8E84-426E-40DD-AFC4-6F175D3DCCD1}">
                                    <a14:hiddenFill xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main">
                                        <a:solidFill>
                                            <a:srgbClr val="FFFFFF"/>
                                        </a:solidFill>
                                    </a14:hiddenFill>
                                </a:ext>
                            </a:extLst>
                        </pic:spPr>
                    </pic:pic>
                </a:graphicData>
            </a:graphic>
        </wp:inline>
    </w:drawing>
</w:r>`);
      }
      rowEl.elements!.push(...xml.xml2js(xmlTexts.join("\n")).elements);
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
