import path from "path";
import type { ConsolaInstance } from "consola";
import { fsx } from "@simplysm/core-node";

/**
 * 로컬 디렉토리에 dist를 복사한다
 */
export async function publishToLocal(
  pkgPath: string,
  pkgName: string,
  targetPath: string,
  logger: ConsolaInstance,
  dryRun: boolean,
): Promise<void> {
  const distPath = path.resolve(pkgPath, "dist");

  if (dryRun) {
    logger.info(`[DRY-RUN] [${pkgName}] 로컬 복사: ${distPath} → ${targetPath}`);
  } else {
    logger.debug(`[${pkgName}] 로컬 복사: ${distPath} → ${targetPath}`);
    await fsx.copy(distPath, targetPath);
  }
}
