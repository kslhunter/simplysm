import type { ExcelXml, ExcelXmlDrawingData } from "../types";

/**
 * Class managing xl/drawings/drawing*.xml files.
 * Handles position and reference information for image insertion.
 */
export class ExcelXmlDrawing implements ExcelXml {
  data: ExcelXmlDrawingData;

  constructor(data?: ExcelXmlDrawingData) {
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

  addPicture(opts: {
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    blipRelId: string;
  }): void {
    this.data.wsDr.twoCellAnchor = this.data.wsDr.twoCellAnchor ?? [];

    const anchors = this.data.wsDr.twoCellAnchor;
    const picId = anchors.length + 1;
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
            },
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

  cleanup(): void {}
}
