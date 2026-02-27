import { describe, expect, it } from "vitest";
import { parseQueryResult } from "../../src/utils/result-parser";
import type { ResultMeta } from "../../src/types/db";

/**
 * Performance benchmark tests
 *
 * Purpose: measure optimization effect of removing objClone
 * Metrics:
 * - processing time for large simple records
 * - processing time for large JOIN records
 * - processing time for nested JOIN records
 */
describe("result-parser performance", () => {
  // test data generation helpers
  function generateSimpleRecords(count: number): Record<string, unknown>[] {
    return Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      name: `User${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: String(20 + (i % 50)),
      active: i % 2,
    }));
  }

  function generateJoinRecords(userCount: number, postsPerUser: number): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [];
    for (let u = 0; u < userCount; u++) {
      for (let p = 0; p < postsPerUser; p++) {
        records.push({
          "id": String(u + 1),
          "name": `User${u + 1}`,
          "posts.id": String(u * postsPerUser + p + 1),
          "posts.title": `Post${p + 1} by User${u + 1}`,
          "posts.content": `Content of post ${p + 1}`,
        });
      }
    }
    return records;
  }

  function generateNestedJoinRecords(
    userCount: number,
    postsPerUser: number,
    commentsPerPost: number,
  ): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [];
    for (let u = 0; u < userCount; u++) {
      for (let p = 0; p < postsPerUser; p++) {
        for (let c = 0; c < commentsPerPost; c++) {
          records.push({
            "id": String(u + 1),
            "name": `User${u + 1}`,
            "posts.id": String(u * postsPerUser + p + 1),
            "posts.title": `Post${p + 1}`,
            "posts.comments.id": String((u * postsPerUser + p) * commentsPerPost + c + 1),
            "posts.comments.text": `Comment${c + 1}`,
          });
        }
      }
    }
    return records;
  }

  describe("simple record processing", () => {
    it("10,000 records processing - within 500ms", async () => {
      const raw = generateSimpleRecords(10_000);
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          email: "string",
          age: "number",
          active: "boolean",
        },
        joins: {},
      };

      const start = performance.now();
      const result = await parseQueryResult(raw, meta);
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(10_000);
      expect(elapsed).toBeLessThan(500);
      console.log(`  simple 10,000: ${elapsed.toFixed(2)}ms`);
    });

    it("50,000 records processing - within 3000ms", async () => {
      const raw = generateSimpleRecords(50_000);
      const meta: ResultMeta = {
        columns: {
          id: "number",
          name: "string",
          email: "string",
          age: "number",
          active: "boolean",
        },
        joins: {},
      };

      const start = performance.now();
      const result = await parseQueryResult(raw, meta);
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(50_000);
      expect(elapsed).toBeLessThan(3000);
      console.log(`  simple 50,000: ${elapsed.toFixed(2)}ms`);
    });
  });

  describe("1-level JOIN processing", () => {
    it("1,000 users × 10 posts = 10,000 records - within 600ms", async () => {
      const raw = generateJoinRecords(1_000, 10);
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "posts.id": "number",
          "posts.title": "string",
          "posts.content": "string",
        },
        joins: { posts: { isSingle: false } },
      };

      const start = performance.now();
      const result = await parseQueryResult(raw, meta);
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(1_000);
      expect(elapsed).toBeLessThan(600);
      console.log(`  JOIN 10,000 (1000×10): ${elapsed.toFixed(2)}ms`);
    });

    it("5,000 users × 10 posts = 50,000 records - within 3000ms", async () => {
      const raw = generateJoinRecords(5_000, 10);
      const meta: ResultMeta = {
        columns: {
          "id": "number",
          "name": "string",
          "posts.id": "number",
          "posts.title": "string",
          "posts.content": "string",
        },
        joins: { posts: { isSingle: false } },
      };

      const start = performance.now();
      const result = await parseQueryResult(raw, meta);
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(5_000);
      expect(elapsed).toBeLessThan(3000);
      console.log(`  JOIN 50,000 (5000×10): ${elapsed.toFixed(2)}ms`);
    });
  });

  describe("2-level nested JOIN processing", () => {
    it("100 users × 10 posts × 5 comments = 5,000 records - within 500ms", async () => {
      const raw = generateNestedJoinRecords(100, 10, 5);
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

      const start = performance.now();
      const result = await parseQueryResult(raw, meta);
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(100);
      expect(elapsed).toBeLessThan(500);
      console.log(`  nested JOIN 5,000 (100×10×5): ${elapsed.toFixed(2)}ms`);
    });

    it("500 users × 10 posts × 5 comments = 25,000 records - within 2000ms", async () => {
      const raw = generateNestedJoinRecords(500, 10, 5);
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

      const start = performance.now();
      const result = await parseQueryResult(raw, meta);
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(500);
      expect(elapsed).toBeLessThan(2000);
      console.log(`  nested JOIN 25,000 (500×10×5): ${elapsed.toFixed(2)}ms`);
    });
  });
});
