import path from "path";
import fs from "node:fs";
import sharp from "sharp";

/** PWA manifest icon entry */
export interface PwaIcon {
  src: string;
  sizes: string;
  type: string;
}

const ICON_SIZES = [192, 512];
const ICON_SOURCES = ["icon.png", "icon.svg"];

/**
 * public/ 디렉토리에서 원본 아이콘 파일을 찾아 PWA 아이콘을 자동 생성한다.
 *
 * @param pkgDir 패키지 디렉토리 경로
 * @returns 생성된 아이콘 manifest 배열 (원본 없으면 빈 배열)
 */
export async function generatePwaIcons(pkgDir: string): Promise<PwaIcon[]> {
  const publicDir = path.join(pkgDir, "public");

  // 원본 아이콘 탐색 (icon.png 우선)
  let sourceFile: string | undefined;
  for (const name of ICON_SOURCES) {
    const candidate = path.join(publicDir, name);
    if (fs.existsSync(candidate)) {
      sourceFile = candidate;
      break;
    }
  }

  if (sourceFile == null) {
    return [];
  }

  // icons/ 디렉토리 생성
  const iconsDir = path.join(publicDir, "icons");
  fs.mkdirSync(iconsDir, { recursive: true });

  // 각 크기로 리사이즈
  const icons: PwaIcon[] = [];
  for (const size of ICON_SIZES) {
    const outputName = `icon-${size}x${size}.png`;
    const outputPath = path.join(iconsDir, outputName);
    await sharp(sourceFile).resize(size, size).png().toFile(outputPath);
    icons.push({
      src: `icons/${outputName}`,
      sizes: `${size}x${size}`,
      type: "image/png",
    });
  }

  return icons;
}
