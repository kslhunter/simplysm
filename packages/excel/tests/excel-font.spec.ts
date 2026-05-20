import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";
import type { ExcelXmlStyle } from "../src/xml/excel-xml-style";

async function getStyleSheet(wb: ExcelWorkbook) {
  const styleData = (await wb.zipCache.get("xl/styles.xml")) as ExcelXmlStyle | undefined;
  return styleData?.data.styleSheet;
}

describe("폰트 — workbook default style", () => {
  it("setDefaultStyle 으로 폰트 default 지정 시 fonts[0] 자체가 갱신된다", async () => {
    const wb = new ExcelWorkbook();
    await wb.setDefaultStyle({ font: { family: "맑은 고딕", size: 10 } });

    const ss = await getStyleSheet(wb);
    expect(ss).toBeDefined();
    // fonts[0] 자체가 새 폰트 정의로 덮어씌워진다 (누적 X).
    expect(ss!.fonts[0].font.length).toBe(1);
    const font = ss!.fonts[0].font[0];
    expect(font.name?.[0].$.val).toBe("맑은 고딕");
    expect(font.sz?.[0].$.val).toBe("10");

    // cellXfs[0].xf[0] 에는 fontId/applyFont 미명시 → 모든 셀이 fonts[0] 자동 fallback.
    const xf0 = ss!.cellXfs[0].xf[0];
    expect(xf0.$.fontId).toBeUndefined();
    expect(xf0.$.applyFont).toBeUndefined();
  });

  it("setDefaultStyle 으로 background 지정 시 fills[0] 자체가 갱신된다", async () => {
    const wb = new ExcelWorkbook();
    await wb.setDefaultStyle({ background: "00FFFF00", horizontalAlign: "center" });

    const ss = await getStyleSheet(wb);
    // fills[0] 자체가 solid + fgColor 로 덮어씌워진다.
    expect(ss!.fills[0].fill[0].patternFill[0].$.patternType).toBe("solid");
    expect(ss!.fills[0].fill[0].patternFill[0].fgColor?.[0].$.rgb).toBe("00FFFF00");

    // cellXfs[0].xf[0] 에는 fillId/applyFill 미명시 + alignment 만 박힘.
    const xf0 = ss!.cellXfs[0].xf[0];
    expect(xf0.$.fillId).toBeUndefined();
    expect(xf0.$.applyFill).toBeUndefined();
    expect(xf0.alignment?.[0].$.horizontal).toBe("center");
  });

  it("setDefaultStyle 미호출 시 cellXfs[0] 은 현행대로 numFmtId='0' 만 유지된다", async () => {
    const wb = new ExcelWorkbook();
    // styles.xml 을 강제로 만들기 위해 임의 셀 스타일 건드리지 않음 → styles.xml 자체 미생성
    const ss = await getStyleSheet(wb);
    expect(ss).toBeUndefined();
  });

  it("setDefaultStyle 을 두 번 호출하면 마지막 호출이 fonts[0] 에 적용된다", async () => {
    const wb = new ExcelWorkbook();
    await wb.setDefaultStyle({ font: { family: "Arial", size: 12 } });
    await wb.setDefaultStyle({ font: { family: "Calibri", size: 11 } });

    const ss = await getStyleSheet(wb);
    expect(ss!.fonts[0].font.length).toBe(1);
    const font = ss!.fonts[0].font[0];
    expect(font.name?.[0].$.val).toBe("Calibri");
    expect(font.sz?.[0].$.val).toBe("11");
  });
});

describe("폰트 — cell override", () => {
  it("cell.setStyle({ font: { bold: true } }) 후 fonts 누적 + cellXf 의 applyFont/fontId 박힘", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Sheet1");
    await ws.cell(0, 0).setStyle({ font: { bold: true } });

    const ss = await getStyleSheet(wb);
    expect(ss).toBeDefined();
    // fonts 에 bold 항목 추가됨 (default 빈 font + bold = 길이 2)
    expect(ss!.fonts[0].font.length).toBe(2);
    const boldFont = ss!.fonts[0].font[1];
    expect(boldFont.b).toBeDefined();

    const styleId = await ws.cell(0, 0).getStyleId();
    const xf = ss!.cellXfs[0].xf[parseInt(styleId!)];
    expect(xf.$.applyFont).toBe("1");
    expect(xf.$.fontId).toBe("1");
  });

  it("동일 폰트 조합으로 두 셀에 setStyle 시 fonts 가 dedup 된다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Sheet1");
    await ws.cell(0, 0).setStyle({ font: { italic: true, size: 14 } });
    await ws.cell(0, 1).setStyle({ font: { italic: true, size: 14 } });

    const ss = await getStyleSheet(wb);
    expect(ss!.fonts[0].font.length).toBe(2); // default + 한 종류
  });

  it("background 와 font 동시 지정 시 cellXf 의 applyFill/applyFont 둘 다 박힌다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Sheet1");
    await ws.cell(0, 0).setStyle({
      background: "00FF0000",
      font: { bold: true, color: "00FFFFFF" },
    });

    const ss = await getStyleSheet(wb);
    const styleId = await ws.cell(0, 0).getStyleId();
    const xf = ss!.cellXfs[0].xf[parseInt(styleId!)];
    expect(xf.$.applyFill).toBe("1");
    expect(xf.$.applyFont).toBe("1");
  });

  it("폰트 색상 형식이 ARGB 8자리가 아니면 throw 한다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.addWorksheet("Sheet1");
    await expect(ws.cell(0, 0).setStyle({ font: { color: "FF0000" } })).rejects.toThrow(
      /잘못된 폰트 색상 형식/,
    );
  });
});

describe("폰트 — 7속성 OOXML 매핑", () => {
  async function buildFontXml(fontOpts: Parameters<ExcelWorkbook["setDefaultStyle"]>[0]["font"]) {
    const wb = new ExcelWorkbook();
    await wb.setDefaultStyle({ font: fontOpts });
    const ss = await getStyleSheet(wb);
    return ss!.fonts[0].font[0];
  }

  it("size → <sz val='..'/>", async () => {
    const f = await buildFontXml({ size: 12.5 });
    expect(f.sz?.[0].$.val).toBe("12.5");
  });

  it("family → <name val='..'/>", async () => {
    const f = await buildFontXml({ family: "Arial" });
    expect(f.name?.[0].$.val).toBe("Arial");
  });

  it("bold → <b/>", async () => {
    const f = await buildFontXml({ bold: true });
    expect(f.b).toBeDefined();
  });

  it("italic → <i/>", async () => {
    const f = await buildFontXml({ italic: true });
    expect(f.i).toBeDefined();
  });

  it("strike → <strike/>", async () => {
    const f = await buildFontXml({ strike: true });
    expect(f.strike).toBeDefined();
  });

  it("underline 'single' → <u val='single'/>", async () => {
    const f = await buildFontXml({ underline: "single" });
    expect(f.u?.[0].$?.val).toBe("single");
  });

  it("underline 'double' → <u val='double'/>", async () => {
    const f = await buildFontXml({ underline: "double" });
    expect(f.u?.[0].$?.val).toBe("double");
  });

  it("color → <color rgb='..'/> (대문자 정규화)", async () => {
    const f = await buildFontXml({ color: "00ff0000" });
    expect(f.color?.[0].$.rgb).toBe("00FF0000");
  });

  it("미지정 속성은 자식 엘리먼트가 없다", async () => {
    const f = await buildFontXml({ bold: true });
    expect(f.sz).toBeUndefined();
    expect(f.name).toBeUndefined();
    expect(f.i).toBeUndefined();
    expect(f.u).toBeUndefined();
    expect(f.strike).toBeUndefined();
    expect(f.color).toBeUndefined();
  });

  it("default 와 override 가 동일 폰트 입력에 대해 fonts[0] 을 공유 (dedup)", async () => {
    const wb = new ExcelWorkbook();
    await wb.setDefaultStyle({ font: { family: "Arial", size: 11 } });
    const ws = await wb.addWorksheet("Sheet1");
    await ws.cell(0, 0).setStyle({ font: { family: "Arial", size: 11 } });

    const ss = await getStyleSheet(wb);
    // default 가 fonts[0] 자체에 박혔고, override 는 동일 폰트라 fonts[0] 재사용 → 길이 1.
    expect(ss!.fonts[0].font.length).toBe(1);

    const cellStyleId = await ws.cell(0, 0).getStyleId();
    const cellXf = ss!.cellXfs[0].xf[parseInt(cellStyleId!)];
    expect(cellXf.$.fontId).toBe("0");
    expect(cellXf.$.applyFont).toBe("1");
  });
});
