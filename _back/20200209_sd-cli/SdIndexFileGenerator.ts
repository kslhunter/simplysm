import * as path from "path";
import {FsUtil, FsWatcher, Logger} from "@simplysm/sd-core-node";
import {SdPackage} from "../SdPackage";
import {SdProjectConfig} from "../configs/SdProjectConfig";

export class SdIndexFileGenerator {
  public static async createAsync(packagePath: string,
                                  mode: "development" | "production",
                                  options: string[]): Promise<SdIndexFileGenerator> {
    const configPath = path.resolve(process.cwd(), "simplysm.json");
    const config = await SdProjectConfig.loadAsync(configPath, mode, options);

    const pkg = await SdPackage.createAsync(config, packagePath);
    return new SdIndexFileGenerator(pkg);
  }

  private readonly _indexTsFilePath: string;
  private _indexTsFileContentCache = "";

  private constructor(private readonly _pkg: SdPackage) {
    this._indexTsFilePath = path.resolve(
      this._pkg.tsConfigs[0].srcPath,
      path.relative(
        this._pkg.tsConfigs[0].distPath,
        path.resolve(
          this._pkg.packagePath,
          this._pkg.npmConfig.main
        )
      )
    ).replace(/\.js$/, ".ts");
  }

  public async runAsync(watch: boolean): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", this._pkg.packageKey, "index-file-generate"]);

    await this._generateIndexTsFileAsync();

    if (watch) {
      await FsWatcher.watchAsync(path.resolve(this._pkg.packagePath, "src", "**", "*.ts"), async (changedInfos) => {
        for (const changedInfo of changedInfos) {
          if (path.resolve(changedInfo.filePath) === this._indexTsFilePath) {
            return;
          }

          if (changedInfo.type === "change") {
            return;
          }

          await this._generateIndexTsFileAsync();
        }
      }, (err) => {
        logger.error(`변경사항을 처리하는 중에 오류가 발생하였습니다.`, err);
      });
    }
  }

  private async _generateIndexTsFileAsync(): Promise<void> {
    const srcTsFiles = await FsUtil.globAsync(path.resolve(this._pkg.tsConfigs[0].srcPath, "**", "*.ts"));
    const importTexts: string[] = [];
    if (this._pkg.config?.type === "library" && this._pkg.config.polyfills) {
      for (const polyfill of this._pkg.config.polyfills) {
        importTexts.push(`import "${polyfill}";`);
      }
    }

    for (const srcTsFile of srcTsFiles) {
      if (path.resolve(srcTsFile) === path.resolve(this._indexTsFilePath)) {
        continue;
      }

      if (path.resolve(srcTsFile).endsWith("module-definitions.ts")) {
        continue;
      }

      if (path.resolve(srcTsFile).endsWith("routes.ts")) {
        continue;
      }

      const relativePath = path.relative(this._pkg.tsConfigs[0].srcPath, srcTsFile);
      const modulePath = relativePath.replace(/\.ts$/, "").replace(/\\/g, "/");

      const contents = await FsUtil.readFileAsync(srcTsFile);
      if (contents.split("\n").some((line) => /^export /.test(line))) {
        importTexts.push(`export * from "./${modulePath}";`);
      }
      else {
        importTexts.push(`import "./${modulePath}";`);
      }
    }

    const content = importTexts.join("\n");
    if (this._indexTsFileContentCache !== content) {
      this._indexTsFileContentCache = content;
      await FsUtil.writeFileAsync(this._indexTsFilePath, content);
    }
  }
}