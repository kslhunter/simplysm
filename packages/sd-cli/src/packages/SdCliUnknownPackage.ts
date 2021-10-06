import { ISdPackageBuildResult } from "../commons";
import { SdCliPackageBase } from "./SdCliPackageBase";

export class SdCliUnknownPackage extends SdCliPackageBase {
  public on(event: "change", listener: (target: "node" | "browser" | undefined) => void): this;
  public on(event: "complete", listener: (target: "node" | "browser" | undefined, results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public constructor(public readonly rootPath: string) {
    super(rootPath);
  }
}
