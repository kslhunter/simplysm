import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

// globalThis.window가 없으면 Node.js 환경
declare const window: unknown;
// Node.js 전용 타입 (browser 환경에서도 타입체크가 통과되도록)
declare const require: (id: string) => unknown;

/**
 * PNG 파일 로드 (Node/브라우저 환경 분기)
 */
async function loadPngFile(): Promise<Uint8Array> {
  const url = new URL("./fixtures/logo.png", import.meta.url);

  // Node 환경: fs 사용
  if (typeof window === "undefined") {
    const fs = require("fs") as { readFileSync: (path: string) => Uint8Array };
    const { fileURLToPath } = require("url") as { fileURLToPath: (url: URL) => string };
    const filePath = fileURLToPath(url);
    return new Uint8Array(fs.readFileSync(filePath));
  }

  // 브라우저 환경: fetch 사용
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * 통합 테스트: ExcelWorksheet.addImage 동작 검증
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

    // --- 1) media 존재 및 내용 검사
    const mediaPath = `xl/media/image1.png`;
    const mediaObj = await (ws as any)._zipCache.get(mediaPath);
    expect(mediaObj).toBeDefined();
    expect(mediaObj instanceof Uint8Array).toBe(true);
    expect(mediaObj).toEqual(bytes);

    // --- 2) Content Types 에 media / drawing override 존재
    const types = await (ws as any)._zipCache.get("[Content_Types].xml");
    expect(types).toBeDefined();
    // types는 ExcelXmlContentType 인스턴스일 가능성이 높음
    const overrides = types.data?.Types?.Override ?? [];
    expect(overrides.some((o: any) => o.$.PartName === "/xl/media/image1.png")).toBeTruthy();
    expect(overrides.some((o: any) => o.$.PartName === "/xl/drawings/drawing1.xml")).toBeTruthy();

    // --- 3) drawing xml(객체) 존재 및 a:blip r:embed가 rId로 설정되어 있는지 확인
    const drawingPath = "xl/drawings/drawing1.xml";
    const drawingObj = await (ws as any)._zipCache.get(drawingPath);
    expect(drawingObj).toBeDefined();

    // drawingObj는 객체(ExcelXmlDrawing)일 가능성이 높음 — 내부 구조 확인
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

    // --- 4) drawing rels 존재 및 media target 참조
    const drawingRels = await (ws as any)._zipCache.get("xl/drawings/_rels/drawing1.xml.rels");
    expect(drawingRels).toBeDefined();
    const relsArr = drawingRels?.data?.Relationships?.Relationship ?? [];
    expect(relsArr.some((r: any) => r.$.Target === "../media/image1.png")).toBeTruthy();

    // --- 5) worksheet rels에 drawing rel 추가 및 worksheet xml에 <drawing r:id="..."/> 존재
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

    // Buffer 생성 검증
    const resultBuffer = await wb.getBytes();
    expect(resultBuffer).toBeDefined();
    expect(resultBuffer.length).toBeGreaterThan(0);
  });

  it("같은 워크시트에 여러 이미지를 삽입할 수 있다", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet("Sheet1");

    const bytes = await loadPngFile();

    // 첫 번째 이미지 삽입
    await ws.addImage({
      bytes,
      ext: "png",
      from: { r: 0, c: 0 },
      to: { r: 2, c: 2 },
    });

    // 두 번째 이미지 삽입 (다른 위치)
    await ws.addImage({
      bytes,
      ext: "png",
      from: { r: 3, c: 0 },
      to: { r: 5, c: 2 },
    });

    // --- 1) 두 개의 media 파일이 각각 생성되었는지 확인
    const media1 = await (ws as any)._zipCache.get("xl/media/image1.png");
    const media2 = await (ws as any)._zipCache.get("xl/media/image2.png");
    expect(media1).toBeDefined();
    expect(media2).toBeDefined();
    expect(media1 instanceof Uint8Array).toBe(true);
    expect(media2 instanceof Uint8Array).toBe(true);

    // --- 2) Content Types에 두 이미지가 모두 등록되었는지 확인
    const types = await (ws as any)._zipCache.get("[Content_Types].xml");
    const overrides = types.data?.Types?.Override ?? [];
    expect(overrides.some((o: any) => o.$.PartName === "/xl/media/image1.png")).toBeTruthy();
    expect(overrides.some((o: any) => o.$.PartName === "/xl/media/image2.png")).toBeTruthy();

    // --- 3) drawing xml에 두 개의 anchor가 있는지 확인
    const drawingObj = await (ws as any)._zipCache.get("xl/drawings/drawing1.xml");
    const anchors = drawingObj?.data?.wsDr?.twoCellAnchor ?? [];
    expect(anchors.length).toBe(2);

    // 첫 번째 이미지 anchor
    const pic1 = anchors[0].pic?.[0];
    expect(pic1).toBeDefined();
    const embed1 = pic1?.blipFill?.[0]?.["a:blip"]?.[0]?.$?.["r:embed"];
    expect(embed1).toBeDefined();

    // 두 번째 이미지 anchor
    const pic2 = anchors[1].pic?.[0];
    expect(pic2).toBeDefined();
    const embed2 = pic2?.blipFill?.[0]?.["a:blip"]?.[0]?.$?.["r:embed"];
    expect(embed2).toBeDefined();

    // 서로 다른 rId인지 확인
    expect(embed1).not.toBe(embed2);

    // --- 4) drawing rels에 두 이미지에 대한 관계가 있는지 확인
    const drawingRels = await (ws as any)._zipCache.get("xl/drawings/_rels/drawing1.xml.rels");
    const relsArr = drawingRels?.data?.Relationships?.Relationship ?? [];
    expect(relsArr.some((r: any) => r.$.Target === "../media/image1.png")).toBeTruthy();
    expect(relsArr.some((r: any) => r.$.Target === "../media/image2.png")).toBeTruthy();

    // Buffer 생성 검증
    const resultBuffer = await wb.getBytes();
    expect(resultBuffer).toBeDefined();
    expect(resultBuffer.length).toBeGreaterThan(0);
  });

  it("지원되지 않는 확장자는 에러 발생", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet("Sheet1");

    await expect(
      ws.addImage({
        bytes: new Uint8Array([0, 1, 2, 3]),
        ext: "xyz123",
        from: { r: 0, c: 0 },
      }),
    ).rejects.toThrow("MIME 타입을 확인할 수 없습니다");
  });
});
