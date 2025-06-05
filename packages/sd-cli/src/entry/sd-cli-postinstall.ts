import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

export class SdCliPostinstall {
  static run() {
    {
      const filePath = fileURLToPath(import.meta.resolve("@angular/build/package.json"));
      const contents = JSON.parse(fs.readFileSync(filePath).toString());
      delete contents.exports;
      fs.writeFileSync(filePath, JSON.stringify(contents, undefined, 2));
    }

    {
      const fortawesomeDirPath = path.resolve(
        path.dirname(
          fileURLToPath(import.meta.resolve("@fortawesome/fontawesome-svg-core/package.json")),
        ),
        "..",
      );
      const iconsDirNames = fs
        .readdirSync(fortawesomeDirPath)
        .filter((item) => item.endsWith("-icons"));
      for (const iconsDirName of iconsDirNames) {
        const dirPath = path.resolve(fortawesomeDirPath, iconsDirName);

        const contents = JSON.parse(
          fs.readFileSync(path.resolve(dirPath, "package.json")).toString(),
        );
        contents.exports = {
          "./package.json": "./package.json",
          "./*": "./*.js",
        };
        fs.writeFileSync(
          path.resolve(dirPath, "package.json"),
          JSON.stringify(contents, undefined, 2),
        );
        fs.rmSync(path.resolve(dirPath, "index.d.ts"));
        fs.rmSync(path.resolve(dirPath, "index.js"));
        fs.rmSync(path.resolve(dirPath, "index.mjs"));
      }
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
