import { cpx, fsx, pathx } from "@simplysm/core-node";
import { consola, LogLevels } from "consola";
import { createLazyLogger } from "../runtime/lazy-logger";

const _logger = createLazyLogger("sd:cli:capacitor");

/**
 * 앱 아이콘 처리 (소스 이미지 → 멀티 해상도 아이콘 + 스플래시)
 */
export async function setupIcon(
  pkgPath: string,
  capPath: string,
  iconRelPath: string,
): Promise<void> {
  const iconPath = pathx.posixResolve(pkgPath, iconRelPath);

  if (!(await fsx.exists(iconPath))) {
    _logger.warn(`아이콘 파일을 찾을 수 없습니다: ${iconPath}`);
    return;
  }

  try {
    const sharp = (await import("sharp")).default;

    // 소스 이미지를 리사이즈 (60% of 1024 = ~614px)
    const canvasSize = 1024;
    const contentSize = Math.round(canvasSize * 0.6);

    const resizedBuffer = await sharp(iconPath)
      .resize(contentSize, contentSize, { fit: "inside" })
      .png()
      .toBuffer();

    // 1024x1024 투명 캔버스에 합성
    const assetsDir = pathx.posixResolve(capPath, "assets");
    await fsx.mkdir(assetsDir);
    const logoPath = pathx.posixResolve(assetsDir, "logo.png");

    await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4 as const,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedBuffer, gravity: "center" }])
      .png()
      .toFile(logoPath);

    // capacitor-assets로 모든 해상도 아이콘/스플래시 생성
    const isDebug = consola.level >= LogLevels.debug;
    await cpx.spawn(
      "pnpm",
      [
        "exec",
        "capacitor-assets",
        "generate",
        "--iconBackgroundColor",
        "#ffffff",
        "--splashBackgroundColor",
        "transparent",
        "--logoSplashScale",
        "0.6",
      ],
      {
        cwd: capPath,
        ...(isDebug ? { stdio: ["ignore", "inherit", "inherit"] } : {}),
      },
    );
  } catch (err) {
    _logger.warn(
      `아이콘 생성에 실패했습니다: ${err instanceof Error ? err.message : err}`,
    );
  }
}
