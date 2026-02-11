import path from "path";
import fs from "fs/promises";

/**
 * 루트 package.json에서 version 가져오기
 */
export async function getVersion(cwd: string): Promise<string> {
  const pkgJsonPath = path.join(cwd, "package.json");
  const pkgJsonContent = await fs.readFile(pkgJsonPath, "utf-8");
  const pkgJson = JSON.parse(pkgJsonContent) as { version?: string };
  return pkgJson.version ?? "0.0.0";
}
