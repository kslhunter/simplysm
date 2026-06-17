import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { handleStaticFile } from "../src/transport/http/static-file-handler";

interface SentFile {
  filename: string;
  directory: string;
}

class FakeReply {
  sentFile: SentFile | undefined;
  statusCode: number | undefined;
  sentBody: string | undefined;
  redirectedTo: string | undefined;

  sendFile(filename: string, directory: string): Promise<void> {
    const filePath = path.join(directory, filename);
    if (!fs.existsSync(filePath)) {
      const error = new Error(`ENOENT: no such file: ${filePath}`) as Error & { code: string };
      error.code = "ENOENT";
      return Promise.reject(error);
    }
    this.sentFile = { filename, directory };
    return Promise.resolve();
  }

  redirect(url: string): void {
    this.redirectedTo = url;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  type(_contentType: string): this {
    return this;
  }

  send(body: string): void {
    this.sentBody = body;
  }
}

function createFakeRequest(url: string): FastifyRequest {
  return { raw: { url } } as FastifyRequest;
}

describe("handleStaticFile", () => {
  let rootPath: string;
  let wwwPath: string;

  beforeEach(() => {
    rootPath = fs.mkdtempSync(path.join(os.tmpdir(), "sd-static-test-"));
    wwwPath = path.join(rootPath, "www");
    fs.mkdirSync(wwwPath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(rootPath, { recursive: true, force: true });
  });

  it("존재하는 파일은 그대로 전송한다", async () => {
    fs.mkdirSync(path.join(wwwPath, "my-client"), { recursive: true });
    fs.writeFileSync(path.join(wwwPath, "my-client", "main.js"), "console.log(1);");

    const reply = new FakeReply();
    await handleStaticFile(
      createFakeRequest("/my-client/main.js"),
      reply as unknown as FastifyReply,
      rootPath,
      "my-client/main.js",
    );

    expect(reply.sentFile).toEqual({
      filename: "main.js",
      directory: path.join(wwwPath, "my-client"),
    });
  });

  it("루트 요청(urlPath 빈 문자열)이면 리다이렉트 없이 www/index.html을 전송한다", async () => {
    fs.writeFileSync(path.join(wwwPath, "index.html"), "<html>root</html>");

    const reply = new FakeReply();
    await handleStaticFile(
      createFakeRequest("/"),
      reply as unknown as FastifyReply,
      rootPath,
      "",
    );

    expect(reply.sentFile).toEqual({
      filename: "index.html",
      directory: wwwPath,
    });
    expect(reply.redirectedTo).toBeUndefined();
  });

  it("파일이 없고 셸(index.csr.html)도 없으면 404 (기존 동작 불변)", async () => {
    fs.mkdirSync(path.join(wwwPath, "my-client"), { recursive: true });
    fs.writeFileSync(path.join(wwwPath, "my-client", "index.html"), "<html>spa</html>");

    const reply = new FakeReply();
    await handleStaticFile(
      createFakeRequest("/my-client/unknown-route"),
      reply as unknown as FastifyReply,
      rootPath,
      "my-client/unknown-route",
    );

    expect(reply.sentFile).toBeUndefined();
    expect(reply.statusCode).toBe(404);
  });

  it("파일이 없고 확장자 없는 페이지 요청이면 상위의 셸(index.csr.html)을 반환한다", async () => {
    fs.mkdirSync(path.join(wwwPath, "ssg-client"), { recursive: true });
    fs.writeFileSync(path.join(wwwPath, "ssg-client", "index.html"), "<html>prerendered</html>");
    fs.writeFileSync(path.join(wwwPath, "ssg-client", "index.csr.html"), "<html>shell</html>");

    const reply = new FakeReply();
    await handleStaticFile(
      createFakeRequest("/ssg-client/r/abc123"),
      reply as unknown as FastifyReply,
      rootPath,
      "ssg-client/r/abc123",
    );

    expect(reply.sentFile).toEqual({
      filename: "index.csr.html",
      directory: path.join(wwwPath, "ssg-client"),
    });
  });

  it("파일이 없어도 확장자 있는 요청(asset)은 셸로 폴백하지 않고 404", async () => {
    fs.mkdirSync(path.join(wwwPath, "ssg-client"), { recursive: true });
    fs.writeFileSync(path.join(wwwPath, "ssg-client", "index.csr.html"), "<html>shell</html>");

    const reply = new FakeReply();
    await handleStaticFile(
      createFakeRequest("/ssg-client/missing.js"),
      reply as unknown as FastifyReply,
      rootPath,
      "ssg-client/missing.js",
    );

    expect(reply.sentFile).toBeUndefined();
    expect(reply.statusCode).toBe(404);
  });

  it("중첩 경로에서도 www 루트 방향으로 가장 가까운 셸을 찾는다", async () => {
    fs.mkdirSync(path.join(wwwPath, "ssg-client", "q"), { recursive: true });
    fs.writeFileSync(path.join(wwwPath, "ssg-client", "index.csr.html"), "<html>shell</html>");

    const reply = new FakeReply();
    await handleStaticFile(
      createFakeRequest("/ssg-client/q/deep/link"),
      reply as unknown as FastifyReply,
      rootPath,
      "ssg-client/q/deep/link",
    );

    expect(reply.sentFile).toEqual({
      filename: "index.csr.html",
      directory: path.join(wwwPath, "ssg-client"),
    });
  });
});
