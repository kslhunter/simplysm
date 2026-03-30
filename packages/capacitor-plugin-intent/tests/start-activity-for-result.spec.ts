import { describe, it, expect } from "vitest";
import { IntentWeb } from "../src/web/IntentWeb";

describe("Feature 2.1 startActivityForResult", () => {
  it("Web에서 startActivityForResult를 호출하면 { resultCode: 0 }을 반환한다", async () => {
    const web = new IntentWeb();
    const result = await web.startActivityForResult({ action: "com.example.ACTION" });
    expect(result).toEqual({ resultCode: 0 });
  });

  it("옵션 없이 호출해도 { resultCode: 0 }을 반환한다", async () => {
    const web = new IntentWeb();
    const result = await web.startActivityForResult({});
    expect(result).toEqual({ resultCode: 0 });
  });
});
