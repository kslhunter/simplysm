import { SdExcelWorkbook, SdExcelWorksheet } from "@simplysm/sd-excel";
import { FsUtil } from "@simplysm/sd-core-node";
import path from "path";
import { fileURLToPath } from "url";
import { expect } from "chai";
import { DateOnly, DateTime } from "@simplysm/sd-core-common";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("(node) excel.SdExcelWorkbook", () => {
  const wsTestAsync = async (ws: SdExcelWorksheet): Promise<void> => {
    //-- Range
    expect((await ws.getRangeAsync()).e).deep.equals({ r: 0, c: 0 });

    //-- 숫자 입력
    await ws.cell(0, 0).setValAsync(3);
    await ws.cell(0, 1).setValAsync(2);
    await ws.cell(0, 3).setValAsync(1);

    expect((await ws.getRangeAsync()).e).deep.equals({ r: 0, c: 3 });

    expect(await ws.cell(0, 0).getValAsync()).equals(3);
    expect(await ws.cell(0, 1).getValAsync()).equals(2);
    expect(await ws.cell(0, 3).getValAsync()).equals(1);


    //-- 삭제 테스트 (ROW 함께 삭제)
    await ws.cell(1, 0).setValAsync(4);
    await ws.cell(1, 4).setValAsync(5);
    expect((await ws.getRangeAsync()).e).deep.equals({ r: 1, c: 4 });

    // COL 줄여보기
    await ws.cell(1, 4).setValAsync(undefined);
    expect((await ws.getRangeAsync()).e).deep.equals({ r: 1, c: 3 });

    // ROW 줄여보기
    await ws.cell(1, 0).setValAsync(undefined);
    expect((await ws.getRangeAsync()).e).deep.equals({ r: 0, c: 3 });

    //-- 문자 입력
    await ws.cell(2, 0).setValAsync("문자입력01");
    expect(await ws.cell(2, 0).getValAsync()).equals("문자입력01");

    //--  BOOLEAN 입력
    await ws.cell(2, 1).setValAsync(true);
    await ws.cell(2, 2).setValAsync(false);
    expect(await ws.cell(2, 1).getValAsync()).equals(true);
    expect(await ws.cell(2, 2).getValAsync()).equals(false);

    //--  DateOnly 2개 입력
    await ws.cell(2, 3).setValAsync(new DateOnly(2022, 3, 5));
    await ws.cell(2, 4).setValAsync(new DateOnly(2022, 3, 10));
    expect(await ws.cell(2, 3).getValAsync()).instanceof(DateOnly);
    expect(await ws.cell(2, 4).getValAsync()).instanceof(DateOnly);
    expect((await ws.cell(2, 3).getValAsync() as DateOnly).tick).equals(new DateOnly(2022, 3, 5).tick);
    expect((await ws.cell(2, 4).getValAsync() as DateOnly).tick).equals(new DateOnly(2022, 3, 10).tick);

    //--  DateTime 입력
    await ws.cell(2, 5).setValAsync(new DateTime(2022, 3, 10, 10, 30, 24));
    expect(await ws.cell(2, 5).getValAsync()).instanceof(DateTime);
    expect((await ws.cell(2, 5).getValAsync() as DateTime).tick).equals(new DateTime(2022, 3, 10, 10, 30, 24).tick);

    //-- MERGE
    await ws.cell(2, 5).mergeAsync(3, 6);
    expect((await ws.getRangeAsync()).e).deep.equals({ r: 3, c: 6 });
    expect(await ws.cell(2, 5).getValAsync()).instanceof(DateTime);
    expect((await ws.cell(2, 5).getValAsync() as DateTime).tick).equals(new DateTime(2022, 3, 10, 10, 30, 24).tick);
  };

  it("새파일", async () => {
    const wb = SdExcelWorkbook.create();
    const ws = await wb.createWorksheetAsync("테스트");

    await wsTestAsync(ws);

    const buffer = await wb.getBufferAsync();
    await FsUtil.writeFileAsync(path.resolve(__dirname, ".output/새파일.xlsx"), buffer);
  });

  it("미리만든 파일", async () => {
    const buffer = await FsUtil.readFileBufferAsync(path.resolve(__dirname, "SdExcelWorkbookTestDir/미리만든파일.xlsx"));
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    const ws = await wb.getWorksheetAsync("Sheet1");

    await wsTestAsync(ws);

    const buffer2 = await wb.getBufferAsync();
    await FsUtil.writeFileAsync(path.resolve(__dirname, ".output/새파일2.xlsx"), buffer2);
  });

  it("KE24", async () => {
    const buffer = await FsUtil.readFileBufferAsync(path.resolve(__dirname, "SdExcelWorkbookTestDir/KE24.xlsx"));
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    const ws = await wb.getWorksheetAsync("Sheet1");

    console.log(1);
    await ws.getDataTableAsync();
    console.log(2);
  });

  /*it("대량 데이터 읽기", async () => {
    const buffer = await FsUtil.readFileBufferAsync(path.resolve(__dirname, "SdExcelWorkbookTestDir/초기화.xlsx"));
    const wb = await SdExcelWorkbook.loadAsync(buffer);
    const wsNames = await wb.getWorksheetNamesAsync();
    expect(wsNames).deep.equals([
      "노드",
      "센서",
      "실시간전력",
      "실시간측정",
      "실시간생산"
    ]);

    {
      console.log("노드");
      expect(wsNames[0]).equals("노드");
      const ws = await wb.getWorksheetAsync(wsNames[0]);
      const cells = await ws.getCellsAsync();
      expect(cells.length).equals(86);
    }

    {
      console.log("센서");
      expect(wsNames[1]).equals("센서");
      const ws = await wb.getWorksheetAsync(wsNames[1]);
      const cells = await ws.getCellsAsync();
      expect(cells.length).equals(63);
    }

    {
      console.log("실시간전력");
      expect(wsNames[2]).equals("실시간전력");
      const ws = await wb.getWorksheetAsync(wsNames[2]);
      const cells = await ws.getCellsAsync();
      expect(cells.length).equals(632146);
    }

    {
      console.log("실시간측정");
      expect(wsNames[3]).equals("실시간측정");
      const ws = await wb.getWorksheetAsync(wsNames[3]);
      const cells = await ws.getCellsAsync();
      expect(cells.length).equals(257654);
    }

    {
      console.log("실시간생산");
      expect(wsNames[4]).equals("실시간생산");
      const ws = await wb.getWorksheetAsync(wsNames[4]);
      const cells = await ws.getCellsAsync();
      expect(cells.length).equals(8735);
    }
  });*/
});
