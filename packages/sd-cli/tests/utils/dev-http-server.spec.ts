import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "path";
import os from "node:os";
import { createDevHttpServer, type DevHttpServer } from "../../src/dev-server/dev-http-server";

describe("createDevHttpServer", () => {
  let tmpDir: string;
  let distDir: string;
  let server: DevHttpServer | undefined;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-http-server-unit-"));
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

  describe("정적 파일 서빙", () => {
    it("HTML 파일을 text/html로 서빙한다", async () => {
      fs.writeFileSync(path.join(distDir, "page.html"), "<html>test</html>");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      const res = await fetchFromServer("/app/page.html");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.body).toBe("<html>test</html>");
    });

    it("루트 경로(/) 요청 시 index.html을 서빙한다", async () => {
      fs.writeFileSync(path.join(distDir, "index.html"), "<html>index</html>");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      const res = await fetchFromServer("/app/");
      expect(res.status).toBe(200);
      expect(res.body).toBe("<html>index</html>");
    });

    it("빈 경로 요청 시 index.html을 서빙한다", async () => {
      fs.writeFileSync(path.join(distDir, "index.html"), "<html>index</html>");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      // /app (슬래시 없음) — basePath 매칭 후 빈 경로
      const res = await fetchFromServer("/app/");
      expect(res.status).toBe(200);
      expect(res.body).toBe("<html>index</html>");
    });

    it("하위 디렉토리의 파일을 서빙한다", async () => {
      fs.mkdirSync(path.join(distDir, "sub"), { recursive: true });
      fs.writeFileSync(path.join(distDir, "sub", "file.txt"), "content");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      const res = await fetchFromServer("/app/sub/file.txt");
      expect(res.status).toBe(200);
      expect(res.body).toBe("content");
    });

    it("query string이 포함된 요청을 정상 처리한다", async () => {
      fs.writeFileSync(path.join(distDir, "main.js"), "var x = 1;");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      const res = await fetchFromServer("/app/main.js?v=123");
      expect(res.status).toBe(200);
      expect(res.body).toBe("var x = 1;");
    });

    it("디렉토리 경로 요청 시 SPA fallback으로 index.html 반환", async () => {
      fs.writeFileSync(path.join(distDir, "index.html"), "<html>spa</html>");
      fs.mkdirSync(path.join(distDir, "subdir"), { recursive: true });

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      const res = await fetchFromServer("/app/subdir");
      expect(res.status).toBe(200);
      expect(res.body).toBe("<html>spa</html>");
    });
  });

  describe("Cache-Control 헤더", () => {
    it("CSS 파일 응답에 Cache-Control: no-cache가 포함된다", async () => {
      fs.writeFileSync(path.join(distDir, "styles.css"), "body{}");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      const res = await fetchFromServer("/app/styles.css");
      expect(res.headers["cache-control"]).toBe("no-cache");
    });

    it("루트 경로 index.html 응답에 Cache-Control: no-cache가 포함된다", async () => {
      fs.writeFileSync(path.join(distDir, "index.html"), "<html></html>");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      const res = await fetchFromServer("/app/");
      expect(res.headers["cache-control"]).toBe("no-cache");
    });
  });

  describe("httpServer 인스턴스 노출", () => {
    it("httpServer 프로퍼티를 통해 http.Server 인스턴스에 접근 가능하다", () => {
      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      expect(server.httpServer).toBeDefined();
      expect(typeof server.httpServer.address).toBe("function");
    });
  });

  describe("에러 핸들링", () => {
    it("stat에서 ENOENT가 아닌 에러 발생 시 500을 반환한다", async () => {
      fs.writeFileSync(path.join(distDir, "index.html"), "<html>spa</html>");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      await server.listen();

      // stat을 spyOn하여 EACCES 에러 시뮬레이션
      const statSpy = vi.spyOn(fs.promises, "stat").mockRejectedValueOnce(
        Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" }),
      );

      const res = await fetchFromServer("/app/main.js");
      expect(res.status).toBe(500);

      statSpy.mockRestore();
    });
  });

  describe("close", () => {
    it("close 후 서버가 더 이상 요청을 받지 않는다", async () => {
      fs.writeFileSync(path.join(distDir, "main.js"), "test");

      server = createDevHttpServer({ distDir, basePath: "/app/", port: 0 });
      const port = await server.listen();
      await server.close();

      await expect(
        fetch(`http://127.0.0.1:${port}/app/main.js`),
      ).rejects.toThrow();
    });
  });
});
