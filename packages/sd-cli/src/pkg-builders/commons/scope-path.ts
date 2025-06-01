import { PathUtils, TNormPath } from "@simplysm/sd-core-node";

export class ScopePathSet {
  #data: Set<TNormPath>;

  constructor(arr?: TNormPath[]) {
    this.#data = new Set(arr);
  }

  inScope(filePath: string) {
    return Array.from(this.#data).some((scope) => PathUtils.isChildPath(filePath, scope));
  }

  toArray() {
    return Array.from(this.#data);
  }
}