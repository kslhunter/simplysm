import type { TNormPath } from "@simplysm/sd-core-node";
import { PathUtils } from "@simplysm/sd-core-node";

export class ScopePathSet {
  private readonly _data: Set<TNormPath>;

  constructor(arrOrSet?: TNormPath[] | Set<TNormPath>) {
    this._data = arrOrSet instanceof Set ? arrOrSet : new Set(arrOrSet);
  }

  inScope(filePath: string) {
    return Array.from(this._data).some((scope) => PathUtils.isChildPath(filePath, scope));
  }

  toArray() {
    return Array.from(this._data);
  }
}
