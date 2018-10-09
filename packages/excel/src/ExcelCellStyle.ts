import {ExcelCell} from "./ExcelCell";
import {optional} from "@simplism/core";

export class ExcelCellStyle {
  public readonly s: {
    fill?: {
      patternType?: "none" | "solid";
      bgColor?: { rgb?: string };
      fgColor?: { rgb?: string };
      fontColor?: { rgb?: string };
    };
  };

  public get background(): string | undefined {
    return optional(this.ec.cell, o => (o.s.fill.bgColor.rgb as any).slice(2));
  }

  public set background(value: string | undefined) {
    this.s.fill = {
      patternType: "solid",
      bgColor: {rgb: "C6EFCE"},
      fgColor: {rgb: "C6EFCE"},
      fontColor: {rgb: "006100"}
    };
    /*this.s.fill = this.s.fill || {};
    this.s.fill.fgColor = this.s.fill.bgColor || {};
    this.s.fill.fgColor.rgb = value ? value.replace(/#/g, "") : undefined;*/
  }

  public constructor(public ec: ExcelCell) {
    this.ec.cell.s = this.ec.cell.s || {};
    this.s = this.ec.cell.s;
  }
}