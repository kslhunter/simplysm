import { INpmConfig } from "../commons";

export class SdCliNpmConfigUtil {
  public static getAllDependencies(npmConfig: INpmConfig): string[] {
    return [
      ...Object.keys(npmConfig.dependencies ?? {}),
      ...Object.keys(npmConfig.optionalDependencies ?? {}),
      ...Object.keys(npmConfig.devDependencies ?? {}),
      ...Object.keys(npmConfig.peerDependencies ?? {})
    ].distinct();
  }
}
