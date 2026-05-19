import { describe, it, expect } from "vitest";
import { CustomerListPage } from "./거래처-목록";

describe("거래처 목록", () => {
  it("진입 시 거래처 전체를 로드", async () => {
    const page = new CustomerListPage();
    await page.onInit();
    expect(page.customers).toBeDefined();
  });
});
