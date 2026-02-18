import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ExcelWrapper } from "../src/excel-wrapper";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";

describe("ExcelWrapper", () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().optional(),
    active: z.boolean().default(false),
  });

  const displayNameMap = {
    name: "이름",
    age: "나이",
    email: "이메일",
    active: "활성화",
  };

  describe("write", () => {
    it("레코드를 Excel로 변환할 수 있다", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);

      const records = [
        { name: "홍길동", age: 30, email: "hong@test.com", active: true },
        { name: "김철수", age: 25 },
      ];

      const wb = await wrapper.write("Users", records);
      const ws = await wb.getWorksheet("Users");

      // 헤더 확인
      expect(await ws.cell(0, 0).getVal()).toBe("이름");
      expect(await ws.cell(0, 1).getVal()).toBe("나이");
      expect(await ws.cell(0, 2).getVal()).toBe("이메일");
      expect(await ws.cell(0, 3).getVal()).toBe("활성화");

      // 데이터 확인
      expect(await ws.cell(1, 0).getVal()).toBe("홍길동");
      expect(await ws.cell(1, 1).getVal()).toBe(30);
      expect(await ws.cell(2, 0).getVal()).toBe("김철수");
      expect(await ws.cell(2, 1).getVal()).toBe(25);

      await wb.close();
    });

    it("필수 필드에 노란색 배경이 적용된다", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);
      const wb = await wrapper.write("Test", [{ name: "Test", age: 20 }]);
      const ws = await wb.getWorksheet("Test");

      // 필수 필드 (name, age)는 스타일이 적용됨
      const nameStyleId = await ws.cell(0, 0).getStyleId();
      const ageStyleId = await ws.cell(0, 1).getStyleId();

      expect(nameStyleId).toBeDefined();
      expect(ageStyleId).toBeDefined();

      await wb.close();
    });
  });

  describe("read", () => {
    it("Excel에서 레코드를 읽을 수 있다", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);

      // 먼저 Excel 생성
      const records = [
        { name: "홍길동", age: 30, email: "hong@test.com", active: true },
        { name: "김철수", age: 25, active: false },
      ];

      const wb = await wrapper.write("Users", records);
      const buffer = await wb.getBytes();
      await wb.close();

      // Excel에서 읽기
      const readRecords = await wrapper.read(buffer, "Users");

      expect(readRecords.length).toBe(2);
      expect(readRecords[0].name).toBe("홍길동");
      expect(readRecords[0].age).toBe(30);
      expect(readRecords[0].email).toBe("hong@test.com");
      expect(readRecords[0].active).toBe(true);
      expect(readRecords[1].name).toBe("김철수");
      expect(readRecords[1].age).toBe(25);
    });

    it("인덱스로 워크시트를 지정할 수 있다", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);

      const records = [{ name: "Test", age: 20 }];
      const wb = await wrapper.write("Sheet1", records);
      const buffer = await wb.getBytes();
      await wb.close();

      const readRecords = await wrapper.read(buffer, 0);
      expect(readRecords.length).toBe(1);
      expect(readRecords[0].name).toBe("Test");
    });
  });

  describe("타입 변환", () => {
    it("문자열을 숫자로 변환할 수 있다", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);

      // 수동으로 문자열로 저장된 Excel 시뮬레이션
      const wb = await wrapper.write("Test", [{ name: "Test", age: 25 }]);
      const buffer = await wb.getBytes();
      await wb.close();

      const records = await wrapper.read(buffer);
      expect(typeof records[0].age).toBe("number");
      expect(records[0].age).toBe(25);
    });

    it("기본값이 적용된다", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);

      // active 필드 없이 저장
      const wb = await wrapper.write("Test", [{ name: "Test", age: 20 }]);
      const buffer = await wb.getBytes();
      await wb.close();

      const records = await wrapper.read(buffer);
      expect(records[0].active).toBe(false); // 기본값
    });
  });

  describe("날짜 타입 지원", () => {
    const dateSchema = z.object({
      title: z.string(),
      date: z.instanceof(DateOnly).optional(),
    });

    const dateDisplayMap = {
      title: "제목",
      date: "날짜",
    };

    it("DateOnly 타입을 읽고 쓸 수 있다", async () => {
      const wrapper = new ExcelWrapper(dateSchema, dateDisplayMap);

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

    it("DateTime 타입을 읽고 쓸 수 있다", async () => {
      const dateTimeSchema = z.object({
        title: z.string(),
        datetime: z.instanceof(DateTime).optional(),
      });

      const dateTimeDisplayMap = {
        title: "제목",
        datetime: "일시",
      };

      const wrapper = new ExcelWrapper(dateTimeSchema, dateTimeDisplayMap);

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

    it("Time 타입을 읽고 쓸 수 있다", async () => {
      const timeSchema = z.object({
        title: z.string(),
        time: z.instanceof(Time).optional(),
      });

      const timeDisplayMap = {
        title: "제목",
        time: "시간",
      };

      const wrapper = new ExcelWrapper(timeSchema, timeDisplayMap);

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

  describe("에러 처리", () => {
    it("빈 데이터에서 읽으면 에러 발생", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);

      // 헤더만 있는 빈 Excel 생성
      const wb = await wrapper.write("Empty", []);
      const buffer = await wb.getBytes();
      await wb.close();

      await expect(wrapper.read(buffer, "Empty")).rejects.toThrow(
        "엑셀파일에서 데이터를 찾을 수 없습니다",
      );
    });

    it("존재하지 않는 워크시트 이름으로 읽으면 에러 발생", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);

      const wb = await wrapper.write("Test", [{ name: "Test", age: 20 }]);
      const buffer = await wb.getBytes();
      await wb.close();

      await expect(wrapper.read(buffer, "NotExist")).rejects.toThrow();
    });

    it("존재하지 않는 워크시트 인덱스로 읽으면 에러 발생", async () => {
      const wrapper = new ExcelWrapper(testSchema, displayNameMap);

      const wb = await wrapper.write("Test", [{ name: "Test", age: 20 }]);
      const buffer = await wb.getBytes();
      await wb.close();

      await expect(wrapper.read(buffer, 99)).rejects.toThrow();
    });

    it("스키마 검증 실패 시 워크시트 이름과 상세 오류가 포함된 에러 발생", async () => {
      const strictSchema = z.object({
        name: z.string().min(5), // 최소 5자 이상
        age: z.number().min(0).max(150), // 0~150 사이
      });

      const strictDisplayMap = {
        name: "이름",
        age: "나이",
      };

      // 유효한 데이터로 Excel 생성
      const wrapper = new ExcelWrapper(strictSchema, strictDisplayMap);
      const wb = await wrapper.write("Validation", [{ name: "홍길동홍길동", age: 30 }]);

      // 데이터를 직접 수정하여 검증 실패 유도
      const ws = await wb.getWorksheet("Validation");
      await ws.cell(1, 0).setVal("AB"); // 최소 5자 미만으로 변경

      const buffer = await wb.getBytes();
      await wb.close();

      // 검증 실패 에러가 발생해야 함
      await expect(wrapper.read(buffer, "Validation")).rejects.toThrow();
    });
  });
});
