import { getSystemPath, virtualFs } from "@angular-devkit/core";
import { Observable } from "rxjs";
import { createWebpackInputHost } from "@ngtools/webpack/src/webpack-input-host";
import { SdAngularUtils } from "./SdAngularUtils";
import { InputFileSystem } from "webpack";
import { Stats } from "fs";

export function createWebpackInputHostForScss(inputFileSystem: InputFileSystem): virtualFs.Host<Stats> {
  const host = createWebpackInputHost(inputFileSystem);
  host.read = path => new Observable(obs => {
    try {
      const filePath = getSystemPath(path);
      let data = inputFileSystem.readFileSync(filePath);
      if (filePath.endsWith(".ts") && !filePath.endsWith(".d.ts")) {
        const newContent = SdAngularUtils.replaceScssToCss(filePath, data.toString()).content;
        data = Buffer.from(newContent);
      }
      obs.next(new Uint8Array(data).buffer as ArrayBuffer);
      obs.complete();
    }
    catch (e) {
      obs.error(e);
    }
  });

  return host;
}
