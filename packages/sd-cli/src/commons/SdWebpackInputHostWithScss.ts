/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {fragment, getSystemPath, Path, PathFragment, virtualFs} from "@angular-devkit/core";
import {Stats} from "fs";
import {Observable, throwError} from "rxjs";
import {map} from "rxjs/operators";
import {InputFileSystem} from "webpack";
import {SdTypescriptBuilder} from "../SdTypescriptBuilder";

export class SdWebpackInputHostWithScss implements virtualFs.Host<Stats> {
  public constructor(public readonly inputFileSystem: InputFileSystem) {
  }

  public get capabilities(): virtualFs.HostCapabilities {
    return {synchronous: true};
  }

  public write(_path: Path, _content: virtualFs.FileBufferLike): Observable<void> {
    return throwError(new Error("Not supported."));
  }

  public delete(_path: Path): Observable<void> {
    return throwError(new Error("Not supported."));
  }

  public rename(_from: Path, _to: Path): Observable<void> {
    return throwError(new Error("Not supported."));
  }

  public read(path: Path): Observable<virtualFs.FileBuffer> {
    return new Observable(obs => {
      try {
        const filePath = getSystemPath(path);
        let data = this.inputFileSystem.readFileSync(filePath);
        if (filePath.match(/\.ts$/) && !filePath.match(/\.d\.ts$/)) {
          const newContent = SdTypescriptBuilder.convertScssToCss(filePath, data.toString()).content;
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

  public list(path: Path): Observable<PathFragment[]> {
    return new Observable(obs => {
      try {
        const names: string[] = (this.inputFileSystem as any).readdirSync(getSystemPath(path));
        obs.next(names.map(name => fragment(name)));
        obs.complete();
      }
      catch (err) {
        obs.error(err);
      }
    });
  }

  public exists(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map(stats => stats !== null));
  }

  public isDirectory(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map(stats => stats !== null && stats.isDirectory()));
  }

  public isFile(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map(stats => stats !== null && stats.isFile()));
  }

  public stat(path: Path): Observable<Stats | null> {
    return new Observable(obs => {
      try {
        const stats = this.inputFileSystem.statSync(getSystemPath(path));
        obs.next(stats);
        obs.complete();
      }
      catch (e) {
        if (e.code === "ENOENT") {
          obs.next(null); //tslint:disable-line:no-null-keyword
          obs.complete();
        }
        else {
          obs.error(e);
        }
      }
    });
  }

  public watch(_path: Path, _options?: virtualFs.HostWatchOptions): null { //tslint:disable-line:no-null-keyword
    return null; //tslint:disable-line:no-null-keyword
  }
}
