// packages/sd-excel/src/xmls/SdExcelXmlDrawing.ts
import { ISdExcelXml, ISdExcelXmlDrawingData } from "../types";

/**
 * xl/drawings/drawingN.xml 을 객체로 표현하는 클래스
 */
export class SdExcelXmlDrawing implements ISdExcelXml {
  data: ISdExcelXmlDrawingData;

  constructor(data?: ISdExcelXmlDrawingData) {
    if (data == null) {
      this.data = {
        wsDr: {
          $: {
            "xmlns": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
            "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
            "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          },
          twoCellAnchor: [],
        },
      };
    } else {
      this.data = data;
    }
  }

  /**
   * picture 추가
   */
  addPicture(opts: {
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    blipRelId: string;
  }): void {
    this.data.wsDr.twoCellAnchor = this.data.wsDr.twoCellAnchor ?? [];

    const anchors = this.data.wsDr.twoCellAnchor;
    const picId = (this.data.wsDr.oneCellAnchor?.length ?? 0) + anchors.length + 1;
    const name = `Picture ${picId}`;

    this.data.wsDr.twoCellAnchor.push({
      from: [
        {
          col: [opts.from.c.toString()],
          colOff: [opts.from.cOff != null ? opts.from.cOff.toString() : "0"],
          row: [opts.from.r.toString()],
          rowOff: [opts.from.rOff != null ? opts.from.rOff.toString() : "0"],
        },
      ],
      to: [
        {
          col: [opts.to.c.toString()],
          colOff: [opts.to.cOff != null ? opts.to.cOff.toString() : "0"],
          row: [opts.to.r.toString()],
          rowOff: [opts.to.rOff != null ? opts.to.rOff.toString() : "0"],
        },
      ],
      pic: [
        {
          nvPicPr: [
            {
              cNvPr: [{ $: { id: picId.toString(), name } }],
              cNvPicPr: [{ "a:picLocks": [{ $: { noChangeAspect: "1" } }] }],
            } as any,
          ],
          blipFill: [
            {
              "a:blip": [{ $: { "r:embed": opts.blipRelId } }],
              "a:stretch": [{ "a:fillRect": [] }],
            },
          ],
          spPr: [
            {
              "a:xfrm": [
                {
                  "a:off": [{ $: { x: "0", y: "0" } }],
                  "a:ext": [{ $: { cx: "0", cy: "0" } }],
                },
              ],
              "a:prstGeom": [{ "$": { prst: "rect" }, "a:avLst": [] }],
            },
          ],
        },
      ],
      clientData: [{}],
    });
  }

  addOneCellPicture(opts: {
    r: number;
    c: number;
    width: number;
    height: number;
    left?: number;
    top?: number;
    blipRelId: string;
  }): void {
    this.data.wsDr.oneCellAnchor = this.data.wsDr.oneCellAnchor ?? [];
    const anchors = this.data.wsDr.oneCellAnchor;
    const picId = (this.data.wsDr.twoCellAnchor?.length ?? 0) + anchors.length + 1;
    const name = `Picture ${picId}`;

    anchors.push({
      from: [{
        col: [opts.c.toString()],
        colOff: [((opts.left ?? 0) * 9525).toString()],
        row: [opts.r.toString()],
        rowOff: [((opts.top ?? 0) * 9525).toString()],
      }],
      ext: [{
        $: {
          cx: (opts.width * 9525).toString(),
          cy: (opts.height * 9525).toString(),
        },
      }],
      pic: [{
        nvPicPr: [{
          cNvPr: [{ $: { id: picId.toString(), name } }],
          cNvPicPr: [{ "a:picLocks": [{ $: { noChangeAspect: "1" } }] }],
        }],
        blipFill: [{
          "a:blip": [{ $: { "r:embed": opts.blipRelId } }],
          "a:stretch": [{ "a:fillRect": [] }],
        }],
        spPr: [{
          "a:prstGeom": [{ $: { prst: "rect" }, "a:avLst": [] }],
        }],
      }],
      clientData: [{}],
    });
  }

  cleanup() {}
}
