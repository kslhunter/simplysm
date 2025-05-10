import { PathUtils, TNormPath } from "@simplysm/sd-core-node/src";

export class ScopePathSet {
  private _data: Set<TNormPath>;

  constructor(arr?: TNormPath[]) {
    this._data = new Set(arr);
  }

  inScope(filePath: string) {
    return Array.from(this._data).some((scope) => PathUtils.isChildPath(filePath, scope));
  }

  toArray() {
    return Array.from(this._data);
  }
}