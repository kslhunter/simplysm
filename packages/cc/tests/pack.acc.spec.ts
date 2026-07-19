import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { cpx } from "@simplysm/core-node";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let entryNames: string[];
let destination: string | undefined;

function listTarEntries(tgzPath: string): string[] {
  const tarBuffer = gunzipSync(fs.readFileSync(tgzPath));
  const names: string[] = [];
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    const name = header.toString("utf-8", 0, 100).replace(/\0.*$/s, "");
    if (name === "") break;

    const sizeText = header.toString("utf-8", 124, 136).replace(/\0.*$/s, "").trim();
    const size = Number.parseInt(sizeText, 8);
    names.push(name);
    offset = offset + 512 + Math.ceil(size / 512) * 512;
  }

  return names;
}

beforeAll(async () => {
  // tarball 은 빌드 산출물을 담으므로 빌드가 선행되어야 한다.
  await cpx.spawn("pnpm", ["build", "-t", "cc"], { cwd: path.resolve(pkgRoot, "../..") });

  destination = fs.mkdtempSync(path.join(os.tmpdir(), "cc-pack-"));
  await cpx.spawn("pnpm", ["pack", "--pack-destination", destination], { cwd: pkgRoot });

  const tarball = fs.readdirSync(destination).find((item) => item.endsWith(".tgz"));
  if (tarball == null) throw new Error("package tarball not created");

  entryNames = listTarEntries(path.join(destination, tarball));
}, 600_000);

afterAll(() => {
  if (destination != null) fs.rmSync(destination, { recursive: true, force: true });
});

describe("cc package tarball", () => {
  it("exposes the cc command", () => {
    const manifestEntry = entryNames.find((name) => name === "package/package.json");
    expect(manifestEntry).toBeDefined();
    expect(entryNames).toContain("package/dist/cc.js");
  });

  it.each([
    ["sd", ".claude-plugin/plugin.json"],
    ["sd", "hooks/hooks.json"],
    ["sd", "output-styles/sd.md"],
    ["sd-wiki", ".claude-plugin/plugin.json"],
    ["sd-wiki", "hooks/hooks.json"],
  ])("bundles %s plugin file %s", (plugin, relPath) => {
    expect(entryNames).toContain(`package/dist/plugins/${plugin}/${relPath}`);
  });

  it.each([
    ["sd", "hooks/"],
    ["sd", "shared/"],
    ["sd", "skills/"],
    ["sd", "agents/"],
    ["sd", "references/"],
    ["sd-wiki", "hooks/"],
    ["sd-wiki", "shared/"],
    ["sd-wiki", "skills/"],
    ["sd-wiki", "rules/"],
    ["sd-wiki", "cli/"],
  ])("bundles %s plugin directory %s with content", (plugin, relDir) => {
    const prefix = `package/dist/plugins/${plugin}/${relDir}`;
    expect(entryNames.filter((name) => name.startsWith(prefix)).length).toBeGreaterThan(0);
  });

  it("bundles the hook scripts the hook manifests execute", () => {
    // 훅은 같은 플러그인 안의 공용 코드를 불러오므로 매니페스트만 있으면 실행 시점에 깨진다.
    for (const plugin of ["sd", "sd-wiki"]) {
      const hookScripts = entryNames.filter(
        (name) => name.startsWith(`package/dist/plugins/${plugin}/hooks/`) && name.endsWith(".ts"),
      );
      expect(hookScripts.length).toBeGreaterThan(0);
    }
  });

  it.each(["node_modules", "extensions", "__pycache__", ".cache", "tests"])(
    "excludes %s from the bundled plugins",
    (excluded) => {
      const matched = entryNames.filter(
        (name) => name.startsWith("package/dist/plugins/") && name.includes(`/${excluded}/`),
      );
      expect(matched).toEqual([]);
    },
  );

  it("excludes build metadata from the bundled plugins", () => {
    const matched = entryNames.filter(
      (name) => name.startsWith("package/dist/plugins/") && name.endsWith(".tsbuildinfo"),
    );
    expect(matched).toEqual([]);
  });

  it("excludes plugin package manifests that would shadow this package", () => {
    const matched = entryNames.filter((name) =>
      /^package\/dist\/plugins\/[^/]+\/(package\.json|tsconfig\.json)$/.test(name),
    );
    expect(matched).toEqual([]);
  });
});
