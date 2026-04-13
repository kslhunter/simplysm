import { describe, it, expect } from "vitest";
import { getHmrClientScript, createHmrPostTransform } from "../../src/dev-server/hmr-client-script";

describe("getHmrClientScript", () => {
  it("유효한 JavaScript를 생성한다", () => {
    const script = getHmrClientScript("/app/", 4200);
    // new Function으로 구문 오류 확인
    expect(() => new Function(script)).not.toThrow();
  });

  it("IIFE로 감싸져 있다", () => {
    const script = getHmrClientScript("/app/", 4200);
    expect(script.trimStart()).toMatch(/^\(function\(\)/);
    expect(script.trimEnd()).toMatch(/\}\)\(\);$/);
  });

  it("const/let 대신 var를 사용한다", () => {
    const script = getHmrClientScript("/app/", 4200);
    // var 사용 확인
    expect(script).toContain("var ws");
    // const/let 미사용 확인
    expect(script).not.toMatch(/\bconst\b/);
    expect(script).not.toMatch(/\blet\b/);
  });
});

describe("createHmrPostTransform", () => {
  it("여러 </body> 태그가 있으면 마지막 것 앞에 주입한다", async () => {
    const transform = createHmrPostTransform("/app/", 4200);
    const html = "<body>first</body><body>second</body>";
    const result = await transform(html);

    // 마지막 </body> 직전에 주입
    const lastIdx = result.lastIndexOf("</body>");
    const scriptIdx = result.lastIndexOf("<script>");
    expect(scriptIdx).toBeLessThan(lastIdx);
  });

  it("빈 HTML에도 스크립트를 추가한다", async () => {
    const transform = createHmrPostTransform("/", 4200);
    const result = await transform("");
    expect(result).toContain("<script>");
  });
});
