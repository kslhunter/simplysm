import * as path from "path";
import {FsUtil, FsWatcher, Logger} from "@simplysm/sd-core-node";
import {SdPackage} from "../SdPackage";
import {SdProjectConfig} from "../configs/SdProjectConfig";

export class SdNgRoutesFileGenerator {
  public static async createAsync(packagePath: string,
                                  mode: "development" | "production",
                                  options: string[]): Promise<SdNgRoutesFileGenerator> {
    const configPath = path.resolve(process.cwd(), "simplysm.json");
    const config = await SdProjectConfig.loadAsync(configPath, mode, options);

    const pkg = await SdPackage.createAsync(config, packagePath);
    return new SdNgRoutesFileGenerator(pkg);
  }

  private readonly _targetPath: string;

  private constructor(private readonly _pkg: SdPackage) {
    this._targetPath = path.resolve(_pkg.tsConfigs[0].srcPath, "routes.ts");
  }

  public async runAsync(watch: boolean): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", this._pkg.packageKey, "ng-routes-generate"]);

    await this._generateModuleDefinitionsFileAsync();

    if (watch) {
      await FsWatcher.watchAsync(path.resolve(this._pkg.packagePath, "src", "pages", "**", "*.ts"), async (changedInfos) => {
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

  private async _generateModuleDefinitionsFileAsync(dirPath?: string): Promise<void> {
    const routeInfo = await this._getRouteInfoAsync();

    if (routeInfo.importTexts.length > 0) {
      let content = routeInfo.importTexts.join("\n") + "\n";
      content += "\n";
      content += "export const routes = [\n";
      content += routeInfo.routeTexts.map((item) => "  " + item.replace(/\n/g, "\n  ")).join(",\n") + "\n";
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

  private async _getRouteInfoAsync(dirPath?: string): Promise<{ importTexts: string[]; routeTexts: string[] }> {
    const currDirPath = dirPath || path.resolve(this._pkg.tsConfigs[0].srcPath, "pages");
    const childDirNames = await FsUtil.readdirAsync(currDirPath);

    const importTexts: string[] = [];
    const routeTexts: string[] = [];

    for (const childDirName of childDirNames) {

      const childDirPath = path.resolve(currDirPath, childDirName);
      if (await FsUtil.isDirectoryAsync(childDirPath)) {
        const childFileName =
          childDirName[0].toUpperCase()
          + childDirName.slice(1).replace(/\-[a-z]/g, (item) => item.slice(1).toUpperCase())
          + "Page.ts";

        const childFilePath = path.resolve(currDirPath, childFileName);

        if (!FsUtil.exists(childFilePath)) {
          let routeText = "{\n";
          routeText += `  path: "${childDirName}"`;
          const routeInfo = await this._getRouteInfoAsync(childDirPath);
          importTexts.push(...routeInfo.importTexts);
          if (routeInfo.routeTexts.length > 0) {
            routeText += ",\n";
            routeText += "  children: [\n";
            routeText += routeInfo.routeTexts.map((item) => "    " + item.replace(/\n/g, "\n    ")).join(",\n") + "\n";
            routeText += "  ]";
          }
          routeText += "\n";
          routeText += "}";

          routeTexts.push(routeText);
        }
      }
      else {
        const relativePath = path.relative(this._pkg.tsConfigs[0].srcPath, childDirPath);
        const modulePath = relativePath.replace(/\.ts$/, "").replace(/\\/g, "/");
        const moduleFileBaseName = path.basename(modulePath);

        importTexts.push(`import {${moduleFileBaseName}} from "./${modulePath}";`);

        const routePathName = moduleFileBaseName
          .replace(/Page$/, "")
          .replace(/[A-Z]/g, (item) => "-" + item.toLowerCase()).substring(1);
        let routeText = "{\n";
        routeText += `  path: "${routePathName}",\n`;
        routeText += `  component: ${moduleFileBaseName}`;

        const routeChildDirPath = path.resolve(currDirPath, routePathName);
        if (FsUtil.exists(routeChildDirPath)) {
          const routeInfo = await this._getRouteInfoAsync(routeChildDirPath);
          importTexts.push(...routeInfo.importTexts);

          if (routeInfo.routeTexts.length > 0) {
            routeText += ",\n";
            routeText += "  children: [\n";
            routeText += routeInfo.routeTexts.map((item) => "    " + item.replace(/\n/g, "\n    ")).join(",\n") + "\n";
            routeText += "  ]";
          }
        }
        routeText += "\n";
        routeText += "}";

        routeTexts.push(routeText);
      }
    }

    return {importTexts, routeTexts};
  }
}