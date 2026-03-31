import path from "path";
import fs from "fs/promises";
import { pathx } from "@simplysm/core-node";

/**
 * Get version from root package.json
 */
export async function getVersion(cwd: string): Promise<string> {
  const pkgJsonPath = pathx.posix(path.join(cwd, "package.json"));
  const pkgJsonContent = await fs.readFile(pkgJsonPath, "utf-8");
  const pkgJson = JSON.parse(pkgJsonContent) as { version?: string };
  return pkgJson.version ?? "0.0.0";
}
