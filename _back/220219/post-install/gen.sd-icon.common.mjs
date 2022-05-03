import fs from "fs";
import path from "path";

const moduleRecord = {
  fab: "@fortawesome/free-brands-svg-icons",
  fad: "@fortawesome/pro-duotone-svg-icons",
  fal: "@fortawesome/pro-light-svg-icons",
  far: "@fortawesome/pro-regular-svg-icons",
  fas: "@fortawesome/pro-solid-svg-icons"
};


let content = "export const sdIconRecord = {\n";
for (const moduleName of Object.keys(moduleRecord)) {
  const moduleFullName = moduleRecord[moduleName];
  const modulePath = path.resolve(process.cwd(), "node_modules", moduleFullName);

  const fileNames = fs.readdirSync(modulePath);
  for (const fileName of fileNames) {
    if (fileName.startsWith("fa") && fileName.endsWith(".js")) {
      const iconName = path.basename(fileName, path.extname(fileName)).slice(2);
      if (iconName === "UserCircle") {
        content += `  ${moduleName}${iconName}: import("${moduleFullName}/fa${iconName}").then((m) => m.fa${iconName}),\n`;
      }
    }
  }
}

content = content.slice(0, -2) + "\n";
content += "};\n";
content += "export type TSdIconName = keyof typeof sdIconRecord;\n";
content += "export const sdIconNames = Object.keys(sdIconRecord);\n";


const targetPath = path.resolve(process.cwd(), "packages", "sd-angular", "src", "sd-icon.commons.ts");
fs.writeFileSync(targetPath, content);
