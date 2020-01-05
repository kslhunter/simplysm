import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";

export class SdNpmConfig {
  public get name(): string {
    return this._config.name;
  }

  public get version(): string {
    return this._config.version;
  }

  public set version(value: string) {
    this._config.version = value;
  }

  public get workspaces(): string[] | undefined {
    return this._config.workspaces;
  }

  public set workspaces(value: string[] | undefined) {
    this._config.workspaces = value;
  }

  public get dependencies(): { [key: string]: string } | undefined {
    return this._config.dependencies;
  }

  public set dependencies(value: { [key: string]: string } | undefined) {
    this._config.dependencies = value;
  }

  public get devDependencies(): { [key: string]: string } | undefined {
    return this._config.devDependencies;
  }

  public set devDependencies(value: { [key: string]: string } | undefined) {
    this._config.devDependencies = value;
  }

  public get peerDependencies(): { [key: string]: string } | undefined {
    return this._config.peerDependencies;
  }

  public set peerDependencies(value: { [key: string]: string } | undefined) {
    this._config.peerDependencies = value;
  }

  private constructor(private readonly _packagePath: string,
                      private readonly _config: any) {
  }

  public static async loadAsync(packagePath: string): Promise<SdNpmConfig> {
    const filePath = path.resolve(packagePath, "package.json");
    const config = await fs.readJson(filePath);
    return new SdNpmConfig(packagePath, config);
  }

  public upgradeDependencyVersion(depObj: { [key: string]: string }): void {
    const fn = (currDeps: { [key: string]: string } | undefined) => {
      if (currDeps) {
        for (const depKey of Object.keys(depObj)) {
          if (currDeps[depKey]) {
            currDeps[depKey] = depObj[depKey];
          }
        }
      }
    };

    fn(this.dependencies);
    fn(this.devDependencies);
    fn(this.peerDependencies);
  }

  public async saveAsync(): Promise<void> {
    const filePath = path.resolve(this._packagePath, "package.json");
    await fs.writeJson(filePath, this._config, {spaces: 2, EOL: os.EOL});
  }
}
