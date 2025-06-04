import fs from "fs";
import path from "path";

const exportLines = [];
const exportDefLines = [];

const pkgDirs = fs
  .readdirSync(path.resolve(import.meta.dirname, "../../../node_modules/@material-symbols"), {
    withFileTypes: true,
  })
  .filter((item) => item.isDirectory() && /^svg-[0-9]00$/.test(item.name));

for (const pkgDir of pkgDirs) {
  const widthNum = pkgDir.name.slice(4, -2);

  const typeDirs = fs
    .readdirSync(path.resolve(pkgDir.parentPath, pkgDir.name), { withFileTypes: true })
    .filter((item) => item.isDirectory());
  for (const typeDir of typeDirs) {
    const typeChar = typeDir.name[0];

    const iconFiles = fs
      .readdirSync(path.resolve(typeDir.parentPath, typeDir.name), { withFileTypes: true })
      .filter((item) => item.isFile() && item.name.endsWith(".svg"));
    for (const iconFile of iconFiles) {
      const pascalIconName = path
        .basename(iconFile.name, path.extname(iconFile.name))
        .replace(/[-._][a-z]/g, (m) => m[1].toUpperCase())
        .replace(/^[a-z]/, (m) => m.toUpperCase());

      const varName = `m${typeChar}${widthNum}${pascalIconName}`;

      exportLines.push(
        `export { default as ${varName} } from "@material-symbols/${pkgDir.name}/${typeDir.name}/${iconFile.name}"`,
      );
      exportDefLines.push(`export const ${varName}: string;`);
    }
  }
}

fs.writeFileSync(path.resolve(import.meta.dirname, "../dist/index.js"), exportLines.join("\n"));
fs.writeFileSync(path.resolve(import.meta.dirname, "../dist/index.d.ts"), exportDefLines.join("\n"));
