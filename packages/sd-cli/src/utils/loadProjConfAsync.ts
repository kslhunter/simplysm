import { pathToFileURL } from "url";
import path from "path";
import { ISdProjectConfig } from "../types/config/ISdProjectConfig";

export async function loadProjConfAsync(
  rootPath: string,
  dev: boolean,
  opt: {
    config: string;
    options?: string[];
  },
) {
  const filePath = path.resolve(rootPath, opt.config);
  const imported = await import(pathToFileURL(filePath).href);
  return imported.default(dev, opt.options ?? []) as ISdProjectConfig;
}
