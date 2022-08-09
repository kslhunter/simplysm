import { FsUtil, Logger, SdProcess } from "@simplysm/sd-core-node";
import path from "path";
import { StringUtil } from "@simplysm/sd-core-common";
import { fc_project_editor_config } from "./file/project/fc_project_editor_config";
import { fc_project_eslintrc } from "./file/project/fc_project_eslintrc";
import { fc_project_gitignore } from "./file/project/fc_project_gitignore";
import { fc_project_gitattributes } from "./file/project/fc_project_gitattributes";
import { fc_project_npmconfig } from "./file/project/fc_project_npmconfig";
import { fc_project_readme } from "./file/project/fc_project_readme";
import { fc_project_simplysm } from "./file/project/fc_project_simplysm";
import { fc_project_tsconfig } from "./file/project/fc_project_tsconfig";
import { fc_package_eslintrc } from "./file/base/fc_package_eslintrc";
import { fc_package_npmconfig } from "./file/base/fc_package_npmconfig";
import { fc_package_tsconfig } from "./file/base/fc_package_tsconfig";
import { fc_package_DbContext } from "./file/db/fc_package_DbContext";
import { fc_package_DbModel } from "./file/db/fc_package_DbModel";
import { fc_package_server_main } from "./file/server/fc_package_server_main";
import { fc_package_AppModule } from "./file/client/fc_package_AppModule";
import { fc_package_AppPage } from "./file/client/fc_package_AppPage";
import { fileURLToPath } from "url";
import { fc_package_index } from "./file/client/fc_package_index";
import { fc_package_client_main } from "./file/client/fc_package_client_main";
import { fc_package_manifest } from "./file/client/fc_package_manifest";
import { INpmConfig } from "../commons";
import { fc_package_polyfills } from "./file/client/fc_package_polyfills";
import { fc_package_styles } from "./file/client/fc_package_styles";
import { ISdAutoIndexConfig } from "../build-tool/SdCliIndexFileGenerator";
import { fc_package_Page } from "./file/client/fc_package_Page";

export class SdCliProjectGenerator {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public constructor(private readonly _rootPath: string) {
  }

  public async initAsync(opt: { name?: string; description: string; author: string; gitUrl: string }): Promise<void> {
    if ((await FsUtil.readdirAsync(this._rootPath)).filter((item) => ![".idea", "package.json", "node_modules", "package-lock.json"].includes(path.basename(item))).length > 0) {
      throw new Error("빈 디렉토리가 아닙니다. (package-lock.json, package.json, node_modules 외의 파일/폴더가 존재하는 경우, 초기화할 수 없습니다.)");
    }

    const projName = opt.name ?? path.basename(this._rootPath);

    this._logger.log("'.editorconfig' 파일 생성");
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, ".editorconfig"), fc_project_editor_config());

    this._logger.log(`[${projName}] '.eslintrc.cjs' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, ".eslintrc.cjs"), fc_project_eslintrc());

    this._logger.log(`[${projName}]'.gitattributes' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, ".gitattributes"), fc_project_gitattributes());

    this._logger.log(`[${projName}] '.gitignore' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, ".gitignore"), fc_project_gitignore());

    this._logger.log(`[${projName}] 'package.json' 파일 생성`);
    let cliVersion: string | undefined;
    if (FsUtil.exists(path.resolve(this._rootPath, "package.json"))) {
      const npmConfig = await FsUtil.readJsonAsync(path.resolve(this._rootPath, "package.json")) as INpmConfig;
      cliVersion = npmConfig.dependencies?.["@simplysm/sd-cli"];
    }
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, "package.json"), fc_project_npmconfig({
      name: projName,
      description: opt.description,
      author: opt.author,
      gitUrl: opt.gitUrl,
      cliVersion
    }));

    this._logger.log(`[${projName}] 'README.md' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, "README.md"), fc_project_readme({
      description: opt.description
    }));

    this._logger.log(`[${projName}] 'simplysm.json' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, "simplysm.json"), fc_project_simplysm());

    this._logger.log(`[${projName}] 'tsconfig.json' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, "tsconfig.json"), fc_project_tsconfig());

    this._logger.log(`[${projName}] '.npmrc' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(this._rootPath, ".npmrc"), "legacy-peer-deps=true");

    this._logger.log(`[${projName}] 'packages' 디렉토리 생성`);
    await FsUtil.mkdirsAsync(path.resolve(this._rootPath, "packages"));

    this._logger.log(`[${projName}] npm install`);
    await SdProcess.spawnAsync("npm install", { cwd: this._rootPath }, true);
  }

  public async addTsLibAsync(opt: { name: string; description: string; useDom: boolean; isForAngular: boolean }): Promise<void> {
    const projNpmConfig = await this._getProjNpmConfigAsync();
    const projName = projNpmConfig.name;

    await this._addPackageBaseTemplate({
      name: opt.name,
      description: opt.description,
      useDom: opt.isForAngular || opt.useDom,
      isForAngular: opt.isForAngular,
      isModule: true,
      types: "dist/index.d.ts",
      main: "dist/index.mjs",
      dependencies: {},
      tsconfigOptions: {}
    });

    this._logger.log(`[${opt.name}] 'simplysm.json' 파일에 등록`);

    await this._addPackageToSimplysmJson({
      name: opt.name,
      type: "library",
      autoIndex: {
        ...opt.isForAngular ? {
          polyfills: [
            "@simplysm/sd-core-common",
            "@simplysm/sd-core-browser"
          ]
        } : {}
      },
    });

    this._logger.log(`[${projName}] npm install`);
    await SdProcess.spawnAsync("npm install", { cwd: this._rootPath }, true);
  }

  public async addDbLibAsync(opt: { name: string }): Promise<void> {
    const pkgName = "db-" + opt.name;
    const pkgPath = path.resolve(this._rootPath, "packages", pkgName);
    const projNpmConfig = await this._getProjNpmConfigAsync();
    const projName = projNpmConfig.name;

    await this._addPackageBaseTemplate({
      name: pkgName,
      description: "DB " + opt.name.toUpperCase(),
      useDom: false,
      isModule: false,
      isForAngular: false,
      types: "dist/index.d.ts",
      main: "dist/index.cjs",
      dependencies: {
        "@simplysm/sd-core-common": "~7.0.0",
        "@simplysm/sd-orm-common": "~7.0.0"
      },
      tsconfigOptions: {}
    });

    this._logger.log(`[${pkgName}] 'src/${StringUtil.toPascalCase(opt.name)}DbContext.ts' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, `src/${StringUtil.toPascalCase(opt.name)}DbContext.ts`), fc_package_DbContext({
      name: opt.name
    }));

    this._logger.log(`[${pkgName}] 'src/models' 디렉토리 생성`);
    await FsUtil.mkdirsAsync(path.resolve(pkgPath, "src/models"));

    this._logger.log(`[${pkgName}] 'simplysm.json' 파일에 등록`);
    await this._addPackageToSimplysmJson({
      name: pkgName,
      type: "library",
      autoIndex: {}
    });

    this._logger.log(`[${projName}] npm install`);
    await SdProcess.spawnAsync("npm install", { cwd: this._rootPath }, true);
  }

  public async addDbLibModelAsync(opt: { dbPkgName: string; category: string; name: string; description: string }): Promise<void> {
    const pkgName = "db-" + opt.dbPkgName;
    const pkgPath = path.resolve(this._rootPath, "packages", pkgName);

    this._logger.log(`[${pkgName}] 'src/models/${opt.category}/${opt.name}.ts' 파일 생성`);

    await FsUtil.writeFileAsync(
      path.resolve(pkgPath, `src/models/${opt.category}/${opt.name}.ts`),
      fc_package_DbModel({
        name: opt.name,
        description: opt.description
      })
    );

    this._logger.log(`[${pkgName}] DbContext 파일에 등록`);
    let dbContextContent = await FsUtil.readFileAsync(path.resolve(pkgPath, `src/${StringUtil.toPascalCase(opt.dbPkgName)}DbContext.ts`));

    if (!dbContextContent.includes(`Queryable`)) {
      this._logger.log(`[${pkgName}] DbContext 파일에 등록: import: Queryable`);
      dbContextContent = dbContextContent.replace(/ } from "@simplysm\/sd-orm-common";/, `, Queryable } from "@simplysm/sd-orm-common";`);
    }

    this._logger.log(`[${pkgName}] DbContext 파일에 등록: import: MODEL`);
    dbContextContent = `import { ${opt.name} } from "./models/${opt.category}/${opt.name}";\n` + dbContextContent;

    if (!dbContextContent.includes(`//-- ${opt.category}\n`)) {
      this._logger.log(`[${opt.name}] DbContext 파일에 등록: CATEGORY`);

      dbContextContent = dbContextContent.replace(/\n}/, `\n\n  //-- ${opt.category}\n}`);
    }

    this._logger.log(`[${pkgName}] DbContext 파일에 등록: MODEL`);

    dbContextContent = dbContextContent.replace(new RegExp(`//-- ${opt.category}\n`), `
  //-- ${opt.category}
  public readonly ${StringUtil.toCamelCase(opt.name)} = new Queryable(this, ${opt.name});
`.trim() + "\n");

    await FsUtil.writeFileAsync(path.resolve(pkgPath, `src/${StringUtil.toPascalCase(opt.dbPkgName)}DbContext.ts`), dbContextContent);
  }

  public async addServerAsync(opt: { name?: string; description?: string }): Promise<void> {
    const pkgName = "server" + (opt.name === undefined ? "" : `-${opt.name}`);
    const pkgPath = path.resolve(this._rootPath, "packages", pkgName);
    const projNpmConfig = await this._getProjNpmConfigAsync();
    const projName = projNpmConfig.name;

    await this._addPackageBaseTemplate({
      name: pkgName,
      description: (opt.description === undefined ? "" : `${opt.description.toUpperCase()} `) + "서버",
      useDom: false,
      isModule: false,
      isForAngular: false,
      main: "dist/main.js",
      dependencies: {
        "@simplysm/sd-core-common": "~7.0.0",
        "@simplysm/sd-core-node": "~7.0.0",
        "@simplysm/sd-service-common": "~7.0.0",
        "@simplysm/sd-service-server": "~7.0.0"
      },
      tsconfigOptions: {}
    });

    this._logger.log(`[${pkgName}] 'src/main.ts' 파일 등록`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, `src/main.ts`), fc_package_server_main({
      projPath: this._rootPath,
      pkgName: pkgName,
      port: Math.floor(Math.random() * 10000) + 50000
    }));

    this._logger.log(`[${pkgName}] 'simplysm.json' 파일에 등록`);
    await this._addPackageToSimplysmJson({
      name: pkgName,
      type: "server"
    });

    this._logger.log(`[${projName}] npm install`);
    await SdProcess.spawnAsync("npm install", { cwd: this._rootPath }, true);
  }

  public async addClientAsync(opt: { name: string; description: string; serverName: string }): Promise<void> {
    const pkgName = `client-${opt.name}`;
    const pkgPath = path.resolve(this._rootPath, "packages", pkgName);

    const projNpmConfig = await this._getProjNpmConfigAsync();
    const projName = projNpmConfig.name;

    await this._addPackageBaseTemplate({
      name: pkgName,
      description: `${opt.description} 클라이언트`,
      useDom: true,
      isModule: true,
      isForAngular: true,
      dependencies: {
        "@angular/platform-browser": "^13.2.0",
        "@angular/platform-browser-dynamic": "^13.2.0"
      },
      tsconfigOptions: {
        angularCompilerOptions: {
          "enableI18nLegacyMessageIdFormat": false,
          "strictInjectionParameters": true,
          "strictInputAccessModifiers": true,
          "strictTemplates": true,
          "strictInputTypes": false,
          "strictOutputEventTypes": false
        }
      }
    });

    this._logger.log(`[${pkgName}] 'src/AppModule.ts' 파일 등록`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "src/AppModule.ts"), fc_package_AppModule());

    this._logger.log(`[${pkgName}] 'src/AppPage.ts' 파일 등록`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "src/AppPage.ts"), fc_package_AppPage());

    this._logger.log(`[${pkgName}] 'src/index.html' 파일 등록`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "src/index.html"), fc_package_index({
      description: projNpmConfig.description + " - " + opt.description
    }));

    this._logger.log(`[${pkgName}] 'src/main.ts' 파일 등록`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "src/main.ts"), fc_package_client_main());

    this._logger.log(`[${pkgName}] 'src/manifest.json' 파일 등록`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "src/manifest.json"), fc_package_manifest({
      description: projNpmConfig.description + " - " + opt.description,
      author: projNpmConfig.author,
      version: projNpmConfig.version
    }));

    this._logger.log(`[${pkgName}] 'src/polyfills.ts' 파일 등록`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "src/polyfills.ts"), fc_package_polyfills());

    this._logger.log(`[${pkgName}] 'src/styles.scss' 파일 등록`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "src/styles.scss"), fc_package_styles());

    this._logger.log(`[${pkgName}] 'src/assets' 파일 복사`);
    await FsUtil.copyAsync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/client-files"),
      path.resolve(pkgPath, "src")
    );

    await this._addPackageToSimplysmJson({
      name: pkgName,
      type: "client",
      serverName: opt.serverName
    });

    this._logger.log(`[${projName}] npm install`);
    await SdProcess.spawnAsync("npm install", { cwd: this._rootPath }, true);
  }

  public async addPageAsync(opt: { pkgName: string; category?: string; name: string; isRouteParent: boolean }): Promise<void> {
    const pkgPath = path.resolve(this._rootPath, "packages", opt.pkgName);

    this._logger.log(`[${opt.pkgName}] 'src/app/${Boolean(opt.category) ? opt.category + "/" : ""}${opt.name}Page.ts' 파일 생성`);
    await FsUtil.writeFileAsync(
      path.resolve(pkgPath, `src/app/${Boolean(opt.category) ? opt.category + "/" : ""}${opt.name}Page.ts`),
      fc_package_Page({
        name: opt.name,
        isRouteParent: opt.isRouteParent
      })
    );

    if (opt.isRouteParent) {
      this._logger.log(`[${opt.name}] 'src/app/${Boolean(opt.category) ? opt.category + "/" : ""}${StringUtil.toKebabCase(opt.name)}' 디렉토리 생성`);
      await FsUtil.mkdirsAsync(path.resolve(pkgPath, `src/app/${Boolean(opt.category) ? opt.category + "/" : ""}${StringUtil.toKebabCase(opt.name)}`));
    }
  }

  private async _addPackageBaseTemplate(opt: { name: string; description: string; useDom: boolean; isModule: boolean; isForAngular: boolean; main?: string; types?: string; dependencies: Record<string, string>; tsconfigOptions: Record<string, any> }): Promise<void> {
    const pkgPath = path.resolve(this._rootPath, "packages", opt.name);

    this._logger.log(`[${opt.name}] '.eslintrc.cjs' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, ".eslintrc.cjs"), fc_package_eslintrc({
      isForAngular: opt.isForAngular
    }));

    this._logger.log(`[${opt.name}] 'package.json' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "package.json"), fc_package_npmconfig({
      projPath: this._rootPath,
      name: opt.name,
      description: opt.description,
      isModule: opt.isModule,
      main: opt.main,
      types: opt.types,
      dependencies: {
        ...opt.dependencies,
        ...opt.isForAngular ? {
          "@angular/common": "^13.2.0",
          "@angular/core": "^13.2.0",
          "@simplysm/sd-angular": "~7.0.0",
          "@simplysm/sd-core-common": "~7.0.0",
          "@simplysm/sd-core-browser": "~7.0.0",
          "rxjs": "^6.6.7",
          "zone.js": "~0.11.4"
        } : {}
      }
    }));

    this._logger.log(`[${opt.name}] 'tsconfig.json' 파일 생성`);
    await FsUtil.writeFileAsync(path.resolve(pkgPath, "tsconfig.json"), fc_package_tsconfig({
      isModule: opt.isModule,
      useDom: opt.useDom,
      options: opt.tsconfigOptions
    }));

    this._logger.log(`[${opt.name}] 'src' 디렉토리 생성`);
    await FsUtil.mkdirsAsync(path.resolve(pkgPath, "src"));
  }

  private async _addPackageToSimplysmJson(opt: { name: string; type: string; autoIndex?: ISdAutoIndexConfig; serverName?: string }): Promise<void> {
    const config = await FsUtil.readJsonAsync(path.resolve(this._rootPath, "simplysm.json"));
    config.packages = config.packages ?? {};
    config.packages[opt.name] = {
      type: opt.type,
      ...opt.autoIndex ? { autoIndex: opt.autoIndex } : {},
      ...opt.serverName !== undefined ? { server: opt.serverName } : {}
    };
    await FsUtil.writeJsonAsync(path.resolve(this._rootPath, "simplysm.json"), config, { space: 2 });
  }

  private async _getProjNpmConfigAsync(): Promise<INpmConfig & { description: string; author: string }> {
    const projNpmConfig = await FsUtil.readJsonAsync(path.resolve(this._rootPath, "package.json")) as INpmConfig;

    if (projNpmConfig.description === undefined) {
      throw new Error("프로젝트 package.json 파일에 description 이 설정되어있지 않습니다.");
    }
    if (projNpmConfig.author === undefined) {
      throw new Error("프로젝트 package.json 파일에 author 가 설정되어있지 않습니다.");
    }

    return projNpmConfig as any;
  }
}
