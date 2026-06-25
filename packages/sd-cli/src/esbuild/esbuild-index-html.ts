import type esbuild from "esbuild";
import {
  IndexHtmlGenerator,
  type IndexHtmlTransform,
} from "@angular/build/private";
import path from "path";
import { pathx } from "@simplysm/core-node";

/** metafile.outputs에서 추출된 파일 정보 (IndexHtmlGenerator.FileInfo 호환) */
export interface FileInfo {
  file: string;
  name?: string;
  extension: string;
}

export interface GenerateIndexHtmlOptions {
  /** src/index.html 경로 */
  indexPath: string;
  /** esbuild 빌드 결과 metafile */
  metafile: esbuild.Metafile;
  /** 출력 디렉토리 (dist/) */
  outdir: string;
  /** <base href> (기본: "/") */
  baseHref?: string;
  /** 빌드 모드 */
  mode: "dev" | "build";
  /** entryPoints의 이름 목록 (main, polyfills 등) */
  entryNames: string[];
  /** HTML 후처리 훅 (HMR 스크립트 주입용) */
  postTransform?: IndexHtmlTransform;
}

export interface GenerateIndexHtmlResult {
  content: string;
  warnings: string[];
  errors: string[];
}

/**
 * esbuild metafile.outputs에서 JS/CSS 파일을 추출하여 FileInfo[] 로 변환한다.
 */
export function extractFilesFromMetafile(
  metafile: esbuild.Metafile,
  outdir: string,
): FileInfo[] {
  const files: FileInfo[] = [];
  const normalizedOutdir = pathx.posix(outdir);

  // cssBundle → entry name 매핑 (JS entry의 cssBundle로 CSS에 name 전파)
  const cssBundleToName = new Map<string, string>();
  for (const output of Object.values(metafile.outputs)) {
    if (output.entryPoint != null && output.cssBundle != null) {
      const name = path.basename(output.entryPoint, path.extname(output.entryPoint));
      cssBundleToName.set(pathx.posix(output.cssBundle), name);
    }
  }

  for (const [outputPath, output] of Object.entries(metafile.outputs)) {
    const normalizedPath = pathx.posix(outputPath);
    const ext = path.extname(normalizedPath);

    if (ext !== ".js" && ext !== ".css") {
      continue;
    }

    const relativePath = normalizedPath.startsWith(normalizedOutdir)
      ? normalizedPath.slice(normalizedOutdir.length).replace(/^\//, "")
      : pathx.posix(path.relative(normalizedOutdir, normalizedPath));

    const fileInfo: FileInfo = {
      file: relativePath,
      extension: ext,
    };

    if (output.entryPoint != null) {
      fileInfo.name = path.basename(output.entryPoint, path.extname(output.entryPoint));
    } else if (ext === ".css") {
      const cssName = cssBundleToName.get(normalizedPath);
      if (cssName != null) {
        fileInfo.name = cssName;
      }
    }

    files.push(fileInfo);
  }

  return files;
}

/**
 * esbuild 빌드 결과를 기반으로 index.html을 생성한다.
 * IndexHtmlGenerator(@angular/build/private)를 활용하여 script/link 태그를 자동 주입한다.
 */
export async function generateIndexHtml(
  options: GenerateIndexHtmlOptions,
): Promise<GenerateIndexHtmlResult> {
  const files = extractFilesFromMetafile(options.metafile, options.outdir);

  const entrypoints: [string, boolean][] = options.entryNames.map((name) => [name, true]);

  const generator = new IndexHtmlGenerator({
    indexPath: options.indexPath,
    entrypoints,
    sri: options.mode === "build",
    postTransform: options.postTransform,
  });

  const result = await generator.process({
    lang: undefined,
    baseHref: options.baseHref,
    outputPath: options.outdir,
    files,
  });

  return {
    content: result.csrContent,
    warnings: result.warnings,
    errors: result.errors,
  };
}
