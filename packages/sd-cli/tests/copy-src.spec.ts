import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { copySrcFiles } from "../src/utils/copy-src";

describe("copySrcFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "copysrc-"));
    // src/ 구조 생성
    await fs.mkdir(path.join(tmpDir, "src", "components"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "dist"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src", "base.css"), "body {}");
    await fs.writeFile(path.join(tmpDir, "src", "components", "Card.css"), ".card {}");
    await fs.writeFile(path.join(tmpDir, "src", "index.ts"), "export {}");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("glob 패턴에 매칭되는 파일을 src/에서 dist/로 복사한다", async () => {
    await copySrcFiles(tmpDir, ["**/*.css"]);

    const base = await fs.readFile(path.join(tmpDir, "dist", "base.css"), "utf-8");
    expect(base).toBe("body {}");

    const card = await fs.readFile(path.join(tmpDir, "dist", "components", "Card.css"), "utf-8");
    expect(card).toBe(".card {}");
  });

  it("매칭되지 않는 파일은 복사하지 않는다", async () => {
    await copySrcFiles(tmpDir, ["**/*.css"]);

    const exists = await fs.access(path.join(tmpDir, "dist", "index.ts")).then(
      () => true,
      () => false,
    );
    expect(exists).toBe(false);
  });

  it("패턴이 빈 배열이면 아무것도 복사하지 않는다", async () => {
    await copySrcFiles(tmpDir, []);

    const files = await fs.readdir(path.join(tmpDir, "dist"));
    expect(files).toHaveLength(0);
  });
});
