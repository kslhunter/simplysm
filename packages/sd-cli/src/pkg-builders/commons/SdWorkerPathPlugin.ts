import esbuild from "esbuild";
import path from "path";
import { FsUtils, HashUtils } from "@simplysm/sd-core-node";

export async function transformWorkerPaths(
  source: string,
  filePath: string,
  outdir: string,
  buildOptions: esbuild.BuildOptions,
  baseUrlExpr: string = "import.meta.url",
): Promise<string> {
  // g flag regex는 함수 내에서 생성해야 lastIndex 상태 누출 방지
  const regex = /import\.meta\.resolve\(\s*(['"])([^'"]+?\.worker)(?:\.[a-z]+)?\1\s*\)/g;

  if (!regex.test(source)) {
    return source;
  }

  return await replaceAsync(source, regex, async (_match, quote, relPath) => {
    // 1. 실제 워커 파일 경로 계산
    const workerSourcePath = path.resolve(path.dirname(filePath), relPath);

    // 확장자가 없을 경우 자동 탐색 (js, ts 등)
    const resolvedWorkerPath = resolveFile(workerSourcePath);
    if (resolvedWorkerPath == null) {
      // 파일이 없으면 건드리지 않음 (런타임 에러로 넘김)
      return _match;
    }

    // 2. 출력될 워커 파일명 결정 (해시 사용)
    const fileContent = await FsUtils.readFileBufferAsync(resolvedWorkerPath);
    const hash = HashUtils.get(fileContent).substring(0, 8);
    const workerBaseName = path.basename(resolvedWorkerPath, path.extname(resolvedWorkerPath));
    const outputFileName = `${workerBaseName}-${hash}.js`;
    const outputFilePath = path.join(outdir, "workers", outputFileName);

    // 3. 워커 파일 빌드
    await esbuild.build({
      ...buildOptions,
      plugins:
        buildOptions.plugins?.filter(
          (item) =>
            item.name !== "sd-worker-path-plugin" &&
            item.name !== "sd-ng-plugin" &&
            item.name !== "sd-server-plugin",
        ) ?? [],
      outdir: undefined,

      entryPoints: [resolvedWorkerPath],
      bundle: true,
      write: true,
      splitting: false,
      outfile: outputFilePath,
    });

    // 4. new URL(..., baseUrlExpr).href로 치환
    // 클라이언트: document.baseURI (esbuild가 import.meta를 빈 객체로 대체하는 문제 회피)
    // 서버: import.meta.url (Node.js에서 정상 동작)
    return `new URL(${quote}./workers/${outputFileName}${quote}, ${baseUrlExpr}).href`;
  });
}

export function SdWorkerPathPlugin(outdir: string): esbuild.Plugin {
  return {
    name: "sd-worker-path-plugin",
    setup(build) {
      build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async (args) => {
        const originalSource = await FsUtils.readFileAsync(args.path);

        const transformed = await transformWorkerPaths(
          originalSource,
          args.path,
          outdir,
          build.initialOptions,
        );

        if (transformed === originalSource) {
          return null;
        }

        return {
          contents: transformed,
          loader: "ts",
        };
      });
    },
  };
}

// 정규식 비동기 replace 헬퍼
async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (match: string, ...args: any[]) => Promise<string>,
) {
  const promises: Promise<string>[] = [];
  str.replace(regex, (match, ...args) => {
    promises.push(asyncFn(match, ...args));
    return match;
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift()!);
}

// 파일 확장자 찾기 헬퍼
function resolveFile(filePathWithoutExt: string): string | undefined {
  if (FsUtils.exists(filePathWithoutExt)) return filePathWithoutExt;

  const exts = [".ts", ".js", ".mjs", ".cjs"];
  for (const ext of exts) {
    const p = filePathWithoutExt + ext;
    if (FsUtils.exists(p)) return p;
  }
  return undefined;
}
