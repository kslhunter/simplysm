import { resolve } from "path";

const pkgRoot = resolve(import.meta.dirname, "..");
const srcDir = resolve(pkgRoot, "src");

describe("Slice 2: startActivityForResult TypeScript 래퍼 및 웹 stub", () => {
  // Scenario: Intent.startActivityForResult static 메서드 존재
  test("Intent.startActivityForResult static 메서드가 존재한다", async () => {
    const mod = await import(resolve(srcDir, "Intent.ts"));
    expect(typeof mod.Intent.startActivityForResult).toBe("function");
  });

  // Scenario: 웹에서 startActivityForResult 호출
  test("IntentWeb.startActivityForResult가 resultCode 0으로 resolve한다", async () => {
    const mod = await import(resolve(srcDir, "web/IntentWeb.ts"));
    const web = new mod.IntentWeb();

    // alert를 mock
    globalThis.alert = vi.fn();

    const result = await web.startActivityForResult({ action: "test.ACTION" });
    expect(result).toEqual({ resultCode: 0 });
    expect(globalThis.alert).toHaveBeenCalledWith(
      "[Intent] 웹 환경에서는 startActivityForResult를 지원하지 않습니다.",
    );
  });

  // index.ts에서 새 타입이 export되는지 확인
  test("index.ts에서 IStartActivityForResultOptions, IActivityResult가 re-export된다", async () => {
    const content = (await import("fs")).readFileSync(resolve(srcDir, "IIntentPlugin.ts"), "utf-8");
    expect(content).toContain("export interface IStartActivityForResultOptions");
    expect(content).toContain("export interface IActivityResult");
  });
});
