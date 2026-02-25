import { describe, expect, it } from "vitest";
import { bytesFromHex, DateOnly, DateTime, Time, Uuid } from "@simplysm/core-common";
import { parseQueryResult } from "../../src/utils/result-parser";
import type { ResultMeta } from "../../src/types/db";

describe("result-parser", () => {
  //#region ========== 타입 파싱 ==========

  describe("type parsing", () => {
    it("number conversion", async () => {
      const raw = [{ id: "123", count: 456 }];
      const meta: ResultMeta = {
        columns: { id: "number", count: "number" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ id: 123, count: 456 }]);
    });

    it("string conversion", async () => {
      const raw = [{ name: "Gildong Hong", code: 12345 }];
      const meta: ResultMeta = {
        columns: { name: "string", code: "string" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ name: "Gildong Hong", code: "12345" }]);
    });

    it("boolean conversion - 0/1", async () => {
      const raw = [{ active: 1, deleted: 0 }];
      const meta: ResultMeta = {
        columns: { active: "boolean", deleted: "boolean" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ active: true, deleted: false }]);
    });

    it("boolean conversion - true/false", async () => {
      const raw = [{ active: true, deleted: false }];
      const meta: ResultMeta = {
        columns: { active: "boolean", deleted: "boolean" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ active: true, deleted: false }]);
    });

    it('boolean conversion - "0"/"1" 문자열', async () => {
      const raw = [{ active: "1", deleted: "0" }];
      const meta: ResultMeta = {
        columns: { active: "boolean", deleted: "boolean" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ active: true, deleted: false }]);
    });

    it("DateTime conversion", async () => {
      const raw = [{ createdAt: "2026-01-07T10:30:00.000" }];
      const meta: ResultMeta = {
        columns: { createdAt: "DateTime" },
        joins: {},
      };

      const result = await parseQueryResult<{ createdAt: DateTime }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].createdAt).toBeInstanceOf(DateTime);
      expect(result![0].createdAt.year).toBe(2026);
      expect(result![0].createdAt.month).toBe(1);
      expect(result![0].createdAt.day).toBe(7);
      expect(result![0].createdAt.hour).toBe(10);
      expect(result![0].createdAt.minute).toBe(30);
    });

    it("DateOnly conversion", async () => {
      const raw = [{ birthDate: "2000-05-15" }];
      const meta: ResultMeta = {
        columns: { birthDate: "DateOnly" },
        joins: {},
      };

      const result = await parseQueryResult<{ birthDate: DateOnly }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].birthDate).toBeInstanceOf(DateOnly);
      expect(result![0].birthDate.toString()).toBe("2000-05-15");
    });

    it("Time conversion", async () => {
      const raw = [{ startTime: "14:30:00" }];
      const meta: ResultMeta = {
        columns: { startTime: "Time" },
        joins: {},
      };

      const result = await parseQueryResult<{ startTime: Time }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].startTime).toBeInstanceOf(Time);
      expect(result![0].startTime.hour).toBe(14);
      expect(result![0].startTime.minute).toBe(30);
      expect(result![0].startTime.second).toBe(0);
    });

    it("Uuid conversion - 문자열", async () => {
      const uuidStr = "550e8400-e29b-41d4-a716-446655440000";
      const raw = [{ id: uuidStr }];
      const meta: ResultMeta = {
        columns: { id: "Uuid" },
        joins: {},
      };

      const result = await parseQueryResult<{ id: Uuid }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].id).toBeInstanceOf(Uuid);
      expect(result![0].id.toString()).toBe(uuidStr);
    });

    it("Uuid conversion - Uint8Array", async () => {
      const uuidStr = "550e8400-e29b-41d4-a716-446655440000";
      const uuidBytes = bytesFromHex(uuidStr.replace(/-/g, ""));
      const raw = [{ id: uuidBytes }];
      const meta: ResultMeta = {
        columns: { id: "Uuid" },
        joins: {},
      };

      const result = await parseQueryResult<{ id: Uuid }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].id).toBeInstanceOf(Uuid);
      expect(result![0].id.toString()).toBe(uuidStr);
    });

    it("Bytes conversion - Uint8Array 그대로", async () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      const raw = [{ data: bytes }];
      const meta: ResultMeta = {
        columns: { data: "Bytes" },
        joins: {},
      };

      const result = await parseQueryResult<{ data: Uint8Array }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].data).toBeInstanceOf(Uint8Array);
      expect(Array.from(result![0].data)).toEqual([0x01, 0x02, 0x03]);
    });

    it("Bytes conversion - hex 문자열", async () => {
      // [0x01, 0x02, 0x03]의 hex 표현
      const hexStr = "010203";
      const raw = [{ data: hexStr }];
      const meta: ResultMeta = {
        columns: { data: "Bytes" },
        joins: {},
      };

      const result = await parseQueryResult<{ data: Uint8Array }>(raw, meta);
      expect(result).toBeDefined();
      expect(result![0].data).toBeInstanceOf(Uint8Array);
      expect(Array.from(result![0].data)).toEqual([0x01, 0x02, 0x03]);
    });
  });

  //#endregion

  //#region ========== null/undefined processing ==========

  describe("null/undefined processing", () => {
    it("null 값은 키가 제거됨", async () => {
      const raw = [{ id: 1, name: null }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ id: 1 }]);
      expect(result![0]).not.toHaveProperty("name");
    });

    it("undefined 값은 키가 제거됨", async () => {
      const raw = [{ id: 1, name: undefined }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ id: 1 }]);
      expect(result![0]).not.toHaveProperty("name");
    });

    it("모든 값이 null인 레코드는 제외됨", async () => {
      const raw = [{ id: null, name: null }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toBeUndefined();
    });

    it("빈 배열은 undefined 반환", async () => {
      const raw: Record<string, unknown>[] = [];
      const meta: ResultMeta = {
        columns: { id: "number" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toBeUndefined();
    });

    it("columns에 없는 column은 무시", async () => {
      const raw = [{ id: 1, name: "Gildong Hong", extra: "무시됨" }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ id: 1, name: "Gildong Hong" }]);
      expect(result![0]).not.toHaveProperty("extra");
    });
  });

  //#endregion

  //#region ========== 에러 processing ==========

  describe("error processing", () => {
    it("number throw if parsing fails", async () => {
      const raw = [{ id: "invalid" }];
      const meta: ResultMeta = {
        columns: { id: "number" },
        joins: {},
      };

      await expect(parseQueryResult(raw, meta)).rejects.toThrow("number 파싱 실패");
    });

    it("DateTime throw if parsing fails", async () => {
      const raw = [{ createdAt: "invalid-date" }];
      const meta: ResultMeta = {
        columns: { createdAt: "DateTime" },
        joins: {},
      };

      await expect(parseQueryResult(raw, meta)).rejects.toThrow();
    });

    it("Uuid throw if parsing fails", async () => {
      const raw = [{ id: "invalid-uuid" }];
      const meta: ResultMeta = {
        columns: { id: "Uuid" },
        joins: {},
      };

      await expect(parseQueryResult(raw, meta)).rejects.toThrow("UUID 형식이 올바르지 않습니다");
    });

    it("Bytes throw if parsing fails", async () => {
      const raw = [{ data: 12345 }]; // Number는 Bytes로 conversion 불가
      const meta: ResultMeta = {
        columns: { data: "Bytes" },
        joins: {},
      };

      await expect(parseQueryResult(raw, meta)).rejects.toThrow("Bytes 파싱 실패");
    });
  });

  //#endregion

  //#region ========== 1레벨 JOIN ==========

  describe("1-level JOIN", () => {
    it("isSingle: true - 단일 객체", async () => {
      const raw = [{ "id": 1, "name": "User1", "company.id": 100, "company.name": "Corp" }];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "company.id": "number",
          "company.name": "string",
        },
        joins: { company: { isSingle: true } },
      };

      const result = await parseQueryResult(raw, meta);
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
        { "id": 1, "name": "User1", "posts.id": 10, "posts.title": "Post1" },
        { "id": 1, "name": "User1", "posts.id": 11, "posts.title": "Post2" },
      ];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "posts.id": "number",
          "posts.title": "string",
        },
        joins: { posts: { isSingle: false } },
      };

      const result = await parseQueryResult(raw, meta);
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
        { "id": 1, "name": "User1", "company.id": 100, "company.name": "Corp1" },
        { "id": 1, "name": "User1", "company.id": 200, "company.name": "Corp2" },
      ];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "company.id": "number",
          "company.name": "string",
        },
        joins: { company: { isSingle: true } },
      };

      await expect(parseQueryResult(raw, meta)).rejects.toThrow(
        "isSingle 관계 'company'에 여러 개의 다른 결과가 존재합니다",
      );
    });

    it("빈 JOIN 결과는 키가 N/A", async () => {
      const raw = [{ "id": 1, "name": "User1", "company.id": null, "company.name": null }];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "company.id": "number",
          "company.name": "string",
        },
        joins: { company: { isSingle: true } },
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ id: 1, name: "User1" }]);
      expect(result![0]).not.toHaveProperty("company");
    });

    it("여러 루트 레코드와 JOIN", async () => {
      const raw = [
        { "id": 1, "name": "User1", "posts.id": 10, "posts.title": "Post1" },
        { "id": 2, "name": "User2", "posts.id": 20, "posts.title": "Post2" },
        { "id": 2, "name": "User2", "posts.id": 21, "posts.title": "Post3" },
      ];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "posts.id": "number",
          "posts.title": "string",
        },
        joins: { posts: { isSingle: false } },
      };

      const result = await parseQueryResult(raw, meta);
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

  describe("multi-level JOIN", () => {
    it("2레벨 중첩", async () => {
      const raw = [
        {
          "id": 1,
          "name": "User1",
          "posts.id": 10,
          "posts.title": "Post1",
          "posts.comments.id": 100,
          "posts.comments.text": "Comment1",
        },
        {
          "id": 1,
          "name": "User1",
          "posts.id": 10,
          "posts.title": "Post1",
          "posts.comments.id": 101,
          "posts.comments.text": "Comment2",
        },
      ];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "posts.id": "number",
          "posts.title": "string",
          "posts.comments.id": "number",
          "posts.comments.text": "string",
        },
        joins: {
          "posts": { isSingle: false },
          "posts.comments": { isSingle: false },
        },
      };

      const result = await parseQueryResult(raw, meta);
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
          "id": 1,
          "name": "User1",
          "posts.id": 10,
          "posts.title": "Post1",
          "posts.comments.id": 100,
          "posts.comments.text": "Comment1",
          "posts.comments.replies.id": 1000,
          "posts.comments.replies.text": "Reply1",
        },
        {
          "id": 1,
          "name": "User1",
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
          "id": "number",
          "name": "string",
          "posts.id": "number",
          "posts.title": "string",
          "posts.comments.id": "number",
          "posts.comments.text": "string",
          "posts.comments.replies.id": "number",
          "posts.comments.replies.text": "string",
        },
        joins: {
          "posts": { isSingle: false },
          "posts.comments": { isSingle: false },
          "posts.comments.replies": { isSingle: false },
        },
      };

      const result = await parseQueryResult(raw, meta);
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
          "id": 1,
          "name": "User1",
          "company.id": 100,
          "company.name": "Corp",
          "posts.id": 10,
          "posts.title": "Post1",
        },
        {
          "id": 1,
          "name": "User1",
          "company.id": 100,
          "company.name": "Corp",
          "posts.id": 11,
          "posts.title": "Post2",
        },
      ];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
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

      const result = await parseQueryResult(raw, meta);
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

    it("여러 JOIN 중 일부만 NULL - company는 있고 posts는 N/A", async () => {
      const raw = [
        {
          "id": 1,
          "name": "User1",
          "company.id": 100,
          "company.name": "Corp",
          "posts.id": null,
          "posts.title": null,
        },
      ];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
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

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          company: { id: 100, name: "Corp" },
        },
      ]);
      expect(result![0]).not.toHaveProperty("posts");
    });
  });

  //#endregion

  //#region ========== 에지 케이스 ==========

  describe("edge cases", () => {
    it("joins가 빈 객체인 경우", async () => {
      const raw = [{ id: 1, name: "User1" }];
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([{ id: 1, name: "User1" }]);
    });

    it("중복 데이터 제거", async () => {
      const raw = [
        { "id": 1, "name": "User1", "posts.id": 10, "posts.title": "Post1" },
        { "id": 1, "name": "User1", "posts.id": 10, "posts.title": "Post1" }, // 중복
      ];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "posts.id": "number",
          "posts.title": "string",
        },
        joins: { posts: { isSingle: false } },
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          posts: [{ id: 10, title: "Post1" }], // 중복 제거됨
        },
      ]);
    });

    it("isSingle: true - 동일한 데이터는 에러 N/A", async () => {
      const raw = [
        { "id": 1, "name": "User1", "company.id": 100, "company.name": "Corp" },
        { "id": 1, "name": "User1", "company.id": 100, "company.name": "Corp" }, // 동일
      ];
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "company.id": "number",
          "company.name": "string",
        },
        joins: { company: { isSingle: true } },
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toEqual([
        {
          id: 1,
          name: "User1",
          company: { id: 100, name: "Corp" },
        },
      ]);
    });

    it("대용량 데이터 yield processing", async () => {
      // 250개 레코드 생성 (yield가 2회 발생: i=100, i=200)
      const raw = Array.from({ length: 250 }, (_, i) => ({
        id: String(i + 1),
        name: `User${i + 1}`,
      }));
      const meta: ResultMeta = {
        columns: { id: "number", name: "string" },
        joins: {},
      };

      const result = await parseQueryResult(raw, meta);
      expect(result).toHaveLength(250);
      expect(result![0]).toEqual({ id: 1, name: "User1" });
      expect(result![249]).toEqual({ id: 250, name: "User250" });
    });
  });

  //#endregion
});
