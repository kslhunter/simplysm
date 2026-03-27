import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const pkgRoot = resolve(import.meta.dirname, "..");
const srcDir = resolve(pkgRoot, "src");

describe("Slice 3: TypeScript 소스 리네이밍", () => {
  // Scenario: 메인 클래스 파일 및 클래스명 변경
  test("Intent.ts에 abstract class Intent가 존재한다", () => {
    expect(existsSync(resolve(srcDir, "Intent.ts"))).toBe(true);
    const content = readFileSync(resolve(srcDir, "Intent.ts"), "utf-8");
    expect(content).toContain("abstract class Intent");
  });

  test('registerPlugin<IIntentPlugin>("Intent", ...) 호출이 존재한다', () => {
    const content = readFileSync(resolve(srcDir, "Intent.ts"), "utf-8");
    expect(content).toContain('registerPlugin<IIntentPlugin>("Intent"');
  });

  // Scenario: 플러그인 인터페이스 파일 및 타입명 변경
  test("IIntentPlugin.ts에 IIntentPlugin, IIntentResult 인터페이스가 존재한다", () => {
    expect(existsSync(resolve(srcDir, "IIntentPlugin.ts"))).toBe(true);
    const content = readFileSync(resolve(srcDir, "IIntentPlugin.ts"), "utf-8");
    expect(content).toContain("interface IIntentPlugin");
    expect(content).toContain("interface IIntentResult");
  });

  // Scenario: Web stub 파일 및 클래스명 변경
  test("IntentWeb.ts에 class IntentWeb extends WebPlugin implements IIntentPlugin이 존재한다", () => {
    expect(existsSync(resolve(srcDir, "web/IntentWeb.ts"))).toBe(true);
    const content = readFileSync(resolve(srcDir, "web/IntentWeb.ts"), "utf-8");
    expect(content).toContain("class IntentWeb extends WebPlugin implements IIntentPlugin");
  });

  // Scenario: index.ts export 경로 갱신
  test('index.ts에 export * from "./Intent"와 export * from "./IIntentPlugin"이 존재한다', () => {
    const content = readFileSync(resolve(srcDir, "index.ts"), "utf-8");
    expect(content).toContain('export * from "./Intent"');
    expect(content).toContain('export * from "./IIntentPlugin"');
  });

  // Scenario: subscribe API 보존
  test("Intent.subscribe API가 존재하고 함수를 반환한다", async () => {
    const mod = await import(resolve(srcDir, "Intent.ts"));
    expect(typeof mod.Intent.subscribe).toBe("function");
  });

  // Scenario: send API 보존
  test("Intent.send API가 존재한다", async () => {
    const mod = await import(resolve(srcDir, "Intent.ts"));
    expect(typeof mod.Intent.send).toBe("function");
  });

  // Scenario: getLaunchIntent API 보존
  test("Intent.getLaunchIntent API가 존재한다", async () => {
    const mod = await import(resolve(srcDir, "Intent.ts"));
    expect(typeof mod.Intent.getLaunchIntent).toBe("function");
  });

  // Scenario: unsubscribeAll API 보존
  test("Intent.unsubscribeAll API가 존재한다", async () => {
    const mod = await import(resolve(srcDir, "Intent.ts"));
    expect(typeof mod.Intent.unsubscribeAll).toBe("function");
  });

  // Scenario: Web 환경에서 stub 동작
  test("IntentWeb이 IIntentPlugin의 모든 메서드를 구현한다", async () => {
    const mod = await import(resolve(srcDir, "web/IntentWeb.ts"));
    const web = new mod.IntentWeb();
    expect(typeof web.subscribe).toBe("function");
    expect(typeof web.unsubscribe).toBe("function");
    expect(typeof web.unsubscribeAll).toBe("function");
    expect(typeof web.send).toBe("function");
    expect(typeof web.getLaunchIntent).toBe("function");
  });
});
