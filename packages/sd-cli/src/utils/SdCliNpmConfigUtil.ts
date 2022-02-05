import { INpmConfig } from "../commons";

export class SdCliNpmConfigUtil {
  public static getDependencies(npmConfig: INpmConfig): { defaults: string[]; optionals: string[] } {
    return {
      defaults: [
        ...Object.keys(npmConfig.dependencies ?? {}),
        ...Object.keys(npmConfig.peerDependencies ?? {}).filter((item) => !npmConfig.peerDependenciesMeta?.[item].optional)
      ].distinct(),
      optionals: [
        ...Object.keys(npmConfig.optionalDependencies ?? {}),
        ...Object.keys(npmConfig.peerDependencies ?? {}).filter((item) => npmConfig.peerDependenciesMeta?.[item].optional)
      ].distinct()
    };
  }
}
