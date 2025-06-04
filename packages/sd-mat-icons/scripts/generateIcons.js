import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const distDirPath = path.resolve(import.meta.dirname, `../lib`);
await fs.promises.rm(distDirPath, { recursive: true, force: true });
await fs.promises.mkdir(distDirPath);

const moduleDirPath = fileURLToPath(import.meta.resolve("@material-symbols/svg-400/rounded"));

const iconFiles = (
  await fs.promises.readdir(moduleDirPath, {
    withFileTypes: true,
  })
).filter((item) => item.isFile() && item.name.endsWith(".svg") && !item.name.endsWith("-fill.svg"));

for (const iconFile of iconFiles) {
  const pascalIconName = path
    .basename(iconFile.name, path.extname(iconFile.name))
    .replace(/[-._][a-z0-9]/g, (m) => m[1].toUpperCase())
    .replace(/^[a-z]/, (m) => m.toUpperCase());

  const varName = `mr4${pascalIconName}`;

  const js = `export { default as ${varName} } from "@material-symbols/svg-400/rounded/${iconFile.name}"`;
  const dts = `export const ${varName}: string;`;

  await fs.promises.writeFile(path.resolve(distDirPath, `${varName}.js`), js);
  await fs.promises.writeFile(path.resolve(distDirPath, `${varName}.d.ts`), dts);
}
