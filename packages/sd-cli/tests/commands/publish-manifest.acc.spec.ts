import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";
import { cpx } from "@simplysm/core-node";

const tmpDirs: string[] = [];

function readTarEntry(tgzPath: string, entryName: string): string {
  const tarBuffer = gunzipSync(fs.readFileSync(tgzPath));
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    const name = header.toString("utf-8", 0, 100).replace(/\0.*$/s, "");
    if (name === "") break;

    const sizeText = header.toString("utf-8", 124, 136).replace(/\0.*$/s, "").trim();
    const size = Number.parseInt(sizeText, 8);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;

    if (name === entryName) {
      return tarBuffer.toString("utf-8", dataStart, dataEnd);
    }

    offset = dataStart + Math.ceil(size / 512) * 512;
  }

  throw new Error(`tar entry not found: ${entryName}`);
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("npm package manifest", () => {
  it("keeps CLI binary and replaces workspace dependency ranges in Bun pack output", async () => {
    const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-pack-"));
    tmpDirs.push(destination);

    await cpx.spawn(
      "bun",
      ["pm", "pack", "--destination", destination, "--ignore-scripts", "--quiet"],
      { cwd: pkgRoot },
    );

    const tarball = fs.readdirSync(destination).find((item) => item.endsWith(".tgz"));
    if (tarball == null) throw new Error("package tarball not created");

    const packedPackageJson = JSON.parse(
      readTarEntry(path.join(destination, tarball), "package/package.json"),
    ) as Record<string, unknown>;
    const bin = packedPackageJson["bin"] as Record<string, unknown>;
    const dependencies = packedPackageJson["dependencies"] as Record<string, string>;

    expect(bin["sd-cli"]).toBe("./dist/sd-cli.js");
    expect(dependencies["@simplysm/core-common"]).not.toContain("workspace:");
    expect(dependencies["@simplysm/core-node"]).not.toContain("workspace:");
    expect(dependencies["@simplysm/storage"]).not.toContain("workspace:");
  }, 120_000);
});
