/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {getSystemPath, Path, virtualFs} from "@angular-devkit/core";
import {Observable} from "rxjs";
// tslint:disable-next-line: no-submodule-imports
import {WebpackInputHost} from "@ngtools/webpack/src/webpack-input-host";
import {SdAngularUtils} from "../utils/SdAngularUtils";

export class SdWebpackInputHostWithScss extends WebpackInputHost {
  public read(path: Path): Observable<virtualFs.FileBuffer> {
    return new Observable((obs) => {
      try {
        const filePath = getSystemPath(path);
        let data = this.inputFileSystem.readFileSync(filePath);
        if (filePath.match(/\.ts$/) && !filePath.match(/\.d\.ts$/)) {
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
  }
}
