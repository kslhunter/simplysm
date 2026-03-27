import path from "path";
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";

export function convertOutputToReal(
  filePath: string,
  distPath: TNormPath,
  pkgPath: TNormPath,
  text: string,
): { filePath: TNormPath; text: string } {
  let realFilePath = PathUtils.norm(filePath);
  let realText = text;

  // 패턴 1: dist/<패키지명>/src/ (commonSourceDirectory가 packages/)
  const pkgNameSrcPath = PathUtils.norm(path.resolve(distPath, path.basename(pkgPath), "src"));
  // 패턴 2: dist/src/ (commonSourceDirectory가 패키지 루트)
  const directSrcPath = PathUtils.norm(path.resolve(distPath, "src"));

  let matchedBasePath: TNormPath | undefined;

  if (PathUtils.isChildPath(realFilePath, pkgNameSrcPath)) {
    matchedBasePath = pkgNameSrcPath;
  } else if (PathUtils.isChildPath(realFilePath, directSrcPath)) {
    matchedBasePath = directSrcPath;
  }

  if (matchedBasePath != null) {
    const newFilePath = PathUtils.norm(distPath, path.relative(matchedBasePath, realFilePath));

    // source map 보정: matchedBasePath와 distPath 간 depth 차이만큼 "../" 제거
    if (filePath.endsWith(".js.map")) {
      const depthDiff = path.relative(distPath, matchedBasePath).split(path.sep).length;

      if (depthDiff > 0) {
        const sourceMapContents = JSON.parse(realText);
        const prefixToRemove = "../".repeat(depthDiff);
        sourceMapContents.sources[0] = sourceMapContents.sources[0].slice(prefixToRemove.length);
        realText = JSON.stringify(sourceMapContents);
      }
    }

    realFilePath = newFilePath;
  }

  return { filePath: realFilePath, text: realText };
}
