import { execSync } from "node:child_process";
import path from "path";
import fs from "fs";

const outputJson = execSync("npm view @angular/build@^20 --json", { encoding: "utf-8" });
const output = JSON.parse(outputJson);

const ngDeps = {
  ...output[output.length - 1].dependencies,
  ...output[output.length - 1].peerDependencies,
};

const projNpmConfPath = path.resolve(process.cwd(), "package.json");
const projNpmConf = JSON.parse(fs.readFileSync(projNpmConfPath, { encoding: "utf-8" }));
const pkgPaths = fs.globSync(projNpmConf.workspaces);

const npmConfPaths = [
  projNpmConfPath,
  ...pkgPaths.map((item) => path.resolve(item, "package.json")),
];
for (const npmConfPath of npmConfPaths) {
  const npmConf = JSON.parse(fs.readFileSync(npmConfPath, { encoding: "utf-8" }));
  for (const npmConfDepKey in Object.keys(npmConf.dependencies)) {
    if (Object.keys(ngDeps).includes(npmConfDepKey)) {
      npmConf.dependencies[npmConfDepKey] = ngDeps[npmConfDepKey];
    }
  }

  fs.writeFileSync(npmConfPath, JSON.stringify(npmConf, undefined, 2));
}

/*const esbuildVersion = output[output.length - 1].dependencies.esbuild;

const npmConfPath = path.resolve(import.meta.dirname, "packages/sd-cli/package.json");
const npmConfJson = readFileSync(npmConfPath, { encoding: "utf-8" });
const npmConf = JSON.parse(npmConfJson);
process.stdout.write(`esbuild: ${npmConf.dependencies.esbuild} -> ${esbuildVersion}\n`);
npmConf.dependencies.esbuild = esbuildVersion;
writeFileSync(npmConfPath, JSON.stringify(npmConf, undefined, 2));*/
