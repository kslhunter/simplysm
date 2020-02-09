import * as path from "path";
import {FsUtil, FsWatcher, Logger} from "@simplysm/sd-core-node";
import {SdPackage} from "../SdPackage";
import {SdProjectConfig} from "../configs/SdProjectConfig";

export class SdNgModuleDefinitionsFileGenerator {
  public static async createAsync(packagePath: string,
                                  mode: "development" | "production",
                                  options: string[]): Promise<SdNgModuleDefinitionsFileGenerator> {
    const configPath = path.resolve(process.cwd(), "simplysm.json");
    const config = await SdProjectConfig.loadAsync(configPath, mode, options);

    const pkg = await SdPackage.createAsync(config, packagePath);
    return new SdNgModuleDefinitionsFileGenerator(pkg);
  }

  private readonly _targetPath: string;

  private constructor(private readonly _pkg: SdPackage) {
    this._targetPath = path.resolve(_pkg.tsConfigs[0].srcPath, "module-definitions.ts");
  }

  public async runAsync(watch: boolean): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", this._pkg.packageKey, "ng-module-definitions-generate"]);

    await this._generateModuleDefinitionsFileAsync();

    if (watch) {
      await FsWatcher.watchAsync(path.resolve(this._pkg.packagePath, "src", "*", "**", "*.ts"), async (changedInfos) => {
        for (const changedInfo of changedInfos) {
          if (path.resolve(changedInfo.filePath) === this._targetPath) {
            return;
          }

          if (changedInfo.type === "change") {
            return;
          }

          await this._generateModuleDefinitionsFileAsync();
        }
      }, (err) => {
        logger.error(`변경사항을 처리하는 중에 오류가 발생하였습니다.`, err);
      });
    }
  }

  private async _generateModuleDefinitionsFileAsync(): Promise<void> {
    const pageInfo = await this._getClassInfoAsync("Page");
    const controlInfo = await this._getClassInfoAsync("Control");
    const entryComponentInfo = await this._getClassInfoAsync("EntryComponent");
    const directiveInfo = await this._getClassInfoAsync("Directive");
    const pipeInfo = await this._getClassInfoAsync("Pipe");
    const providerInfo = await this._getClassInfoAsync("Provider");

    const importTexts = [
      ...pageInfo.importTexts,
      ...controlInfo.importTexts,
      ...entryComponentInfo.importTexts,
      ...directiveInfo.importTexts,
      ...pipeInfo.importTexts,
      ...providerInfo.importTexts
    ];

    if (importTexts.length > 0) {
      let content = importTexts.join("\n") + "\n";
      content += "\n";

      content += "export const pages = [\n";
      content += pageInfo.classNames.map((item) => "  " + item).join(",\n") + "\n";
      content += "];\n";
      content += "\n";

      content += "export const controls = [\n";
      content += controlInfo.classNames.map((item) => "  " + item).join(",\n") + "\n";
      content += "];\n";
      content += "\n";

      content += "export const entryComponents = [\n";
      content += entryComponentInfo.classNames.map((item) => "  " + item).join(",\n") + "\n";
      content += "];\n";
      content += "\n";

      content += "export const directives = [\n";
      content += directiveInfo.classNames.map((item) => "  " + item).join(",\n") + "\n";
      content += "];\n";
      content += "\n";

      content += "export const pipes = [\n";
      content += pipeInfo.classNames.map((item) => "  " + item).join(",\n") + "\n";
      content += "];\n";
      content += "\n";

      content += "export const providers = [\n";
      content += providerInfo.classNames.map((item) => "  " + item).join(",\n") + "\n";
      content += "];\n";

      const prevContent = FsUtil.exists(this._targetPath) ? await FsUtil.readFileAsync(this._targetPath) : "";
      if (prevContent !== content) {
        await FsUtil.writeFileAsync(this._targetPath, content);
      }
    }
    else {
      await FsUtil.removeAsync(this._targetPath);
    }
  }

  private async _getClassInfoAsync(postfix: string): Promise<{ importTexts: string[]; classNames: string[] }> {
    const tsFilePaths = await FsUtil.globAsync(path.resolve(this._pkg.tsConfigs[0].srcPath, "*", "**", `*${postfix}.ts`));
    const importTexts: string[] = [];
    const classNames: string[] = [];
    for (const tsFilePath of tsFilePaths) {
      const relativePath = path.relative(this._pkg.tsConfigs[0].srcPath, tsFilePath);
      const modulePath = relativePath.replace(/\.ts$/, "").replace(/\\/g, "/");
      const className = path.basename(modulePath);

      importTexts.push(`import {${className}} from "./${modulePath}";`);
      classNames.push(className);
    }

    return {importTexts, classNames};
  }
}