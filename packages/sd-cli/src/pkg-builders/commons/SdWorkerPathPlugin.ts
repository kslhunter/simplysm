import esbuild from "esbuild";
import path from "path";
import { FsUtils, HashUtils } from "@simplysm/sd-core-node";

export function SdWorkerPathPlugin(outdir: string): esbuild.Plugin {
  return {
    name: "sd-worker-path-plugin",
    setup(build) {
      build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async (args) => {
        const originalSource = await FsUtils.readFileAsync(args.path);

        // 정규식: import.meta.resolve('...') 또는 "..." 캡쳐
        // 워커 파일뿐만 아니라 필요한 모든 리소스를 처리할 수 있지만, 일단 worker만 타겟팅
        const regex = /import\.meta\.resolve\(\s*(['"])([^'"]+?\.worker)(?:\.[a-z]+)?\1\s*\)/g;

        if (!regex.test(originalSource)) {
          return null;
        }

        // 매칭되는 모든 import.meta.resolve를 찾아서 처리
        const newSource = await replaceAsync(
          originalSource,
          regex,
          async (match, quote, relPath) => {
            // 1. 실제 워커 파일 경로 계산
            const workerSourcePath = path.resolve(path.dirname(args.path), relPath);

            // 확장자가 없을 경우 자동 탐색 (js, ts 등)
            const resolvedWorkerPath = resolveFile(workerSourcePath);
            if (resolvedWorkerPath == null) {
              // 파일이 없으면 건드리지 않음 (런타임 에러로 넘김)
              return match;
            }

            // 2. 출력될 워커 파일명 결정 (캐싱 및 중복 방지를 위해 해시 사용 권장)
            const fileContent = await FsUtils.readFileBufferAsync(resolvedWorkerPath);
            const hash = HashUtils.get(fileContent).substring(0, 8);
            const workerBaseName = path.basename(
              resolvedWorkerPath,
              path.extname(resolvedWorkerPath),
            );
            const outputFileName = `${workerBaseName}-${hash}.js`;
            const outputFilePath = path.join(outdir, "workers", outputFileName);

            // 3. 워커 파일 빌드 (존재하지 않거나 변경되었을 때만)
            // (간단하게 하기 위해 매번 빌드 시도하거나, 해시로 체크 가능. 여기선 esbuild 증분 빌드에 맡김)
            // *중요*: 워커도 번들링해야 함.
            await esbuild.build({
              ...build.initialOptions,
              plugins:
                build.initialOptions.plugins?.filter(
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
              // platform: build.initialOptions.platform,
              // target: build.initialOptions.target,
              // format: build.initialOptions.format,
              // minify: build.initialOptions.minify,
              // banner: build.initialOptions.banner,
              // sourcemap: build.initialOptions.sourcemap,
              // external: build.initialOptions.external, // 외부 의존성 설정 상속
              // 플러그인 상속 주의: 무한 루프 방지를 위해 이 플러그인은 제외해야 함
            });

            // 4. 경로 치환
            // 번들링된 메인 파일(dist/main.js) 기준으로 workers 폴더는 ./workers/ 임
            return `import.meta.resolve(${quote}./workers/${outputFileName}${quote})`;
          },
        );

        return {
          contents: newSource,
          loader: "ts", // 또는 js, 파일 확장자에 따라 다르게 처리 가능하나 보통 ts로 넘겨도 됨
          // 워커 파일이 변경되면 이 파일도 다시 빌드되어야 함을 알림
          // (정확히 하려면 워커의 의존성까지 다 넣어야 하지만, 최소한 워커 엔트리는 넣음)
          // watchFiles: ... (esbuild가 내부적으로 처리해주길 기대)
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
