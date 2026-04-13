import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "../setup/TestDbContext";

describe("single() 동작", () => {
  it("결과 0건이면 undefined를 반환한다", async () => {
    const db = createTestDb();
    vi.spyOn(db, "executeDefs").mockResolvedValueOnce([[]]);

    const result = await db.user().single();

    expect(result).toBeUndefined();
  });

  it("결과 1건이면 해당 레코드를 반환한다", async () => {
    const db = createTestDb();
    vi.spyOn(db, "executeDefs").mockResolvedValueOnce([[{ id: 1n, name: "Alice" }]]);

    const result = await db.user().single();

    expect(result).toEqual({ id: 1n, name: "Alice" });
  });

  it("결과 2건 이상이면 ArgumentError를 throw한다", async () => {
    const db = createTestDb();
    vi.spyOn(db, "executeDefs").mockResolvedValueOnce([[{ id: 1n }, { id: 2n }]]);

    await expect(db.user().single()).rejects.toThrow(
      "단일 결과를 기대했으나 복수 결과가 반환되었습니다.",
    );
  });

  it("include() + single() 시 top 제한 없이 조회한다", async () => {
    const db = createTestDb();
    const spy = vi.spyOn(db, "executeDefs").mockResolvedValueOnce([
      [{ id: 1n, name: "Alice" }],
    ]);

    await db
      .user()
      .include((item) => item.posts)
      .single();

    expect(spy).toHaveBeenCalledOnce();
    const queryDef = spy.mock.calls[0][0][0];
    expect(queryDef.type).toBe("select");
    if (queryDef.type === "select") {
      expect(queryDef.top).toBeUndefined();
    }
  });
});
