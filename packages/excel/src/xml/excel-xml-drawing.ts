import type { Bytes } from "@simplysm/core-common";
import { xml as xmlU } from "@simplysm/core-common";
import type { IDrawingModel } from "../models/i-drawing-model";
import type { ExcelXmlDrawingData } from "../types";

/**
 * xl/drawings/drawing*.xml 파일을 관리하는 클래스.
 * 이미지 삽입을 위한 위치 및 참조 정보를 처리한다.
 */
export class ExcelXmlDrawing implements IDrawingModel {
  private readonly _data: ExcelXmlDrawingData;

  constructor(data?: ExcelXmlDrawingData) {
    if (data == null) {
      this._data = {
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
      this._data = data;
    }
  }

  /** @internal 테스트, 디버그용 내부 트리 접근. 상위 레이어는 인터페이스만 사용. */
  get data(): ExcelXmlDrawingData {
    return this._data;
  }

  addPicture(opts: {
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    blipRelId: string;
  }): void {
    this._data.wsDr.twoCellAnchor = this._data.wsDr.twoCellAnchor ?? [];

    const anchors = this._data.wsDr.twoCellAnchor;
    const picId = anchors.length + 1;
    const name = `Picture ${picId}`;

    this._data.wsDr.twoCellAnchor.push({
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

  serialize(): Bytes {
    return new TextEncoder().encode(xmlU.stringify(this._data));
  }
}
