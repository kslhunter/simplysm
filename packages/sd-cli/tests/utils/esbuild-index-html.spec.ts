import { describe, it, expect } from "vitest";
import type esbuild from "esbuild";

const { extractFilesFromMetafile } = await import(
  "../../src/esbuild/esbuild-index-html"
);

describe("extractFilesFromMetafile", () => {
  const outdir = "/workspace/dist";

  it("entryPoint가 있는 JS 파일은 name이 설정된 FileInfo로 변환된다", () => {
    const metafile: esbuild.Metafile = {
      inputs: {},
      outputs: {
        "/workspace/dist/main.js": {
          bytes: 100,
          inputs: {},
          imports: [],
          exports: [],
          entryPoint: "src/main.ts",
        },
      },
    };

    const files = extractFilesFromMetafile(metafile, outdir);
    expect(files).toEqual([
      { file: "main.js", name: "main", extension: ".js" },
    ]);
  });

  it("entryPoint가 없는 JS 파일(chunk)은 name 없이 변환된다", () => {
    const metafile: esbuild.Metafile = {
      inputs: {},
      outputs: {
        "/workspace/dist/chunk-ABC.js": {
          bytes: 80,
          inputs: {},
          imports: [],
          exports: [],
        },
      },
    };

    const files = extractFilesFromMetafile(metafile, outdir);
    expect(files).toEqual([
      { file: "chunk-ABC.js", extension: ".js" },
    ]);
  });

  it("CSS 파일이 FileInfo로 변환된다", () => {
    const metafile: esbuild.Metafile = {
      inputs: {},
      outputs: {
        "/workspace/dist/main.css": {
          bytes: 20,
          inputs: {},
          imports: [],
          exports: [],
        },
      },
    };

    const files = extractFilesFromMetafile(metafile, outdir);
    expect(files).toEqual([
      { file: "main.css", extension: ".css" },
    ]);
  });

  it(".map 파일은 제외된다", () => {
    const metafile: esbuild.Metafile = {
      inputs: {},
      outputs: {
        "/workspace/dist/main.js": {
          bytes: 100,
          inputs: {},
          imports: [],
          exports: [],
          entryPoint: "src/main.ts",
        },
        "/workspace/dist/main.js.map": {
          bytes: 200,
          inputs: {},
          imports: [],
          exports: [],
        },
      },
    };

    const files = extractFilesFromMetafile(metafile, outdir);
    expect(files).toHaveLength(1);
    expect(files[0].extension).toBe(".js");
  });

  it("빈 outputs는 빈 배열을 반환한다", () => {
    const metafile: esbuild.Metafile = {
      inputs: {},
      outputs: {},
    };

    const files = extractFilesFromMetafile(metafile, outdir);
    expect(files).toEqual([]);
  });

  it("해시가 포함된 파일명도 올바르게 처리된다", () => {
    const metafile: esbuild.Metafile = {
      inputs: {},
      outputs: {
        "/workspace/dist/main-ABCD1234.js": {
          bytes: 100,
          inputs: {},
          imports: [],
          exports: [],
          entryPoint: "src/main.ts",
        },
      },
    };

    const files = extractFilesFromMetafile(metafile, outdir);
    expect(files).toEqual([
      { file: "main-ABCD1234.js", name: "main", extension: ".js" },
    ]);
  });

  it("여러 출력 파일이 모두 포함된다 (JS/CSS만)", () => {
    const metafile: esbuild.Metafile = {
      inputs: {},
      outputs: {
        "/workspace/dist/main.js": {
          bytes: 100,
          inputs: {},
          imports: [],
          exports: [],
          entryPoint: "src/main.ts",
        },
        "/workspace/dist/polyfills.js": {
          bytes: 50,
          inputs: {},
          imports: [],
          exports: [],
          entryPoint: "src/polyfills.ts",
        },
        "/workspace/dist/main.css": {
          bytes: 20,
          inputs: {},
          imports: [],
          exports: [],
        },
        "/workspace/dist/chunk-X.js": {
          bytes: 30,
          inputs: {},
          imports: [],
          exports: [],
        },
        "/workspace/dist/main.js.map": {
          bytes: 200,
          inputs: {},
          imports: [],
          exports: [],
        },
      },
    };

    const files = extractFilesFromMetafile(metafile, outdir);
    expect(files).toHaveLength(4);
    const extensions = files.map((f) => f.extension);
    expect(extensions.every((e) => e === ".js" || e === ".css")).toBe(true);
  });

  it("JS entry의 cssBundle로 연결된 CSS 파일에 entry name이 설정된다", () => {
    const metafile: esbuild.Metafile = {
      inputs: {},
      outputs: {
        "/workspace/dist/main.js": {
          bytes: 100,
          inputs: {},
          imports: [],
          exports: [],
          entryPoint: "src/main.ts",
          cssBundle: "/workspace/dist/main.css",
        },
        "/workspace/dist/main.css": {
          bytes: 20,
          inputs: {},
          imports: [],
          exports: [],
        },
      },
    };

    const files = extractFilesFromMetafile(metafile, outdir);
    const cssFile = files.find((f) => f.extension === ".css");
    expect(cssFile).toEqual({ file: "main.css", name: "main", extension: ".css" });
  });
});
