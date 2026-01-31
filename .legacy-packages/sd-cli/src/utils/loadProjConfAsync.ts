import path from "path";
import { createJiti } from "jiti";
import type { TSdProjectConfigFn } from "../types/config/ISdProjectConfig";

export async function loadProjConfAsync(
  rootPath: string,
  dev: boolean,
  opt: {
    config: string;
    options?: string[];
  },
) {
  const filePath = path.resolve(rootPath, opt.config);
  const jiti = createJiti(rootPath, {
    interopDefault: true,
  });
  const imported = await jiti.import(filePath);
  return (imported as { default: TSdProjectConfigFn }).default(dev, opt.options ?? []);
}
