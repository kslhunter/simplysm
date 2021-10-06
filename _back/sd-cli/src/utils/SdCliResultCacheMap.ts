import { ISdPackageBuildResult } from "../commons";

export class SdCliResultCacheMap {
  private readonly _resultMap = new Map<string | undefined, ISdPackageBuildResult[]>();

  public get results(): ISdPackageBuildResult[] {
    return Array.from(this._resultMap.values()).mapMany();
  }

  public save(...results: ISdPackageBuildResult[]): void {
    for (const result of results) {
      if (this._resultMap.has(result.filePath)) {
        this._resultMap.get(result.filePath)!.push(result);
      }
      else {
        this._resultMap.set(result.filePath, [result]);
      }
    }
  }

  public delete(filePath: string): void {
    this._resultMap.delete(filePath);
  }
}