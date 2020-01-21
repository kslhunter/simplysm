import * as path from "path";
import * as fs from "fs-extra";

function nodeLoader(this: any): string {
  const targetPath = path.relative(process.cwd(), this.resourcePath);
  fs.copySync(this.resourcePath, path.resolve(this._compiler.options.output.path, targetPath));
  return `module.exports = eval(\`require("${targetPath.replace(/\\/g, "/")}")\`);`;
}

export = nodeLoader;
