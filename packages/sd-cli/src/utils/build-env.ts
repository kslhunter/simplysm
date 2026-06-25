import path from "path";
import { fsx, pathx } from "@simplysm/core-node";

/**
 * 루트 package.json에서 버전을 가져온다.
 */
export async function getVersion(cwd: string): Promise<string> {
  const pkgJsonPath = pathx.posix(path.join(cwd, "package.json"));
  const pkgJson = await fsx.readJson<{ version?: string }>(pkgJsonPath);
  return pkgJson.version ?? "0.0.0";
}
