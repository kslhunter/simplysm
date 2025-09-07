import { PathUtils, TNormPath } from "@simplysm/sd-core-node";

export class ScopePathSet {
  #data: Set<TNormPath>;

  constructor(arrOrSet?: TNormPath[] | Set<TNormPath>) {
    this.#data = arrOrSet instanceof Set ? arrOrSet : new Set(arrOrSet);
  }

  inScope(filePath: string) {
    return Array.from(this.#data).some((scope) => PathUtils.isChildPath(filePath, scope));
  }

  toArray() {
    return Array.from(this.#data);
  }
}
