import fs from "fs";
import path from "path";

const moduleRecord = {
  fab: "@fortawesome/free-brands-svg-icons",
  fad: "@fortawesome/pro-duotone-svg-icons",
  fal: "@fortawesome/pro-light-svg-icons",
  far: "@fortawesome/pro-regular-svg-icons",
  fas: "@fortawesome/pro-solid-svg-icons"
};


const iconFullNames = [];

let mjsContent = `import { IconDefinition } from "@fortawesome/fontawesome-svg-core";\n`;
mjsContent += "export const sdIconRecord = {\n";
for (const moduleName of Object.keys(moduleRecord)) {
  const moduleFullName = moduleRecord[moduleName];
  const modulePath = path.resolve(process.cwd(), "node_modules", moduleFullName);

  const fileNames = fs.readdirSync(modulePath);
  for (const fileName of fileNames) {
    if (fileName.startsWith("fa") && fileName.endsWith(".js")) {
      const iconName = path.basename(fileName, path.extname(fileName)).slice(2);
      mjsContent += `  ${moduleName}${iconName}: () => import("${moduleFullName}/fa${iconName}").then((m) => m.fa${iconName}),\n`;
      iconFullNames.push(moduleName + iconName);
    }
  }
}

mjsContent = mjsContent.slice(0, -2) + "\n";
mjsContent += "};\n";

// content += "export type TSdIconName = keyof typeof sdIconRecord;\n";
mjsContent += "export const sdIconNames = Object.keys(sdIconRecord);\n";

const mjsTargetPath = path.resolve(process.cwd(), "packages", "sd-angular", "lib", "sd-icon.commons.mjs");
fs.writeFileSync(mjsTargetPath, mjsContent);

let dtsContent = "";

dtsContent += "export declare type TSdIconName = \n";
for (const iconFullName of iconFullNames) {
  dtsContent += `  "${iconFullName}" |\n`;
}
dtsContent = dtsContent.slice(0, -2) + ";\n";

dtsContent += "export declare const sdIconRecord: { [key: TSdIconName]: () => Promise<IconDefinition> };\n";

dtsContent += "export declare const sdIconNames: TSdIconName[];";


const dtsTargetPath = path.resolve(process.cwd(), "packages", "sd-angular", "lib", "sd-icon.commons.d.ts");
fs.writeFileSync(dtsTargetPath, dtsContent);

