import * as fs from "fs-extra";
import * as ts from "typescript";
import * as path from "path";

export const helpers = {
  stringifyEnv(param: { [key: string]: string | undefined }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key of Object.keys(param)) {
      result[key] = param[key] === undefined ? "undefined" : JSON.stringify(param[key]);
    }
    return result;
  },
  getTsconfig(contextPath: string): ts.ParsedCommandLine {
    const tsconfigPath = path.resolve(contextPath, "tsconfig.json");
    const tsconfigJson = fs.readJsonSync(tsconfigPath);
    if (tsconfigJson.compilerOptions.paths) {
      const newPaths = {};
      for (const key of Object.keys(tsconfigJson.compilerOptions.paths)) {
        newPaths[key] = tsconfigJson.compilerOptions.paths[key].map((item: string) => item.replace(/src\/index\.ts$/, ""));
      }
      tsconfigJson.compilerOptions.paths = newPaths;
    }
    return ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, contextPath);
  }
};
