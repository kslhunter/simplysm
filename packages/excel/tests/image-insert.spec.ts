import { describe, expect, it } from "vitest";
import { ExcelWorkbook } from "../src/excel-workbook";

/**
 * 통합 테스트: ExcelWorksheet.addImage 동작 검증
 */

describe("ExcelWorksheet.addImage integration", () => {
  it("should write media, drawing, drawing rels, worksheet rel and content types", async () => {
    const wb = new ExcelWorkbook();
    const ws = await wb.createWorksheet("Sheet1");

    // 브라우저 환경: fetch로 PNG 파일 로드
    const response = await fetch(new URL("./fixtures/logo.png", import.meta.url));
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // call addImage (the single entry API)
    await ws.addImage({
      buffer,
      ext: "png",
      from: { r: 0, c: 0 },
      to: { r: 2, c: 2 },
    });

    // --- 1) media 존재 및 내용 검사
    const mediaPath = `xl/media/image1.png`;
    const mediaObj = await (ws as any)._zipCache.get(mediaPath);
    expect(mediaObj).toBeDefined();
    expect(Buffer.isBuffer(mediaObj)).toBe(true);
    expect((mediaObj as Buffer).equals(buffer)).toBe(true);

    // --- 2) Content Types 에 media / drawing override 존재
    const types = await (ws as any)._zipCache.get("[Content_Types].xml");
    expect(types).toBeDefined();
    // types는 ExcelXmlContentType 인스턴스일 가능성이 높음
    const overrides = (types as any).data?.Types?.Override ?? [];
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
      sheetRelsArr.some((r: any) => r.$.Target && r.$.Target.indexOf("/drawings/drawing") !== -1),
    ).toBeTruthy();

    const wsXml = await (ws as any)._zipCache.get(`xl/worksheets/${sheetFileName}`);
    expect(wsXml).toBeDefined();
    expect(Array.isArray(wsXml.data?.worksheet?.drawing)).toBeTruthy();
    const drawingElems = wsXml.data.worksheet.drawing;
    expect(drawingElems.some((d: any) => d.$ && d.$["r:id"])).toBeTruthy();

    // Buffer 생성 검증
    const resultBuffer = await wb.getBuffer();
    expect(resultBuffer).toBeDefined();
    expect(resultBuffer.length).toBeGreaterThan(0);
  });
});
