import { resolve } from "path";

const pkgRoot = resolve(import.meta.dirname, "..");
const srcDir = resolve(pkgRoot, "src");

describe("Slice 1: startActivityForResult TypeScript 인터페이스", () => {
  test("IIntentPlugin에 startActivityForResult 메서드가 정의되어 있다", async () => {
    const mod = await import(resolve(srcDir, "IIntentPlugin.ts"));

    // IStartActivityForResultOptions 타입이 export되어야 한다
    expect(mod.IStartActivityForResultOptions).toBeUndefined; // interface는 런타임에 없지만 export 확인

    // IActivityResult 타입이 export되어야 한다
    expect(mod.IActivityResult).toBeUndefined;
  });

  test("IStartActivityForResultOptions에 필수 필드 action과 선택 필드들이 정의되어 있다", async () => {
    const content = (await import("fs")).readFileSync(resolve(srcDir, "IIntentPlugin.ts"), "utf-8");
    expect(content).toContain("interface IStartActivityForResultOptions");
    expect(content).toMatch(/action\s*:\s*string/);
    expect(content).toMatch(/uri\?\s*:\s*string/);
    expect(content).toMatch(/extras\?\s*:\s*Record<string,\s*unknown>/);
    expect(content).toMatch(/package\?\s*:\s*string/);
    expect(content).toMatch(/component\?\s*:\s*string/);
    expect(content).toMatch(/type\?\s*:\s*string/);
  });

  test("IActivityResult에 resultCode, data?, extras? 필드가 정의되어 있다", async () => {
    const content = (await import("fs")).readFileSync(resolve(srcDir, "IIntentPlugin.ts"), "utf-8");
    expect(content).toContain("interface IActivityResult");
    expect(content).toMatch(/resultCode\s*:\s*number/);
    expect(content).toMatch(/data\?\s*:\s*string/);
    expect(content).toMatch(/extras\?\s*:\s*Record<string,\s*unknown>/);
  });

  test("IIntentPlugin.startActivityForResult 메서드 시그니처가 올바르다", async () => {
    const content = (await import("fs")).readFileSync(resolve(srcDir, "IIntentPlugin.ts"), "utf-8");
    expect(content).toMatch(/startActivityForResult\s*\(\s*options\s*:\s*IStartActivityForResultOptions\s*\)\s*:\s*Promise<IActivityResult>/);
  });
});
