import { fileURLToPath } from "url";
import fs from "fs";

export class SdCliPostinstall {
  static run() {
    {
      const filePath = fileURLToPath(import.meta.resolve("@angular/build/package.json"));
      const contents = JSON.parse(fs.readFileSync(filePath).toString());
      delete contents.exports;
      fs.writeFileSync(filePath, JSON.stringify(contents, undefined, 2));
    }

    {
      const filePath = fileURLToPath(import.meta.resolve("cordova/bin/cordova"));
      let contents = fs.readFileSync(filePath).toString();
      contents = contents.replace("process.exitCode = err.code || 1;", "process.exitCode = 1;");
      contents = contents.replace("console.error(err.message);", "console.error(err);");
      fs.writeFileSync(filePath, contents);
    }
  }
}