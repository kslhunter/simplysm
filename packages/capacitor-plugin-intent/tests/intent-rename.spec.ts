import { describe, it, expect } from "vitest";
import { IntentWeb } from "../src/web/IntentWeb";

describe("Feature 1.1 Slice 1: TypeScript 리네이밍 검증", () => {
  it("IntentWeb.subscribe는 web-stub id를 반환한다", async () => {
    const web = new IntentWeb();
    const result = await web.subscribe({ filters: ["test.ACTION"] }, () => {});
    expect(result.id).toBe("web-stub");
  });

  it("IntentWeb.getLaunchIntent는 빈 객체를 반환한다", async () => {
    const web = new IntentWeb();
    const result = await web.getLaunchIntent();
    expect(result).toEqual({});
  });

  it("IntentWeb.send는 에러 없이 완료된다", async () => {
    const web = new IntentWeb();
    await expect(web.send({ action: "test.ACTION" })).resolves.toBeUndefined();
  });
});
