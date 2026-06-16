import { describe, expect, it } from "vitest";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";
import { ExcelWorkbook } from "../../src/excel-workbook";
import type { ExcelValueType } from "../../src/types";

async function loadFixture(fileName: string): Promise<Uint8Array> {
  const url = new URL(`../fixtures/${fileName}`, import.meta.url);
  if (!("window" in globalThis)) {
    const fsModule = "node:fs";
    const urlModule = "node:url";
    const fs = await import(fsModule);
    const { fileURLToPath } = await import(urlModule);
    return new Uint8Array(fs.readFileSync(fileURLToPath(url)));
  }
  const response = await fetch(url);
  return new Uint8Array(await response.arrayBuffer());
}

describe("xlsb 읽기 (boa-sample.xlsb)", () => {
  it("워크시트 목록을 읽는다", async () => {
    const bytes = await loadFixture("boa-sample.xlsb");
    const wb = new ExcelWorkbook(bytes);
    try {
      const names = await wb.getWorksheetNames();
      expect(names.length).toBeGreaterThan(0);
      expect(names.every((n) => typeof n === "string" && n.length > 0)).toBe(true);
    } finally {
      await wb.close();
    }
  });

  it("첫 워크시트의 셀 값을 읽는다 (비어있지 않은 셀 존재)", async () => {
    const bytes = await loadFixture("boa-sample.xlsb");
    const wb = new ExcelWorkbook(bytes);
    try {
      const ws = await wb.getWorksheet(0);
      const range = await ws.getRange();
      expect(range.e.r).toBeGreaterThanOrEqual(0);
      expect(range.e.c).toBeGreaterThanOrEqual(0);

      let nonEmpty = 0;
      for (let r = range.s.r; r <= Math.min(range.e.r, 30); r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          if ((await ws.cell(r, c).getValue()) != null) nonEmpty++;
        }
      }
      expect(nonEmpty).toBeGreaterThan(0);
    } finally {
      await wb.close();
    }
  });

  it("문자열 셀(SST)이 문자열로 디코드된다", async () => {
    const bytes = await loadFixture("boa-sample.xlsb");
    const wb = new ExcelWorkbook(bytes);
    try {
      const ws = await wb.getWorksheet(0);
      const range = await ws.getRange();

      let stringFound = false;
      for (let r = range.s.r; r <= Math.min(range.e.r, 30) && !stringFound; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const v = await ws.cell(r, c).getValue();
          if (typeof v === "string") {
            stringFound = true;
            break;
          }
        }
      }
      expect(stringFound).toBe(true);
    } finally {
      await wb.close();
    }
  });

  it("read → serialize → read 로 셀 값이 보존된다 (xlsb roundtrip)", async () => {
    const bytes = await loadFixture("boa-sample.xlsb");
    const wb = new ExcelWorkbook(bytes);
    const before: Record<string, ExcelValueType> = {};
    let out: Uint8Array;
    try {
      const ws = await wb.getWorksheet(0);
      const range = await ws.getRange();
      for (let r = 0; r <= Math.min(range.e.r, 15); r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const v = await ws.cell(r, c).getValue();
          if (v != null) before[`${r},${c}`] = v;
        }
      }
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    expect(Object.keys(before).length).toBeGreaterThan(0);

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      for (const key of Object.keys(before)) {
        const comma = key.indexOf(",");
        const r = Number(key.slice(0, comma));
        const c = Number(key.slice(comma + 1));
        expect(await ws2.cell(r, c).getValue()).toEqual(before[key]);
      }
    } finally {
      await wb2.close();
    }
  });

  it("기존 xlsb 셀을 수정 후 쓰면 값이 반영된다", async () => {
    const bytes = await loadFixture("boa-sample.xlsb");
    const wb = new ExcelWorkbook(bytes);
    let out: Uint8Array;
    try {
      const ws = await wb.getWorksheet(0);
      await ws.cell(0, 0).setValue("MODIFIED_STRING_CELL");
      await ws.cell(1, 0).setValue(98765);
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      expect(await ws2.cell(0, 0).getValue()).toBe("MODIFIED_STRING_CELL");
      expect(await ws2.cell(1, 0).getValue()).toBe(98765);
    } finally {
      await wb2.close();
    }
  });

  it("새 xlsb 워크북을 만들어 값을 쓰고 다시 읽는다", async () => {
    const wb = new ExcelWorkbook({ format: "xlsb" });
    let out: Uint8Array;
    try {
      const ws = await wb.addWorksheet("Sheet1");
      await ws.cell(0, 0).setValue("HELLO");
      await ws.cell(0, 1).setValue(42);
      await ws.cell(1, 0).setValue("WORLD");
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      expect(await wb2.getWorksheetNames()).toEqual(["Sheet1"]);
      const ws2 = await wb2.getWorksheet(0);
      expect(await ws2.cell(0, 0).getValue()).toBe("HELLO");
      expect(await ws2.cell(0, 1).getValue()).toBe(42);
      expect(await ws2.cell(1, 0).getValue()).toBe("WORLD");
    } finally {
      await wb2.close();
    }
  });

  it("날짜 numFmt 셀이 날짜 타입으로 디코드된다 (styles.bin 연동)", async () => {
    const bytes = await loadFixture("boa-sample.xlsb");
    const wb = new ExcelWorkbook(bytes);
    try {
      const names = await wb.getWorksheetNames();
      let dateFound = false;
      for (let s = 0; s < names.length && !dateFound; s++) {
        const ws = await wb.getWorksheet(s);
        const range = await ws.getRange();
        const maxR = Math.min(range.e.r, 40);
        for (let r = range.s.r; r <= maxR && !dateFound; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const v = await ws.cell(r, c).getValue();
            if (v instanceof DateOnly || v instanceof DateTime || v instanceof Time) {
              dateFound = true;
              break;
            }
          }
        }
      }
      expect(dateFound).toBe(true);
    } finally {
      await wb.close();
    }
  });

  it("새 xlsb 에 날짜를 쓰고 다시 읽으면 날짜로 보존된다", async () => {
    const d = new DateOnly(2026, 6, 16);
    const wb = new ExcelWorkbook({ format: "xlsb" });
    let out: Uint8Array;
    try {
      const ws = await wb.addWorksheet("S");
      await ws.cell(0, 0).setValue(d);
      await ws.cell(0, 1).setValue("x");
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      const v = await ws2.cell(0, 0).getValue();
      expect(v instanceof DateOnly).toBe(true);
      expect((v as DateOnly).tick).toBe(d.tick);
      expect(await ws2.cell(0, 1).getValue()).toBe("x");
    } finally {
      await wb2.close();
    }
  });

  it("새 xlsb 병합/컬럼너비/autoFilter roundtrip", async () => {
    const wb = new ExcelWorkbook({ format: "xlsb" });
    let out: Uint8Array;
    try {
      const ws = await wb.addWorksheet("S");
      await ws.cell(0, 0).setValue("a");
      await ws.cell(2, 2).setValue("b");
      await ws.cell(0, 0).merge(1, 1);
      await ws.col(0).setWidth(20);
      await ws.setAutoFilter({ s: { r: 0, c: 0 }, e: { r: 2, c: 2 } });
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      const wsData = await (
        ws2 as unknown as {
          _getWsData(): Promise<{
            getMergeCells(): unknown;
            _colWidths: Map<number, number>;
            _autoFilter: unknown;
          }>;
        }
      )._getWsData();
      expect(wsData.getMergeCells()).toEqual([{ s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }]);
      expect(wsData._colWidths.get(0)).toBe(20 * 256);
      expect(wsData._autoFilter).toEqual({ s: { r: 0, c: 0 }, e: { r: 2, c: 2 } });
    } finally {
      await wb2.close();
    }
  });

  it("새 xlsb 의 zoom/freeze/tabColor roundtrip", async () => {
    const wb = new ExcelWorkbook({ format: "xlsb" });
    let out: Uint8Array;
    try {
      const ws = await wb.addWorksheet("S");
      await ws.cell(0, 0).setValue("a");
      await ws.setZoom(85);
      await ws.freezeAt({ r: 1 });
      await ws.setTabColor("00FF0000");
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      const wsData = await (
        ws2 as unknown as {
          _getWsData(): Promise<{ _zoom: unknown; _freeze: unknown; _tabColor: unknown }>;
        }
      )._getWsData();
      expect(wsData._zoom).toBe(85);
      expect(wsData._freeze).toEqual({ r: 1 });
      expect(wsData._tabColor).toBe("00FF0000");
    } finally {
      await wb2.close();
    }
  });

  it("새 xlsb 에 이미지를 넣으면 drawing 파트와 BrtDrawing 이 생성된다", async () => {
    const png = await loadFixture("logo.png");
    const wb = new ExcelWorkbook({ format: "xlsb" });
    let out: Uint8Array;
    try {
      const ws = await wb.addWorksheet("S");
      await ws.cell(0, 0).setValue("a");
      await ws.addImage({ bytes: png, ext: "png", from: { r: 0, c: 0 } });
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      const wsData = await (
        ws2 as unknown as { _getWsData(): Promise<{ _drawingRelId: unknown }> }
      )._getWsData();
      expect(typeof wsData._drawingRelId).toBe("string");
      const drawing = await (
        wb2 as unknown as { zipCache: { get(p: string): Promise<unknown> } }
      ).zipCache.get("xl/drawings/drawing1.xml");
      expect(drawing).not.toBeUndefined();
    } finally {
      await wb2.close();
    }
  });

  it("새 xlsb 수식(Ptg) roundtrip", async () => {
    const wb = new ExcelWorkbook({ format: "xlsb" });
    let out: Uint8Array;
    const formulas = ["A1+1", "(A1+B1)*2", "A1-B2/3", "A1&\"x\""];
    try {
      const ws = await wb.addWorksheet("S");
      for (let i = 0; i < formulas.length; i++) {
        await ws.cell(i, 5).setFormula(formulas[i]);
      }
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      for (let i = 0; i < formulas.length; i++) {
        expect(await ws2.cell(i, 5).getFormula()).toBe(formulas[i]);
      }
    } finally {
      await wb2.close();
    }
  });

  it("새 xlsb 조건부 서식 roundtrip", async () => {
    const wb = new ExcelWorkbook({ format: "xlsb" });
    let out: Uint8Array;
    try {
      const ws = await wb.addWorksheet("S");
      await ws.cell(0, 0).setValue(1);
      await ws.addConditionalFormat({
        ref: "A1:A10",
        rules: [{ type: "cellIs", op: "<", value: 5, style: { background: "00FF0000" } }],
      });
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      const wsData = await (
        ws2 as unknown as {
          _getWsData(): Promise<{
            conditionalFormats: {
              sqref: string;
              rules: { dxfId: string; cfRule: { type: string; operator?: string; formula: string[] } }[];
            }[];
          }>;
        }
      )._getWsData();
      const cfs = wsData.conditionalFormats;
      expect(cfs.length).toBe(1);
      expect(cfs[0].sqref).toBe("A1:A10");
      expect(cfs[0].rules[0].cfRule.type).toBe("cellIs");
      expect(cfs[0].rules[0].cfRule.operator).toBe("lessThan");
      expect(cfs[0].rules[0].cfRule.formula).toEqual(["5"]);

      const styleData = await (
        wb2 as unknown as { zipCache: { get(p: string): Promise<{ dxfs: unknown[] }> } }
      ).zipCache.get("xl/styles.xml");
      expect(styleData.dxfs.length).toBe(1);
    } finally {
      await wb2.close();
    }
  });

  it("새 xlsb 텍스트 조건부 서식 roundtrip (contains/begins/ends)", async () => {
    const wb = new ExcelWorkbook({ format: "xlsb" });
    let out: Uint8Array;
    try {
      const ws = await wb.addWorksheet("S");
      await ws.cell(0, 0).setValue("사과");
      await ws.addConditionalFormat({
        ref: "A1:A5",
        rules: [
          { type: "text", op: "contains", value: "사", style: { background: "00FFFF00" } },
          { type: "text", op: "beginsWith", value: "청", style: { fontColor: "00FF0000" } },
          { type: "text", op: "endsWith", value: "과", style: { fontWeight: "bold" } },
        ],
      });
      out = new Uint8Array(await wb.toBytes());
    } finally {
      await wb.close();
    }

    const wb2 = new ExcelWorkbook(out);
    try {
      const ws2 = await wb2.getWorksheet(0);
      const wsData = await (
        ws2 as unknown as {
          _getWsData(): Promise<{
            conditionalFormats: {
              sqref: string;
              rules: { dxfId: string; cfRule: { type: string; operator?: string; text?: string } }[];
            }[];
          }>;
        }
      )._getWsData();
      const cfs = wsData.conditionalFormats;
      expect(cfs.length).toBe(1);
      expect(cfs[0].sqref).toBe("A1:A5");
      const rules = cfs[0].rules;
      expect(rules.map((r) => r.cfRule.type)).toEqual([
        "containsText",
        "beginsWith",
        "endsWith",
      ]);
      expect(rules.map((r) => r.cfRule.operator)).toEqual([
        "containsText",
        "beginsWith",
        "endsWith",
      ]);
      expect(rules.map((r) => r.cfRule.text)).toEqual(["사", "청", "과"]);

      const styleData = await (
        wb2 as unknown as { zipCache: { get(p: string): Promise<{ dxfs: unknown[] }> } }
      ).zipCache.get("xl/styles.xml");
      expect(styleData.dxfs.length).toBe(3);
    } finally {
      await wb2.close();
    }
  });
});
