import { INpmConfig } from "../../../commons";
import { FsUtil } from "@simplysm/sd-core-node";
import path from "path";

export const fc_package_npmconfig = (opt: {
  projPath: string;
  name: string;
  description: string;
  isModule: boolean;
  main?: string;
  types?: string;
  dependencies: Record<string, string>;
}): string => {
  const projNpmConfig = FsUtil.readJson(path.resolve(opt.projPath, "package.json")) as INpmConfig;

  if (projNpmConfig.repository?.url === undefined) {
    throw new Error("프로젝트 package.json 파일에 reposotry.url 이 설정되어있지 않습니다.");
  }

  return JSON.stringify({
    name: `@${projNpmConfig.name}/${opt.name}`,
    version: `${projNpmConfig.version}`,
    description: `${projNpmConfig.description} - ${opt.description}`,
    author: projNpmConfig.author,
    repository: {
      type: "git",
      url: projNpmConfig.repository.url,
      directory: `packages/${opt.name}`
    },
    license: "UNLICENSED",
    ...opt.isModule ? {
      type: "module"
    } : {},
    private: true,
    sideEffects: false,
    engines: {
      node: "^18"
    },
    ...opt.types !== undefined ? { types: opt.types } : {},
    ...opt.main !== undefined ? { main: opt.main } : {},
    ...Object.keys(opt.dependencies).length > 0 ? { dependencies: opt.dependencies } : {}
  }, undefined, 2);
};
