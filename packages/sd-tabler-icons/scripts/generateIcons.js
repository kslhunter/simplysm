/*
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const distDirPath = path.resolve(import.meta.dirname, `../icons`);
await fs.promises.rm(distDirPath, { recursive: true, force: true });
await fs.promises.mkdir(distDirPath);

const moduleDirPath = fileURLToPath(import.meta.resolve("@tabler/icons/icons/outline"));

const iconFiles = (
  await fs.promises.readdir(moduleDirPath, {
    withFileTypes: true,
  })
).filter((item) => item.isFile() && item.name.endsWith(".svg"));

for (const iconFile of iconFiles) {
  const pascalIconName = path
    .basename(iconFile.name, path.extname(iconFile.name))
    .replace(/[-._][a-z0-9]/g, (m) => m[1].toUpperCase())
    .replace(/^[a-z]/, (m) => m.toUpperCase());

  const varName = `ta${pascalIconName}`;

  const js = `export { default as ${varName} } from "@tabler/icons/${iconFile.name}"`;
  const dts = `export const ${varName}: string;`;

  await fs.promises.writeFile(path.resolve(distDirPath, `${varName}.js`), js);
  await fs.promises.writeFile(path.resolve(distDirPath, `${varName}.d.ts`), dts);
}
*/

import * as fs from "node:fs";
import path from "node:path";

const distDirPath = path.resolve(import.meta.dirname, `../icons`);
await fs.promises.rm(distDirPath, { recursive: true, force: true });
await fs.promises.mkdir(distDirPath);

const jsonFilePath = path.resolve(
  import.meta.dirname,
  "../../../node_modules/@tabler/icons/tabler-nodes-outline.json",
);
const content = await fs.promises.readFile(jsonFilePath);
const record = JSON.parse(content.toString());
for (const iconName in record) {
  const iconFullName =
    "ta" +
    iconName
      .replace(/[-._][a-z0-9]/g, (m) => m[1].toUpperCase())
      .replace(/^[a-z]/, (m) => m.toUpperCase());

  const js = `
export const ${iconFullName} = ${JSON.stringify(record[iconName])};`.trim();
  const dts = `import {SdTablerIcon} from "../index"; export const ${iconFullName}: SdTablerIcon;`;

  await fs.promises.writeFile(path.resolve(distDirPath, `ta-${iconName}.js`), js);
  await fs.promises.writeFile(path.resolve(distDirPath, `ta-${iconName}.d.ts`), dts);
}
