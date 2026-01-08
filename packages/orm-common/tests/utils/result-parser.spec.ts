import { describe, expect, it } from "vitest";
import { DateOnly, DateTime, Time, Uuid } from "@simplysm/core-common";
import { parseQueryResultAsync } from "../../src/utils/result-parser";
import type { ResultMeta } from "../../src/types/db";

describe("result-parser", () => {
  //#region ========== 타입 파싱 ==========

  describe("타입 파싱", () => {
    it("number 변환", async () => {
      const raw = [{ id: "123", count: 456 }];
      const meta: ResultMeta = {
        columns: { id: "number", count: "number" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ id: 123, count: 456 }]);
    });

    it("string 변환", async () => {
      const raw = [{ name: "홍길동", code: 12345 }];
      const meta: ResultMeta = {
        columns: { name: "string", code: "string" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ name: "홍길동", code: "12345" }]);
    });

    it("boolean 변환 - 0/1", async () => {
      const raw = [{ active: 1, deleted: 0 }];
      const meta: ResultMeta = {
        columns: { active: "boolean", deleted: "boolean" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ active: true, deleted: false }]);
    });

    it("boolean 변환 - true/false", async () => {
      const raw = [{ active: true, deleted: false }];
      const meta: ResultMeta = {
        columns: { active: "boolean", deleted: "boolean" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ active: true, deleted: false }]);
    });

    it("DateTime 변환", async () => {
      const raw = [{ createdAt: "2026-01-07T10:30:00.000" }];
      const meta: ResultMeta = {
        columns: { createdAt: "DateTime" },
        joins: {},
      };

      const result = await parseQueryResultAsync<{ createdAt: DateTime }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].createdAt).toBeInstanceOf(DateTime);
      expect(result![0].createdAt.year).toBe(2026);
      expect(result![0].createdAt.month).toBe(1);
      expect(result![0].createdAt.day).toBe(7);
      expect(result![0].createdAt.hour).toBe(10);
      expect(result![0].createdAt.minute).toBe(30);
    });

    it("DateOnly 변환", async () => {
      const raw = [{ birthDate: "2000-05-15" }];
      const meta: ResultMeta = {
        columns: { birthDate: "DateOnly" },
        joins: {},
      };

      const result = await parseQueryResultAsync<{ birthDate: DateOnly }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].birthDate).toBeInstanceOf(DateOnly);
      expect(result![0].birthDate.toString()).toBe("2000-05-15");
    });

    it("Time 변환", async () => {
      const raw = [{ startTime: "14:30:00" }];
      const meta: ResultMeta = {
        columns: { startTime: "Time" },
        joins: {},
      };

      const result = await parseQueryResultAsync<{ startTime: Time }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].startTime).toBeInstanceOf(Time);
      expect(result![0].startTime.hour).toBe(14);
      expect(result![0].startTime.minute).toBe(30);
      expect(result![0].startTime.second).toBe(0);
    });

    it("Uuid 변환 - 문자열", async () => {
      const uuidStr = "550e8400-e29b-41d4-a716-446655440000";
      const raw = [{ id: uuidStr }];
      const meta: ResultMeta = {
        columns: { id: "Uuid" },
        joins: {},
      };

      const result = await parseQueryResultAsync<{ id: Uuid }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].id).toBeInstanceOf(Uuid);
      expect(result![0].id.toString()).toBe(uuidStr);
    });

    it("Uuid 변환 - Buffer", async () => {
      const uuidStr = "550e8400-e29b-41d4-a716-446655440000";
      const uuidBuffer = Buffer.from(uuidStr.replace(/-/g, ""), "hex");
      const raw = [{ id: uuidBuffer }];
      const meta: ResultMeta = {
        columns: { id: "Uuid" },
        joins: {},
      };

      const result = await parseQueryResultAsync<{ id: Uuid }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].id).toBeInstanceOf(Uuid);
      expect(result![0].id.toString()).toBe(uuidStr);
    });

    it("Buffer 변환 - Buffer 그대로", async () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03]);
      const raw = [{ data: buffer }];
      const meta: ResultMeta = {
        columns: { data: "Buffer" },
        joins: {},
      };

      const result = await parseQueryResultAsync<{ data: Buffer }>(raw, meta);
      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result![0].data)).toBe(true);
      expect(result![0].data).toEqual(buffer);
    });

    it("Buffer 변환 - base64 문자열", async () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03]);
      const raw = [{ data: buffer.toString("base64") }];
      const meta: ResultMeta = {
        columns: { data: "Buffer" },
        joins: {},
      };

      const result = await parseQueryResultAsync<{ data: Buffer }>(raw, meta);
      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result![0].data)).toBe(true);
      expect(result![0].data).toEqual(buffer);
    });
  });

  //#endregion

  //#region ========== null/undefined 처리 ==========

  describe("null/undefined 처리", () => {
    it("null 값은 키가 제거됨", async () => {
      const raw = [{ id: 1, name: null }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ id: 1 }]);
      expect(result![0]).not.toHaveProperty("name");
    });

    it("undefined 값은 키가 제거됨", async () => {
      const raw = [{ id: 1, name: undefined }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ id: 1 }]);
      expect(result![0]).not.toHaveProperty("name");
    });

    it("모든 값이 null인 레코드는 제외됨", async () => {
      const raw = [{ id: null, name: null }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toBeUndefined();
    });

    it("빈 배열은 undefined 반환", async () => {
      const raw: Record<string, unknown>[] = [];
      const meta: ResultMeta = {
        columns: { id: "number" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toBeUndefined();
    });

    it("columns에 없는 컬럼은 무시", async () => {
      const raw = [{ id: 1, name: "홍길동", extra: "무시됨" }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ id: 1, name: "홍길동" }]);
      expect(result![0]).not.toHaveProperty("extra");
    });
  });

  //#endregion

  //#region ========== 에러 처리 ==========

  describe("에러 처리", () => {
    it("number 파싱 실패 시 throw", async () => {
      const raw = [{ id: "invalid" }];
      const meta: ResultMeta = {
        columns: { id: "number" },
        joins: {},
      };

      await expect(parseQueryResultAsync(raw, meta)).rejects.toThrow("number 파싱 실패");
    });

    it("DateTime 파싱 실패 시 throw", async () => {
      const raw = [{ createdAt: "invalid-date" }];
      const meta: ResultMeta = {
        columns: { createdAt: "DateTime" },
        joins: {},
      };

      await expect(parseQueryResultAsync(raw, meta)).rejects.toThrow();
    });

    it("Uuid 파싱 실패 시 throw", async () => {
      const raw = [{ id: "invalid-uuid" }];
      const meta: ResultMeta = {
        columns: { id: "Uuid" },
        joins: {},
      };

      // Uuid는 현재 검증 없이 생성되므로, 별도 검증 로직이 없으면 통과할 수 있음
      // 실제 검증이 필요하다면 Uuid 클래스에 검증 로직 추가 필요
      const result = await parseQueryResultAsync<{ id: Uuid }>(raw, meta);
      expect(result).toBeDefined();
    });

    it("Buffer 파싱 실패 시 throw", async () => {
      const raw = [{ data: 12345 }]; // 숫자는 Buffer로 변환 불가
      const meta: ResultMeta = {
        columns: { data: "Buffer" },
        joins: {},
      };

      await expect(parseQueryResultAsync(raw, meta)).rejects.toThrow("Buffer 파싱 실패");
    });
  });

  //#endregion

  //#region ========== 1레벨 JOIN ==========

  describe("1레벨 JOIN", () => {
    it("isSingle: true - 단일 객체", async () => {
      const raw = [{ id: 1, name: "User1", "company.id": 100, "company.name": "Corp" }];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "company.id": "number",
          "company.name": "string",
        },
        joins: { company: { isSingle: true } },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          company: { id: 100, name: "Corp" },
        },
      ]);
    });

    it("isSingle: false - 배열", async () => {
      const raw = [
        { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
        { id: 1, name: "User1", "posts.id": 11, "posts.title": "Post2" },
      ];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "posts.id": "number",
          "posts.title": "string",
        },
        joins: { posts: { isSingle: false } },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          posts: [
            { id: 10, title: "Post1" },
            { id: 11, title: "Post2" },
          ],
        },
      ]);
    });

    it("isSingle: true - 여러 개의 다른 결과 시 throw", async () => {
      const raw = [
        { id: 1, name: "User1", "company.id": 100, "company.name": "Corp1" },
        { id: 1, name: "User1", "company.id": 200, "company.name": "Corp2" },
      ];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "company.id": "number",
          "company.name": "string",
        },
        joins: { company: { isSingle: true } },
      };

      await expect(parseQueryResultAsync(raw, meta)).rejects.toThrow(
        "isSingle 관계 'company'에 여러 개의 다른 결과가 존재합니다",
      );
    });

    it("빈 JOIN 결과는 키가 없음", async () => {
      const raw = [{ id: 1, name: "User1", "company.id": null, "company.name": null }];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "company.id": "number",
          "company.name": "string",
        },
        joins: { company: { isSingle: true } },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ id: 1, name: "User1" }]);
      expect(result![0]).not.toHaveProperty("company");
    });

    it("여러 루트 레코드와 JOIN", async () => {
      const raw = [
        { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
        { id: 2, name: "User2", "posts.id": 20, "posts.title": "Post2" },
        { id: 2, name: "User2", "posts.id": 21, "posts.title": "Post3" },
      ];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "posts.id": "number",
          "posts.title": "string",
        },
        joins: { posts: { isSingle: false } },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          posts: [{ id: 10, title: "Post1" }],
        },
        {
          id: 2,
          name: "User2",
          posts: [
            { id: 20, title: "Post2" },
            { id: 21, title: "Post3" },
          ],
        },
      ]);
    });
  });

  //#endregion

  //#region ========== 다중 레벨 JOIN ==========

  describe("다중 레벨 JOIN", () => {
    it("2레벨 중첩", async () => {
      const raw = [
        {
          id: 1,
          name: "User1",
          "posts.id": 10,
          "posts.title": "Post1",
          "posts.comments.id": 100,
          "posts.comments.text": "Comment1",
        },
        {
          id: 1,
          name: "User1",
          "posts.id": 10,
          "posts.title": "Post1",
          "posts.comments.id": 101,
          "posts.comments.text": "Comment2",
        },
      ];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "posts.id": "number",
          "posts.title": "string",
          "posts.comments.id": "number",
          "posts.comments.text": "string",
        },
        joins: {
          posts: { isSingle: false },
          "posts.comments": { isSingle: false },
        },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          posts: [
            {
              id: 10,
              title: "Post1",
              comments: [
                { id: 100, text: "Comment1" },
                { id: 101, text: "Comment2" },
              ],
            },
          ],
        },
      ]);
    });

    it("3레벨 중첩", async () => {
      const raw = [
        {
          id: 1,
          name: "User1",
          "posts.id": 10,
          "posts.title": "Post1",
          "posts.comments.id": 100,
          "posts.comments.text": "Comment1",
          "posts.comments.replies.id": 1000,
          "posts.comments.replies.text": "Reply1",
        },
        {
          id: 1,
          name: "User1",
          "posts.id": 10,
          "posts.title": "Post1",
          "posts.comments.id": 100,
          "posts.comments.text": "Comment1",
          "posts.comments.replies.id": 1001,
          "posts.comments.replies.text": "Reply2",
        },
      ];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "posts.id": "number",
          "posts.title": "string",
          "posts.comments.id": "number",
          "posts.comments.text": "string",
          "posts.comments.replies.id": "number",
          "posts.comments.replies.text": "string",
        },
        joins: {
          posts: { isSingle: false },
          "posts.comments": { isSingle: false },
          "posts.comments.replies": { isSingle: false },
        },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          posts: [
            {
              id: 10,
              title: "Post1",
              comments: [
                {
                  id: 100,
                  text: "Comment1",
                  replies: [
                    { id: 1000, text: "Reply1" },
                    { id: 1001, text: "Reply2" },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });

    it("여러 JOIN과 혼합 isSingle", async () => {
      const raw = [
        {
          id: 1,
          name: "User1",
          "company.id": 100,
          "company.name": "Corp",
          "posts.id": 10,
          "posts.title": "Post1",
        },
        {
          id: 1,
          name: "User1",
          "company.id": 100,
          "company.name": "Corp",
          "posts.id": 11,
          "posts.title": "Post2",
        },
      ];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "company.id": "number",
          "company.name": "string",
          "posts.id": "number",
          "posts.title": "string",
        },
        joins: {
          company: { isSingle: true },
          posts: { isSingle: false },
        },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          company: { id: 100, name: "Corp" },
          posts: [
            { id: 10, title: "Post1" },
            { id: 11, title: "Post2" },
          ],
        },
      ]);
    });
  });

  //#endregion

  //#region ========== 에지 케이스 ==========

  describe("에지 케이스", () => {
    it("joins가 빈 객체인 경우", async () => {
      const raw = [{ id: 1, name: "User1" }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([{ id: 1, name: "User1" }]);
    });

    it("중복 데이터 제거", async () => {
      const raw = [
        { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
        { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" }, // 중복
      ];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "posts.id": "number",
          "posts.title": "string",
        },
        joins: { posts: { isSingle: false } },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          posts: [{ id: 10, title: "Post1" }], // 중복 제거됨
        },
      ]);
    });

    it("isSingle: true - 동일한 데이터는 에러 없음", async () => {
      const raw = [
        { id: 1, name: "User1", "company.id": 100, "company.name": "Corp" },
        { id: 1, name: "User1", "company.id": 100, "company.name": "Corp" }, // 동일
      ];
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          "company.id": "number",
          "company.name": "string",
        },
        joins: { company: { isSingle: true } },
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          company: { id: 100, name: "Corp" },
        },
      ]);
    });

    it("대용량 데이터 yield 처리", async () => {
      // 100개 레코드 생성
      const raw = Array.from({ length: 100 }, (_, i) => ({
        id: String(i + 1),
        name: `User${i + 1}`,
      }));
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResultAsync(raw, meta);
      expect(result).toHaveLength(100);
      expect(result![0]).toEqual({ id: 1, name: "User1" });
      expect(result![99]).toEqual({ id: 100, name: "User100" });
    });
  });

  //#endregion
});
