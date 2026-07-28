import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import type esbuild from "esbuild";

const { extractLicenses, resolvePackageRef, resolveLicenseId } =
  await import("../../src/utils/license-extractor");

let rootDir: string;

beforeEach(() => {
  rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-license-"));
});

afterEach(() => {
  fs.rmSync(rootDir, { recursive: true, force: true });
});

/** rootDir 하위에 패키지 디렉터리를 만든다 */
function writePackage(
  relDir: string,
  manifest: object | undefined,
  files: Record<string, string> = {},
): void {
  const dir = path.join(rootDir, relDir);
  fs.mkdirSync(dir, { recursive: true });
  if (manifest != null) {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(manifest));
  }
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, fileName), content);
  }
}

/** 입력 경로별 bytesInOutput 을 담은 단일 출력 metafile 을 만든다 */
function metafileOf(inputs: Record<string, number>): esbuild.Metafile {
  return {
    inputs: {},
    outputs: {
      "dist/main.js": {
        bytes: 0,
        inputs: Object.fromEntries(
          Object.entries(inputs).map(([inputPath, bytesInOutput]) => [
            inputPath,
            { bytesInOutput },
          ]),
        ),
        imports: [],
        exports: [],
      },
    },
  };
}

describe("resolvePackageRef", () => {
  it("node_modules 아래 파일에서 패키지명을 역추적한다", () => {
    const ref = resolvePackageRef(path.join(rootDir, "node_modules", "foo", "dist", "index.js"));
    expect(ref?.packageName).toBe("foo");
    expect(ref?.packageDir).toBe(path.join(rootDir, "node_modules", "foo"));
  });

  it("scope 가 있는 패키지는 scope 를 포함한 이름으로 역추적한다", () => {
    const ref = resolvePackageRef(
      path.join(rootDir, "node_modules", "@scope", "bar", "src", "index.js"),
    );
    expect(ref?.packageName).toBe("@scope/bar");
    expect(ref?.packageDir).toBe(path.join(rootDir, "node_modules", "@scope", "bar"));
  });

  it("중첩된 node_modules 에서는 가장 가까운 패키지를 찾는다", () => {
    const ref = resolvePackageRef(
      path.join(rootDir, "node_modules", "outer", "node_modules", "inner", "index.js"),
    );
    expect(ref?.packageName).toBe("inner");
  });

  it("node_modules 를 거치지 않는 경로는 패키지가 아니다", () => {
    expect(
      resolvePackageRef(path.join(rootDir, "packages", "app", "src", "main.ts")),
    ).toBeUndefined();
  });
});

describe("resolveLicenseId", () => {
  it("license 문자열을 그대로 사용한다", () => {
    expect(resolveLicenseId({ license: "MIT" })).toBe("MIT");
  });

  it("공백뿐인 license 는 미상으로 본다", () => {
    expect(resolveLicenseId({ license: "   " })).toBeUndefined();
  });

  it("deprecated license 오브젝트의 type 을 인식한다", () => {
    expect(resolveLicenseId({ license: { type: "BSD-3-Clause" } })).toBe("BSD-3-Clause");
  });

  it("deprecated licenses 배열의 type 들을 OR 로 잇는다", () => {
    expect(resolveLicenseId({ licenses: [{ type: "MIT" }, { type: "Apache-2.0" }] })).toBe(
      "MIT OR Apache-2.0",
    );
  });

  it("어떤 표기도 없으면 미상이다", () => {
    expect(resolveLicenseId({ name: "foo", version: "1.0.0" })).toBeUndefined();
  });
});

describe("extractLicenses", () => {
  it("LICENSE 파일이 있으면 본문까지 기록한다", async () => {
    writePackage(
      "node_modules/foo",
      { name: "foo", version: "1.2.3", license: "MIT" },
      { LICENSE: "Copyright (c) 2020 Foo Author" },
    );

    const content = await extractLicenses(metafileOf({ "node_modules/foo/index.js": 10 }), rootDir);

    expect(content).toContain("Package: foo@1.2.3");
    expect(content).toContain("License: MIT");
    expect(content).toContain("Copyright (c) 2020 Foo Author");
  });

  it("LICENSE 파일이 없으면 라이선스 식별자만 기록한다", async () => {
    writePackage("node_modules/bar", { name: "bar", version: "0.1.0", license: "ISC" });

    const content = await extractLicenses(metafileOf({ "node_modules/bar/index.js": 10 }), rootDir);

    expect(content).toContain("Package: bar@0.1.0");
    expect(content).toContain("License: ISC");
  });

  it("LICENSE.md 등 다른 파일명도 찾는다", async () => {
    writePackage(
      "node_modules/baz",
      { name: "baz", version: "1.0.0", license: "MIT" },
      { "LICENSE.md": "# License\nMIT text here" },
    );

    const content = await extractLicenses(metafileOf({ "node_modules/baz/index.js": 10 }), rootDir);

    expect(content).toContain("MIT text here");
  });

  it("scope 가 있는 패키지도 기록한다", async () => {
    writePackage("node_modules/@scope/pkg", {
      name: "@scope/pkg",
      version: "2.0.0",
      license: "Apache-2.0",
    });

    const content = await extractLicenses(
      metafileOf({ "node_modules/@scope/pkg/index.js": 10 }),
      rootDir,
    );

    expect(content).toContain("Package: @scope/pkg@2.0.0");
  });

  it("같은 패키지의 여러 파일이 포함돼도 한 번만 기록한다", async () => {
    writePackage("node_modules/foo", { name: "foo", version: "1.0.0", license: "MIT" });

    const content = await extractLicenses(
      metafileOf({
        "node_modules/foo/index.js": 10,
        "node_modules/foo/util.js": 20,
        "node_modules/foo/deep/inner.js": 30,
      }),
      rootDir,
    );

    expect(content.match(/Package: foo@1\.0\.0/g)).toHaveLength(1);
  });

  it("산출물에 남지 않은 입력(bytesInOutput 0)은 제외한다", async () => {
    writePackage("node_modules/used", { name: "used", version: "1.0.0", license: "MIT" });
    writePackage("node_modules/shaken", { name: "shaken", version: "1.0.0", license: "MIT" });

    const content = await extractLicenses(
      metafileOf({
        "node_modules/used/index.js": 10,
        "node_modules/shaken/index.js": 0,
      }),
      rootDir,
    );

    expect(content).toContain("Package: used@1.0.0");
    expect(content).not.toContain("Package: shaken@1.0.0");
  });

  it("node_modules 밖의 자체 소스는 제외한다", async () => {
    const content = await extractLicenses(metafileOf({ "packages/app/src/main.ts": 100 }), rootDir);

    expect(content).not.toContain("Package:");
  });

  it("SEE LICENSE IN 표기는 지정한 파일을 읽는다", async () => {
    writePackage(
      "node_modules/custom",
      { name: "custom", version: "1.0.0", license: "SEE LICENSE IN TERMS.txt" },
      { "TERMS.txt": "사내 전용 라이선스 조건" },
    );

    const content = await extractLicenses(
      metafileOf({ "node_modules/custom/index.js": 10 }),
      rootDir,
    );

    expect(content).toContain("사내 전용 라이선스 조건");
  });

  it("SEE LICENSE IN 이 가리키는 파일이 없으면 실패한다", async () => {
    writePackage("node_modules/custom", {
      name: "custom",
      version: "1.0.0",
      license: "SEE LICENSE IN MISSING.txt",
    });

    await expect(
      extractLicenses(metafileOf({ "node_modules/custom/index.js": 10 }), rootDir),
    ).rejects.toThrow("custom");
  });

  it("SEE LICENSE IN 이 패키지 바깥을 가리키면 실패한다", async () => {
    writePackage("node_modules/escape", {
      name: "escape",
      version: "1.0.0",
      license: "SEE LICENSE IN ../../secret.txt",
    });

    await expect(
      extractLicenses(metafileOf({ "node_modules/escape/index.js": 10 }), rootDir),
    ).rejects.toThrow("패키지 바깥");
  });

  it("라이선스를 알 수 없는 패키지가 있으면 실패하고 그 패키지를 알린다", async () => {
    writePackage("node_modules/ok", { name: "ok", version: "1.0.0", license: "MIT" });
    writePackage("node_modules/nolicense", { name: "nolicense", version: "3.1.4" });

    await expect(
      extractLicenses(
        metafileOf({
          "node_modules/ok/index.js": 10,
          "node_modules/nolicense/index.js": 10,
        }),
        rootDir,
      ),
    ).rejects.toThrow("nolicense@3.1.4");
  });

  it("package.json 이 없는 node_modules 경로는 실패한다", async () => {
    writePackage("node_modules/broken", undefined, { "index.js": "" });

    await expect(
      extractLicenses(metafileOf({ "node_modules/broken/index.js": 10 }), rootDir),
    ).rejects.toThrow("패키지 정보를 찾을 수 없습니다");
  });

  it("패키지를 이름순으로 정렬해 기록한다", async () => {
    writePackage("node_modules/zeta", { name: "zeta", version: "1.0.0", license: "MIT" });
    writePackage("node_modules/alpha", { name: "alpha", version: "1.0.0", license: "MIT" });

    const content = await extractLicenses(
      metafileOf({
        "node_modules/zeta/index.js": 10,
        "node_modules/alpha/index.js": 10,
      }),
      rootDir,
    );

    expect(content.indexOf("Package: alpha")).toBeLessThan(content.indexOf("Package: zeta"));
  });
});
