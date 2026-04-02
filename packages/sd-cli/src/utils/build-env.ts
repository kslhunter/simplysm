import path from "path";
import fs from "fs/promises";
import { pathx } from "@simplysm/core-node";

/**
 * 루트 package.json에서 버전을 가져온다.
 */
export async function getVersion(cwd: string): Promise<string> {
  const pkgJsonPath = pathx.posix(path.join(cwd, "package.json"));
  const pkgJsonContent = await fs.readFile(pkgJsonPath, "utf-8");
  const pkgJson = JSON.parse(pkgJsonContent) as { version?: string };
  return pkgJson.version ?? "0.0.0";
}
