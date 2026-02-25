import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

// If globalThis.window doesn't exist, it's a Node.js environment
declare const window: unknown;
// Node.js only types (to pass type checking in browser environment as well)
declare const require: (id: string) => unknown;

/**
 * Load PNG file (branching between Node/browser environments)
 */
async function loadPngFile(): Promise<Uint8Array> {
  const url = new URL("./fixtures/logo.png", import.meta.url);

  // Node environment: use fs
  if (typeof window === "undefined") {
    const fs = require("fs") as { readFileSync: (path: string) => Uint8Array };
    const { fileURLToPath } = require("url") as { fileURLToPath: (url: URL) => string };
    const filePath = fileURLToPath(url);
    return new Uint8Array(fs.readFileSync(filePath));
  }

  // Browser environment: use fetch
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Integration test: verify ExcelWorksheet.addImage behavior
 */

describe("ExcelWorksheet.addImage integration", () => {
  it("should write media, drawing, drawing rels, worksheet rel and content types", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet("Sheet1");

    const bytes = await loadPngFile();

    // call addImage (the single entry API)
    await ws.addImage({
      bytes,
      ext: "png",
      from: { r: 0, c: 0 },
      to: { r: 2, c: 2 },
    });

    // --- 1) Check media exists and its content
    const mediaPath = `xl/media/image1.png`;
    const mediaObj = await (ws as any)._zipCache.get(mediaPath);
    expect(mediaObj).toBeDefined();
    expect(mediaObj instanceof Uint8Array).toBe(true);
    expect(mediaObj).toEqual(bytes);

    // --- 2) Check Content Types has media / drawing override
    const types = await (ws as any)._zipCache.get("[Content_Types].xml");
    expect(types).toBeDefined();
    // types is likely an ExcelXmlContentType instance
    const overrides = types.data?.Types?.Override ?? [];
    expect(overrides.some((o: any) => o.$.PartName === "/xl/media/image1.png")).toBeTruthy();
    expect(overrides.some((o: any) => o.$.PartName === "/xl/drawings/drawing1.xml")).toBeTruthy();

    // --- 3) Check drawing xml exists and a:blip r:embed is set as rId
    const drawingPath = "xl/drawings/drawing1.xml";
    const drawingObj = await (ws as any)._zipCache.get(drawingPath);
    expect(drawingObj).toBeDefined();

    // drawingObj is likely an ExcelXmlDrawing object — check internal structure
    const wsDr = drawingObj?.data?.wsDr;
    expect(wsDr).toBeDefined();
    const anchors = wsDr.twoCellAnchor ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    const pic = anchors[0].pic?.[0];
    expect(pic).toBeDefined();
    const aBlip = pic?.blipFill?.[0]?.["a:blip"]?.[0];
    expect(aBlip).toBeDefined();
    const embedVal = aBlip?.$?.["r:embed"];
    expect(typeof embedVal === "string" && /^rId\d+$/.test(embedVal)).toBeTruthy();

    // --- 4) Check drawing rels exists and references media target
    const drawingRels = await (ws as any)._zipCache.get("xl/drawings/_rels/drawing1.xml.rels");
    expect(drawingRels).toBeDefined();
    const relsArr = drawingRels?.data?.Relationships?.Relationship ?? [];
    expect(relsArr.some((r: any) => r.$.Target === "../media/image1.png")).toBeTruthy();

    // --- 5) Check worksheet rels has drawing rel added and worksheet xml has <drawing r:id="..."/>
    const sheetFileName = (ws as any)._targetFileName; // e.g., "sheet1.xml"
    const sheetRelsPath = `xl/worksheets/_rels/${sheetFileName}.rels`;
    const sheetRels = await (ws as any)._zipCache.get(sheetRelsPath);
    expect(sheetRels).toBeDefined();
    const sheetRelsArr = sheetRels?.data?.Relationships?.Relationship ?? [];
    expect(
      sheetRelsArr.some(
        (r: any) => r.$.Target != null && r.$.Target.indexOf("/drawings/drawing") !== -1,
      ),
    ).toBeTruthy();

    const wsXml = await (ws as any)._zipCache.get(`xl/worksheets/${sheetFileName}`);
    expect(wsXml).toBeDefined();
    expect(Array.isArray(wsXml.data?.worksheet?.drawing)).toBeTruthy();
    const drawingElems = wsXml.data.worksheet.drawing;
    expect(drawingElems.some((d: any) => d.$ != null && d.$["r:id"] != null)).toBeTruthy();

    // Verify buffer creation
    const resultBuffer = await wb.getBytes();
    expect(resultBuffer).toBeDefined();
    expect(resultBuffer.length).toBeGreaterThan(0);
  });

  it("can insert multiple images into the same worksheet", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet("Sheet1");

    const bytes = await loadPngFile();

    // Insert first image
    await ws.addImage({
      bytes,
      ext: "png",
      from: { r: 0, c: 0 },
      to: { r: 2, c: 2 },
    });

    // Insert second image (different location)
    await ws.addImage({
      bytes,
      ext: "png",
      from: { r: 3, c: 0 },
      to: { r: 5, c: 2 },
    });

    // --- 1) Check that two media files were created
    const media1 = await (ws as any)._zipCache.get("xl/media/image1.png");
    const media2 = await (ws as any)._zipCache.get("xl/media/image2.png");
    expect(media1).toBeDefined();
    expect(media2).toBeDefined();
    expect(media1 instanceof Uint8Array).toBe(true);
    expect(media2 instanceof Uint8Array).toBe(true);

    // --- 2) Check that both images are registered in Content Types
    const types = await (ws as any)._zipCache.get("[Content_Types].xml");
    const overrides = types.data?.Types?.Override ?? [];
    expect(overrides.some((o: any) => o.$.PartName === "/xl/media/image1.png")).toBeTruthy();
    expect(overrides.some((o: any) => o.$.PartName === "/xl/media/image2.png")).toBeTruthy();

    // --- 3) Check that drawing xml has two anchors
    const drawingObj = await (ws as any)._zipCache.get("xl/drawings/drawing1.xml");
    const anchors = drawingObj?.data?.wsDr?.twoCellAnchor ?? [];
    expect(anchors.length).toBe(2);

    // First image anchor
    const pic1 = anchors[0].pic?.[0];
    expect(pic1).toBeDefined();
    const embed1 = pic1?.blipFill?.[0]?.["a:blip"]?.[0]?.$?.["r:embed"];
    expect(embed1).toBeDefined();

    // Second image anchor
    const pic2 = anchors[1].pic?.[0];
    expect(pic2).toBeDefined();
    const embed2 = pic2?.blipFill?.[0]?.["a:blip"]?.[0]?.$?.["r:embed"];
    expect(embed2).toBeDefined();

    // Check that rIds are different
    expect(embed1).not.toBe(embed2);

    // --- 4) Check that drawing rels have relationships for both images
    const drawingRels = await (ws as any)._zipCache.get("xl/drawings/_rels/drawing1.xml.rels");
    const relsArr = drawingRels?.data?.Relationships?.Relationship ?? [];
    expect(relsArr.some((r: any) => r.$.Target === "../media/image1.png")).toBeTruthy();
    expect(relsArr.some((r: any) => r.$.Target === "../media/image2.png")).toBeTruthy();

    // Verify buffer creation
    const resultBuffer = await wb.getBytes();
    expect(resultBuffer).toBeDefined();
    expect(resultBuffer.length).toBeGreaterThan(0);
  });

  it("throws error for unsupported file extensions", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet("Sheet1");

    await expect(
      ws.addImage({
        bytes: new Uint8Array([0, 1, 2, 3]),
        ext: "xyz123",
        from: { r: 0, c: 0 },
      }),
    ).rejects.toThrow("Cannot determine MIME type");
  });
});
