import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "path";
import os from "node:os";
import { createDevHttpServer, type DevHttpServer } from "../../src/dev-server/dev-http-server";

describe("createDevHttpServer — Acceptance", () => {
  let tmpDir: string;
  let distDir: string;
  let server: DevHttpServer | undefined;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-http-server-test-"));
    distDir = path.join(tmpDir, "dist");
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.mkdirSync(distDir, { recursive: true });
  });

  afterEach(async () => {
    if (server?.port != null) {
      await server.close();
    }
    server = undefined;
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  async function fetchFromServer(urlPath: string): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }> {
    const port = server!.port!;
    const res = await fetch(`http://127.0.0.1:${port}${urlPath}`);
    const body = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return { status: res.status, headers, body };
  }

  // Scenario: JavaScript 파일 요청
  it("JavaScript 파일을 올바른 Content-Type으로 서빙한다", async () => {
    fs.writeFileSync(path.join(distDir, "main.js"), "console.log('hello');");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/main.js");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("javascript");
    expect(res.body).toBe("console.log('hello');");
  });

  // Scenario: CSS 파일 요청
  it("CSS 파일을 올바른 Content-Type으로 서빙한다", async () => {
    fs.writeFileSync(path.join(distDir, "styles.css"), "body { color: red; }");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/styles.css");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("css");
  });

  // Scenario: 바이너리 파일 요청
  it("바이너리 파일을 올바른 Content-Type으로 서빙한다", async () => {
    fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });
    // 최소 PNG 파일 (1x1 투명 PNG)
    const pngBuffer = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02,
      0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
      0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    fs.writeFileSync(path.join(distDir, "assets", "logo.png"), pngBuffer);

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/assets/logo.png");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
  });

  // Scenario: 알 수 없는 확장자 파일 요청
  it("알 수 없는 확장자 파일은 application/octet-stream으로 서빙한다", async () => {
    fs.writeFileSync(path.join(distDir, "data.qzx"), "some data");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/data.qzx");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/octet-stream");
  });

  // Scenario: basePath가 없는 요청 → 404
  it("basePath가 없는 요청은 404를 반환한다", async () => {
    fs.writeFileSync(path.join(distDir, "main.js"), "console.log('hello');");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/main.js");
    expect(res.status).toBe(404);
  });

  // Scenario: 다른 basePath 요청 → 404
  it("다른 basePath 요청은 404를 반환한다", async () => {
    fs.writeFileSync(path.join(distDir, "main.js"), "console.log('hello');");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/other-app/main.js");
    expect(res.status).toBe(404);
  });

  // Scenario: SPA 라우트 요청 → index.html fallback
  it("존재하지 않는 경로에 대해 SPA fallback으로 index.html을 반환한다", async () => {
    fs.writeFileSync(path.join(distDir, "index.html"), "<html><body>SPA</body></html>");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/dashboard/users");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toBe("<html><body>SPA</body></html>");
  });

  // Scenario: 존재하지 않는 파일 요청 → index.html fallback
  it("존재하지 않는 파일 요청에 대해 SPA fallback으로 index.html을 반환한다", async () => {
    fs.writeFileSync(path.join(distDir, "index.html"), "<html><body>SPA</body></html>");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/nonexistent.js");
    expect(res.status).toBe(200);
    expect(res.body).toBe("<html><body>SPA</body></html>");
  });

  // Scenario: index.html도 없는 경우 → 404
  it("index.html도 없으면 404를 반환한다", async () => {
    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/any-path");
    expect(res.status).toBe(404);
  });

  // Scenario: 지정 포트로 listen
  it("지정된 포트로 listen한다", async () => {
    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    const port = await server.listen();

    // 자동 할당된 포트로 다시 서버를 만들어 지정 포트 동작 검증
    await server.close();

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port });
    const actualPort = await server.listen();
    expect(actualPort).toBe(port);
  });

  // Scenario: 자동 포트 할당
  it("포트 0으로 listen하면 OS가 자동 할당한다", async () => {
    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    const port = await server.listen();
    expect(port).toBeGreaterThan(0);
  });

  // Scenario: 정적 파일 응답에 Cache-Control 헤더가 포함된다
  it("JS 파일 응답에 Cache-Control: no-cache 헤더가 포함된다", async () => {
    fs.writeFileSync(path.join(distDir, "main.js"), "var x = 1;");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/main.js");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-cache");
  });

  // Scenario: SPA fallback 응답에 Cache-Control 헤더가 포함된다
  it("SPA fallback index.html 응답에 Cache-Control: no-cache 헤더가 포함된다", async () => {
    fs.writeFileSync(path.join(distDir, "index.html"), "<html>spa</html>");

    server = createDevHttpServer({ distDir, basePath: "/my-app/", port: 0 });
    await server.listen();

    const res = await fetchFromServer("/my-app/nonexistent-route");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-cache");
  });
});
