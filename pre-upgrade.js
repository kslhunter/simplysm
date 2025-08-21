import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "path";

const outputJson = execSync("npm view @angular/build@^20 --json", { encoding: "utf-8" });
const output = JSON.parse(outputJson);
const esbuildVersion = output[output.length - 1].dependencies.esbuild;

const npmConfPath = path.resolve(import.meta.dirname, "packages/sd-cli/package.json");
const npmConfJson = readFileSync(npmConfPath, { encoding: "utf-8" });
const npmConf = JSON.parse(npmConfJson);
process.stdout.write(`esbuild: ${npmConf.dependencies.esbuild} -> ${esbuildVersion}\n`);
npmConf.dependencies.esbuild = esbuildVersion;
writeFileSync(npmConfPath, JSON.stringify(npmConf, undefined, 2));
