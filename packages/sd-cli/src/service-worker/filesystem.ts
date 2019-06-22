import {Filesystem} from "@angular/service-worker/config";
import {sha1Binary} from "./sha1";
import * as fs from "fs-extra";
import * as path from "path";

export class NodeFilesystem implements Filesystem {
  public constructor(private readonly _base: string) {
  }

  public async list(_path: string): Promise<string[]> {
    const dir = this.canonical(_path);
    const children = await fs.readdir(dir);

    const entries = await Promise.all(children.map(async entry => ({
      entry,
      stats: await fs.stat(path.join(dir, entry))
    })));

    const files = entries
      .filter(entry => !entry.stats.isDirectory())
      .map(entry => path.posix.join(_path, entry.entry));

    return entries
      .filter(entry => entry.stats.isDirectory())
      .map(entry => path.posix.join(_path, entry.entry))
      .reduce(
        async (list, subdir) => (await list).concat(await this.list(subdir)),
        Promise.resolve(files)
      );
  }

  public async read(_path: string): Promise<string> {
    const file = this.canonical(_path);
    return (await fs.readFile(file)).toString();
  }

  public async hash(_path: string): Promise<string> {
    const file = this.canonical(_path);
    const contents: Buffer = await fs.readFile(file);
    return sha1Binary(contents as any as ArrayBuffer);
  }

  public async write(_path: string, contents: string): Promise<void> {
    const file = this.canonical(_path);
    await fs.writeFile(file, contents);
  }

  private canonical(_path: string): string {
    return path.posix.join(this._base, _path);
  }
}
