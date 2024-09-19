import {fileURLToPath} from "url";
import * as fs from "node:fs";

const filePath = fileURLToPath(import.meta.resolve("@angular/build/package.json"));
const contents = JSON.parse(fs.readFileSync(filePath).toString());
delete contents.exports;
fs.writeFileSync(filePath, JSON.stringify(contents, undefined, 2));
