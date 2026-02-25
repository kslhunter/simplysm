import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ExcelWrapper } from "../src/excel-wrapper";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";

describe("ExcelWrapper", () => {
  const testSchema = z.object({
    name: z.string().describe("이름"),
    age: z.number().describe("나이"),
    email: z.string().optional().describe("이메일"),
    active: z.boolean().default(false).describe("활성화"),
  });

  describe("write", () => {
    it("can convert records to Excel", async () => {
      const wrapper = new ExcelWrapper(testSchema);

      const records = [
        { name: "홍길동", age: 30, email: "hong@test.com", active: true },
        { name: "김철수", age: 25 },
      ];

      const wb = await wrapper.write("Users", records);
      const ws = await wb.getWorksheet("Users");

      // Check headers
      expect(await ws.cell(0, 0).getVal()).toBe("이름");
      expect(await ws.cell(0, 1).getVal()).toBe("나이");
      expect(await ws.cell(0, 2).getVal()).toBe("이메일");
      expect(await ws.cell(0, 3).getVal()).toBe("활성화");

      // Check data
      expect(await ws.cell(1, 0).getVal()).toBe("홍길동");
      expect(await ws.cell(1, 1).getVal()).toBe(30);
      expect(await ws.cell(2, 0).getVal()).toBe("김철수");
      expect(await ws.cell(2, 1).getVal()).toBe(25);

      await wb.close();
    });

    it("applies yellow background to required fields", async () => {
      const wrapper = new ExcelWrapper(testSchema);
      const wb = await wrapper.write("Test", [{ name: "Test", age: 20 }]);
      const ws = await wb.getWorksheet("Test");

      // Required fields (name, age) have style applied
      const nameStyleId = await ws.cell(0, 0).getStyleId();
      const ageStyleId = await ws.cell(0, 1).getStyleId();

      expect(nameStyleId).toBeDefined();
      expect(ageStyleId).toBeDefined();

      await wb.close();
    });
  });

  describe("read", () => {
    it("can read records from Excel", async () => {
      const wrapper = new ExcelWrapper(testSchema);

      // Create Excel first
      const records = [
        { name: "홍길동", age: 30, email: "hong@test.com", active: true },
        { name: "김철수", age: 25, active: false },
      ];

      const wb = await wrapper.write("Users", records);
      const buffer = await wb.getBytes();
      await wb.close();

      // Read from Excel
      const readRecords = await wrapper.read(buffer, "Users");

      expect(readRecords.length).toBe(2);
      expect(readRecords[0].name).toBe("홍길동");
      expect(readRecords[0].age).toBe(30);
      expect(readRecords[0].email).toBe("hong@test.com");
      expect(readRecords[0].active).toBe(true);
      expect(readRecords[1].name).toBe("김철수");
      expect(readRecords[1].age).toBe(25);
    });

    it("can specify worksheet by index", async () => {
      const wrapper = new ExcelWrapper(testSchema);

      const records = [{ name: "Test", age: 20 }];
      const wb = await wrapper.write("Sheet1", records);
      const buffer = await wb.getBytes();
      await wb.close();

      const readRecords = await wrapper.read(buffer, 0);
      expect(readRecords.length).toBe(1);
      expect(readRecords[0].name).toBe("Test");
    });
  });

  describe("Type conversion", () => {
    it("can convert strings to numbers", async () => {
      const wrapper = new ExcelWrapper(testSchema);

      // Simulate Excel with values stored as strings manually
      const wb = await wrapper.write("Test", [{ name: "Test", age: 25 }]);
      const buffer = await wb.getBytes();
      await wb.close();

      const records = await wrapper.read(buffer);
      expect(typeof records[0].age).toBe("number");
      expect(records[0].age).toBe(25);
    });

    it("applies default values", async () => {
      const wrapper = new ExcelWrapper(testSchema);

      // Save without active field
      const wb = await wrapper.write("Test", [{ name: "Test", age: 20 }]);
      const buffer = await wb.getBytes();
      await wb.close();

      const records = await wrapper.read(buffer);
      expect(records[0].active).toBe(false); // Default value
    });
  });

  describe("Date type support", () => {
    const dateSchema = z.object({
      title: z.string().describe("제목"),
      date: z.instanceof(DateOnly).optional().describe("날짜"),
    });

    it("can read and write DateOnly type", async () => {
      const wrapper = new ExcelWrapper(dateSchema);

      const records = [{ title: "Event 1", date: new DateOnly(2024, 6, 15) }, { title: "Event 2" }];

      const wb = await wrapper.write("Events", records);
      const buffer = await wb.getBytes();
      await wb.close();

      const readRecords = await wrapper.read(buffer, "Events");

      expect(readRecords[0].title).toBe("Event 1");
      expect(readRecords[0].date).toBeInstanceOf(DateOnly);
      expect(readRecords[0].date!.year).toBe(2024);
      expect(readRecords[0].date!.month).toBe(6);
      expect(readRecords[0].date!.day).toBe(15);
      expect(readRecords[1].date).toBeUndefined();
    });

    it("can read and write DateTime type", async () => {
      const dateTimeSchema = z.object({
        title: z.string().describe("제목"),
        datetime: z.instanceof(DateTime).optional().describe("일시"),
      });

      const wrapper = new ExcelWrapper(dateTimeSchema);

      const records = [{ title: "Meeting", datetime: new DateTime(2024, 6, 15, 14, 30, 0) }];

      const wb = await wrapper.write("Events", records);
      const buffer = await wb.getBytes();
      await wb.close();

      const readRecords = await wrapper.read(buffer, "Events");

      expect(readRecords[0].datetime).toBeInstanceOf(DateTime);
      expect(readRecords[0].datetime!.year).toBe(2024);
      expect(readRecords[0].datetime!.month).toBe(6);
      expect(readRecords[0].datetime!.day).toBe(15);
      expect(readRecords[0].datetime!.hour).toBe(14);
      expect(readRecords[0].datetime!.minute).toBe(30);
    });

    it("can read and write Time type", async () => {
      const timeSchema = z.object({
        title: z.string().describe("제목"),
        time: z.instanceof(Time).optional().describe("시간"),
      });

      const wrapper = new ExcelWrapper(timeSchema);

      const records = [{ title: "Alarm", time: new Time(9, 30, 0) }];

      const wb = await wrapper.write("Events", records);
      const buffer = await wb.getBytes();
      await wb.close();

      const readRecords = await wrapper.read(buffer, "Events");

      expect(readRecords[0].time).toBeInstanceOf(Time);
      expect(readRecords[0].time!.hour).toBe(9);
      expect(readRecords[0].time!.minute).toBe(30);
    });
  });

  describe("Error handling", () => {
    it("throws error when reading empty data", async () => {
      const wrapper = new ExcelWrapper(testSchema);

      // Create empty Excel with only headers
      const wb = await wrapper.write("Empty", []);
      const buffer = await wb.getBytes();
      await wb.close();

      await expect(wrapper.read(buffer, "Empty")).rejects.toThrow(
        "엑셀파일에서 데이터를 찾을 수 없습니다",
      );
    });

    it("throws error when reading with non-existent worksheet name", async () => {
      const wrapper = new ExcelWrapper(testSchema);

      const wb = await wrapper.write("Test", [{ name: "Test", age: 20 }]);
      const buffer = await wb.getBytes();
      await wb.close();

      await expect(wrapper.read(buffer, "NotExist")).rejects.toThrow();
    });

    it("throws error when reading with non-existent worksheet index", async () => {
      const wrapper = new ExcelWrapper(testSchema);

      const wb = await wrapper.write("Test", [{ name: "Test", age: 20 }]);
      const buffer = await wb.getBytes();
      await wb.close();

      await expect(wrapper.read(buffer, 99)).rejects.toThrow();
    });

    it("throws error with worksheet name and detailed error when schema validation fails", async () => {
      const strictSchema = z.object({
        name: z.string().min(5).describe("이름"), // At least 5 characters
        age: z.number().min(0).max(150).describe("나이"), // Between 0 and 150
      });

      // Create Excel with valid data
      const wrapper = new ExcelWrapper(strictSchema);
      const wb = await wrapper.write("Validation", [{ name: "홍길동홍길동", age: 30 }]);

      // Modify data directly to trigger validation failure
      const ws = await wb.getWorksheet("Validation");
      await ws.cell(1, 0).setVal("AB"); // Change to less than 5 characters

      const buffer = await wb.getBytes();
      await wb.close();

      // Should throw validation error
      await expect(wrapper.read(buffer, "Validation")).rejects.toThrow();
    });
  });

  describe("excludes option", () => {
    const fullSchema = z.object({
      name: z.string().describe("이름"),
      age: z.number().describe("나이"),
      email: z.string().optional().describe("이메일"),
      phone: z.string().optional().describe("전화번호"),
    });

    it("excludes specified fields from columns on write", async () => {
      const wrapper = new ExcelWrapper(fullSchema);

      const records = [{ name: "홍길동", age: 30, email: "hong@test.com", phone: "010-1234-5678" }];
      const wb = await wrapper.write("Test", records, { excludes: ["email", "phone"] });
      const ws = await wb.getWorksheet("Test");

      // Headers: only name and age exist
      expect(await ws.cell(0, 0).getVal()).toBe("이름");
      expect(await ws.cell(0, 1).getVal()).toBe("나이");
      expect(await ws.cell(0, 2).getVal()).toBeUndefined();

      // Check data
      expect(await ws.cell(1, 0).getVal()).toBe("홍길동");
      expect(await ws.cell(1, 1).getVal()).toBe(30);

      await wb.close();
    });

    it("ignores excluded fields on read", async () => {
      const wrapper = new ExcelWrapper(fullSchema);

      // Create Excel with all fields
      const records = [{ name: "홍길동", age: 30, email: "hong@test.com", phone: "010-1234-5678" }];
      const wb = await wrapper.write("Test", records);
      const buffer = await wb.getBytes();
      await wb.close();

      // Read with excludes
      const readRecords = await wrapper.read(buffer, "Test", { excludes: ["email", "phone"] });

      expect(readRecords[0].name).toBe("홍길동");
      expect(readRecords[0].age).toBe(30);
      expect(readRecords[0].email).toBeUndefined();
      expect(readRecords[0].phone).toBeUndefined();
    });
  });
});
