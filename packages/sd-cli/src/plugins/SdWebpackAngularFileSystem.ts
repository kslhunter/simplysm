import {getSystemPath, normalize, Path} from "@angular-devkit/core";
import {NodeWatchFileSystem, VirtualFileSystemDecorator} from "@ngtools/webpack/src/virtual_file_system_decorator";
import * as glob from "glob";
import * as path from "path";
import * as fs from "fs-extra";
import {
  ITsFileChangeInfo,
  ITsNgComponentOrDirectiveInfo,
  ITsNgModuleInfo,
  SdTypescriptBuilder
} from "../SdTypescriptBuilder";
import {IFileChangeInfo} from "@simplysm/sd-core";
import {JSDOM} from "jsdom";


export class SdWebpackAngularFileSystem extends NodeWatchFileSystem {
  private readonly _builder: SdTypescriptBuilder;

  private readonly _pagesDirPath: string;
  private readonly _modalsDirPath: string;
  private readonly _printTemplatesDirPath: string;
  private readonly _controlsDirPath: string;
  private readonly _modulesDirPath: string;

  public constructor(private readonly _virtualInputFileSystem: VirtualFileSystemDecorator,
                     private readonly _replacements: Map<Path, Path> | ((path: Path) => Path),
                     private readonly _tsConfigPath: string) {
    super(_virtualInputFileSystem);

    this._builder = new SdTypescriptBuilder(this._tsConfigPath);

    this._pagesDirPath = path.resolve(this._builder.rootDirPath, "pages");
    this._modalsDirPath = path.resolve(this._builder.rootDirPath, "modals");
    this._printTemplatesDirPath = path.resolve(this._builder.rootDirPath, "print-templates");
    this._controlsDirPath = path.resolve(this._builder.rootDirPath, "controls");
    this._modulesDirPath = path.resolve(this._builder.rootDirPath, "_modules");

    this._builder.updateDependencies();

    fs.removeSync(this._modulesDirPath);
    fs.removeSync(path.resolve(this._builder.rootDirPath, "_routes.ts"));

    const newChangeInfos = this._generateModuleFiles(this._builder.getFilePaths().map(item => ({
      type: "add",
      filePath: item
    })));
    if (newChangeInfos) {
      this._builder.applyChanges(newChangeInfos, currChangeInfos => {
        return this._generateModuleFiles(currChangeInfos);
      }).catch();
    }
  }

  public watch(files: string[],
               dirs: string[],
               missing: string[],
               startTime: number | undefined,
               options: {},
               callback: any,
               callbackUndelayed: (...args: any[]) => void): any {
    const reverseReplacements = new Map<string, string>();
    const reverseTimestamps = (map: Map<string, number>) => {
      for (const entry of Array.from(map.entries())) {
        const original = reverseReplacements.get(entry[0]);
        if (original) {
          map.set(original, entry[1]);
          map.delete(entry[0]);
        }
      }

      return map;
    };

    let undelayedChanged: string[] = [];
    const newCallbackUndelayed = (...args: any[]) => {
      if (typeof args[0] === "string") {
        const original = reverseReplacements.get(args[0]);
        if (original) {
          this._virtualInputFileSystem.purge(original);
          callbackUndelayed(original, args[1]);
          undelayedChanged.push(original);
        }
        else {
          callbackUndelayed(args[0], args[1]);
          undelayedChanged.push(args[0]);
        }
      }
      else {
        callbackUndelayed(...args);
      }
    };

    const newCallback = async (
      err: Error | null,
      filesModified: string[],
      contextModified: string[],
      missingModified: string[],
      fileTimestamps: Map<string, number>,
      contextTimestamps: Map<string, number>
    ) => {
      const filePaths = [
        ...filesModified,
        ...contextModified.filter(item => item.endsWith(".ts")),
        ...undelayedChanged
      ].map(item => path.normalize(item).replace(/\.js$/, ".d.ts"))
        .distinct();

      undelayedChanged = [];

      const changeInfos: IFileChangeInfo[] = filePaths.map(item => ({
        filePath: path.normalize(item),
        type: (fs.pathExistsSync(item) ? "change" : "unlink") as "change" | "unlink"
      }));

      const allChangeInfos = await this._builder.applyChanges(changeInfos, currChangeInfos => {
        return this._generateModuleFiles(currChangeInfos);
      });

      const changedFilePaths = allChangeInfos
        .map(item => item.filePath.replace(/\.d\.ts$/, ".js"))
        .filter(item => !filesModified.includes(item));

      filesModified.push(...changedFilePaths);

      const maxTimestamp = Array.from(fileTimestamps.values()).max()!;
      for (const filesModifiedItem of filesModified) {
        fileTimestamps.set(filesModifiedItem, maxTimestamp);
      }

      this._virtualInputFileSystem.purge(filesModified);

      // Update fileTimestamps with timestamps from virtual files.
      const virtualFilesStats = this._virtualInputFileSystem.getVirtualFilesPaths()
        .map(fileName => ({
          path: fileName,
          mtime: +this._virtualInputFileSystem.statSync(fileName).mtime
        }));
      virtualFilesStats.forEach(stats => fileTimestamps.set(stats.path, +stats.mtime));

      callback(
        err,
        filesModified.map(value => reverseReplacements.get(value) || value),
        contextModified.map(value => reverseReplacements.get(value) || value),
        missingModified.map(value => reverseReplacements.get(value) || value),
        reverseTimestamps(fileTimestamps),
        reverseTimestamps(contextTimestamps)
      );
    };

    const mapReplacements = (original: string[]): string[] => {
      if (!this._replacements) {
        return original;
      }
      const replacements = this._replacements;

      return original.map(file => {
        if (typeof replacements === "function") {
          const replacement = getSystemPath(replacements(normalize(file)));
          if (replacement !== file) {
            reverseReplacements.set(replacement, file);
          }

          return replacement;
        }
        else {
          const replacement = replacements.get(normalize(file));
          if (replacement) {
            const fullReplacement = getSystemPath(replacement);
            reverseReplacements.set(fullReplacement, file);

            return fullReplacement;
          }
          else {
            return file;
          }
        }
      });
    };

    const watcher = super.watch(
      mapReplacements(files),
      mapReplacements([...dirs, ...glob.sync(path.resolve(this._builder.rootDirPath, "**"))].distinct()),
      mapReplacements(missing),
      startTime,
      options,
      newCallback,
      newCallbackUndelayed
    );

    return {
      close: () => watcher.close(),
      pause: () => watcher.pause(),
      getFileTimestamps: () => reverseTimestamps(watcher.getFileTimestamps()),
      getContextTimestamps: () => reverseTimestamps(watcher.getContextTimestamps())
    };
  }

  private _generateModuleFiles(changedInfos: ITsFileChangeInfo[]): IFileChangeInfo[] {
    const newChangeInfos: IFileChangeInfo[] = [];

    const myTsFilePaths = this._builder.getFilePaths();
    const myChangedInfos = changedInfos.filter(item => item.type === "unlink" || myTsFilePaths.includes(item.filePath));

    // Module.ts => all Module.ts
    const changedInfosForAllModule = myChangedInfos
      .filter(item =>
        item.filePath.startsWith(path.resolve(this._modulesDirPath)) &&
        item.filePath.endsWith("Module.ts") &&
        !item.filePath.endsWith("RoutingModule.ts")
      );

    // pages, controls, modals, print-template => Module.ts
    const changedInfosForModule = myChangedInfos
      .filter(item =>
        item.filePath.startsWith(this._controlsDirPath) ||
        item.filePath.startsWith(this._pagesDirPath) ||
        item.filePath.startsWith(this._modalsDirPath) ||
        item.filePath.startsWith(this._printTemplatesDirPath)
      );

    if (changedInfosForAllModule.length > 0 || changedInfosForModule.length > 0) {
      const ngModules = this._builder.getNgModules();
      const ngComponentOrDirectives = this._builder.getNgComponentAndDirectives();

      if (changedInfosForAllModule.length > 0) {
        const filePathsForModule = this._builder.getFilePaths()
          .filter(item =>
            item.startsWith(this._controlsDirPath) ||
            item.startsWith(this._pagesDirPath) ||
            item.startsWith(this._modalsDirPath) ||
            item.startsWith(this._printTemplatesDirPath)
          );

        for (const filePath of filePathsForModule) {
          if (!ngComponentOrDirectives.some(item => item.path === filePath)) {
            continue;
          }

          try {
            const newChangeInfo = this._generateNgModule(ngModules!, ngComponentOrDirectives!, {
              filePath,
              type: "dependency"
            });
            if (newChangeInfo) {
              newChangeInfos.push(newChangeInfo);
            }
          }
          catch (err) {
            err.message = filePath + " ==>\n" + err.message;
            throw err;
          }
        }
      }

      if (changedInfosForModule.length > 0) {
        for (const changedInfo of changedInfosForModule) {
          if (!ngComponentOrDirectives.some(item => item.path === changedInfo.filePath)) {
            continue;
          }

          try {
            const newChangeInfo = this._generateNgModule(ngModules!, ngComponentOrDirectives!, changedInfo);
            if (newChangeInfo) {
              newChangeInfos.push(newChangeInfo);
            }
          }
          catch (err) {
            err.message = changedInfo.filePath + " ==>\n" + err.message;
            throw err;
          }
        }
      }
    }

    // pages => RoutingModule.ts
    const changedInfosForRoutingModule = myChangedInfos.filter(item => item.filePath.startsWith(this._pagesDirPath));
    for (const changedInfo of changedInfosForRoutingModule) {
      try {
        newChangeInfos.push(...this._generateRoutingModule(changedInfo));
      }
      catch (err) {
        err.message = changedInfo.filePath + " ==>\n" + err.message;
        throw err;
      }
    }

    // routes.ts
    if (myChangedInfos.some(item => item.filePath.startsWith(this._pagesDirPath) || this._isRoutingModule(item.filePath))) {
      const result = this._generateRootRoutes();
      if (result) {
        newChangeInfos.push(result);
      }
    }

    return newChangeInfos;
  }

  private _generateNgModule(ngModules: ITsNgModuleInfo[],
                            ngComponentOrDirectives: ITsNgComponentOrDirectiveInfo[],
                            changedInfo: ITsFileChangeInfo): IFileChangeInfo | undefined {
    const className = path.basename(changedInfo.filePath, path.extname(changedInfo.filePath));
    const outDirPath = path.resolve(this._modulesDirPath, path.relative(this._builder.rootDirPath, path.dirname(changedInfo.filePath)));
    const outFilePath = path.resolve(outDirPath, className + "Module.ts");

    if (changedInfo.type === "unlink") {
      if (fs.pathExistsSync(outFilePath)) {
        fs.removeSync(outFilePath);
        return {filePath: outFilePath, type: "unlink"};
      }
    }
    else {
      let content = ``;
      content += `import {NgModule} from "@angular/core";\n`;
      content += `import {CommonModule} from "@angular/common";\n`;

      let fileRelativePath = path.relative(outDirPath, changedInfo.filePath);
      fileRelativePath = fileRelativePath.startsWith(".") ? fileRelativePath : ("./" + fileRelativePath);
      content += `import {${className}} from "${fileRelativePath.replace(/\\/g, "/").replace(/\.d\.ts$/g, "").replace(/\.ts$/g, "")}";\n`;

      const imports = this._builder.getImports(changedInfo.filePath);

      const useModules = [];
      useModules.push(
        ...ngModules.filter(item => item.exports.concat(item.providers).some(exp => imports.some(imp => imp.targets.includes(exp))))
      );

      const componentTemplate = ngComponentOrDirectives.single(item => item.path === changedInfo.filePath)!.template;
      if (componentTemplate) {
        const componentDom = new JSDOM(componentTemplate);
        for (const ngComponent of ngComponentOrDirectives.filter(item => item.selector)) {
          const selectors = [
            ngComponent.selector,
            ngComponent.selector.replace(/\[/g, "[\\[").replace(/]/g, "\\]]")
          ];
          if (selectors.some(selector => !!componentDom.window.document.querySelector(selector))) {
            useModules.push(...ngModules.filter(item => item.exports.includes(ngComponent.name)));
          }
        }
      }

      const importInfos = useModules.map(item => {
        let module = item.module;
        if (!module) {
          module = path.relative(outDirPath, item.path).replace(/\\/g, "/");
          module = module.startsWith(".") ? module : "./" + module;
          module = module.replace(/\.d\.ts$/g, "").replace(/\.ts$/g, "");
        }

        return {
          name: item.name,
          module
        };
      }).distinct();

      for (const group of importInfos.orderBy(item => item.name).groupBy(item => item.module)) {
        if (group.values.length > 1) {
          content += `import {\n`;
          content += group.values.map(item => `  ${item.name}`).join(",\n") + "\n";
          content += `} from "${group.key}";\n`;
        }
        else {
          content += `import {${group.values[0].name}} from "${group.key}";\n`;
        }
      }

      content += `\n`;

      content += `@NgModule({\n`;
      content += `  imports: [\n`;
      content += `    CommonModule${importInfos.length > 0 ? "," : ""}\n`;
      if (importInfos.length > 0) {
        content += importInfos.orderBy(item => item.name).map(item => `    ${item.name}`).join(",\n") + "\n";
      }
      content += `  ],\n`;

      if (
        changedInfo.filePath.startsWith(this._modalsDirPath) ||
        changedInfo.filePath.startsWith(this._printTemplatesDirPath)
      ) {
        content += `  entryComponents: [${className}],\n`;
      }

      content += `  declarations: [${className}],\n`;
      content += `  exports: [${className}]\n`;
      content += `})\n`;
      content += `export class ${className}Module {\n`;
      content += `}\n`;

      if (fs.pathExistsSync(outFilePath)) {
        if (fs.readFileSync(outFilePath, "utf-8") !== content) {
          fs.mkdirsSync(outDirPath);
          fs.writeFileSync(outFilePath, content);
          return {filePath: outFilePath, type: "change"};
        }
      }
      else {
        fs.mkdirsSync(outDirPath);
        fs.writeFileSync(outFilePath, content);
        return {filePath: outFilePath, type: "add"};
      }
    }
  }

  private _generateRoutingModule(changeInfo: ITsFileChangeInfo): IFileChangeInfo[] {
    const className = path.basename(changeInfo.filePath, path.extname(changeInfo.filePath));
    const outDirPath = path.resolve(this._modulesDirPath, path.relative(this._builder.rootDirPath, path.dirname(changeInfo.filePath)));
    const outFilePath = path.resolve(outDirPath, className + "RoutingModule.ts");

    const result: IFileChangeInfo[] = [];

    if (changeInfo.type === "unlink") {
      if (fs.pathExistsSync(outFilePath)) {
        fs.removeSync(outFilePath);
        result.push({filePath: outFilePath, type: "unlink"});
      }
    }
    else {
      let pageId = className.replace(/Page$/, "");
      pageId = pageId[0].toLowerCase() + pageId.slice(1).replace(/[A-Z]/g, match => "-" + match.toLowerCase());

      let fileRelativeImportPath = path.relative(outDirPath, changeInfo.filePath);
      fileRelativeImportPath = fileRelativeImportPath.startsWith(".") ? fileRelativeImportPath : ("./" + fileRelativeImportPath);
      fileRelativeImportPath = fileRelativeImportPath.replace(/\\/g, "/").replace(/\.d\.ts$/g, "").replace(/\.ts$/g, "");

      let content = ``;
      content += `import {NgModule} from "@angular/core";\n`;
      content += `import {CommonModule} from "@angular/common";\n`;
      content += `import {RouterModule} from "@angular/router";\n`;
      content += `import {${className}Module} from "./${className}Module";\n`;
      content += `import {${className}} from "${fileRelativeImportPath}";\n`;

      content += `\n`;

      content += `@NgModule({\n`;
      content += `  imports: [\n`;
      content += `    CommonModule,\n`;
      content += `    ${className}Module,\n`;
      content += `    RouterModule.forChild([\n`;

      const subPageFilePaths = glob.sync(path.resolve(path.dirname(changeInfo.filePath), pageId, "*"));
      if (subPageFilePaths.length > 0) {
        content += `      {path: "", component: ${className}, children: [\n`;

        const addSubClassContent = (subPageFilePath: string, sub?: boolean) => {
          const subClassName = path.basename(subPageFilePath, path.extname(subPageFilePath));
          let subPageId = subClassName.replace(/Page$/, "");
          subPageId = subPageId[0].toLowerCase() + subPageId.slice(1).replace(/[A-Z]/g, match => "-" + match.toLowerCase());
          let subPageRelativeImportPath = path.relative(path.dirname(changeInfo.filePath), subPageFilePath);
          subPageRelativeImportPath = subPageRelativeImportPath.startsWith(".") ? subPageRelativeImportPath : ("./" + subPageRelativeImportPath)
            .replace(/\\/g, "/").replace(/\.d\.ts$/g, "").replace(/\.ts$/g, "");

          content += (sub ? "  " : "") + `        {path: "${subPageId}", loadChildren: "${subPageRelativeImportPath}RoutingModule#${subClassName}RoutingModule"},\n`;
        };

        for (const subPageFilePath of subPageFilePaths) {
          if (!fs.lstatSync(subPageFilePath).isDirectory()) {
            addSubClassContent(subPageFilePath);
          }
          else {
            const subPageId = path.basename(subPageFilePath);
            let subClassName = subPageId[0].toUpperCase() + subPageId.slice(1).replace(/-[a-z]/g, match => match.slice(1).toUpperCase());
            subClassName = subClassName + "Page";
            if (fs.pathExistsSync(path.resolve(path.dirname(subPageFilePath), subClassName + ".ts"))) {
              continue;
            }

            content += `        {path: "${subPageId}", children: [\n`;

            const subSubPageFilePaths = glob.sync(path.resolve(subPageFilePath, "*"));
            for (const subSubPageFilePath of subSubPageFilePaths) {
              addSubClassContent(subSubPageFilePath, true);
            }
            content = content.slice(0, -2) + "\n";

            content += `        ]},\n`;
          }
        }

        content = content.slice(0, -2) + "\n";

        content += `      ]}\n`;
      }
      else {
        content += `      {path: "", component: ${className}}\n`;
      }

      content += `    ])\n`;
      content += `  ]\n`;
      content += `})\n`;
      content += `export class ${className}RoutingModule {\n`;
      content += `}`;

      if (fs.pathExistsSync(outFilePath)) {
        if (fs.readFileSync(outFilePath, "utf-8") !== content) {
          fs.mkdirsSync(outDirPath);
          fs.writeFileSync(outFilePath, content);
          result.push({filePath: outFilePath, type: "change"});
        }
      }
      else {
        fs.mkdirsSync(outDirPath);
        fs.writeFileSync(outFilePath, content);
        result.push({filePath: outFilePath, type: "add"});
      }
    }

    const parentPageFilePaths: string[] = [];
    let parentDirPath = path.dirname(changeInfo.filePath);
    while (true) {
      const basename = path.basename(parentDirPath);
      parentDirPath = path.resolve(parentDirPath, "..");
      if (!parentDirPath.startsWith(this._pagesDirPath)) {
        break;
      }

      const parentPageFileName = basename[0].toUpperCase() + basename.slice(1).replace(/-[a-z]/g, match => match.slice(1).toUpperCase()) + "Page.ts";
      const parentPageFilePath = path.resolve(parentDirPath, parentPageFileName);
      if (fs.pathExistsSync(parentPageFilePath)) {
        parentPageFilePaths.push(parentPageFilePath);
      }
    }

    if (parentPageFilePaths.length > 0) {
      for (const parentPageFilePath of parentPageFilePaths) {
        result.push(
          ...this._generateRoutingModule({
            filePath: parentPageFilePath,
            type: "dependency"
          })
        );
      }
    }

    return result;
  }

  private _generateRootRoutes(): IFileChangeInfo | undefined {
    let content = ``;
    content += `export const routes = [\n`;

    const pageFilePaths = glob.sync(path.resolve(this._builder.rootDirPath, "pages", "*Page.ts"));

    for (const pageFilePath of pageFilePaths) {
      const className = path.basename(pageFilePath, path.extname(pageFilePath));
      let pageId = className.replace(/Page$/, "");
      pageId = pageId[0].toLowerCase() + pageId.slice(1).replace(/[A-Z]/g, match => "-" + match.toLowerCase());

      let relativeImportPath = path.relative(this._builder.rootDirPath, pageFilePath);
      relativeImportPath = ("./\_modules/" + relativeImportPath).replace(/\\/g, "/").replace(/\.d\.ts$/g, "").replace(/\.ts$/g, "");

      content += `  {path: "${pageId}", loadChildren: "${relativeImportPath}RoutingModule#${className}RoutingModule"},\n`;
    }

    content = content.slice(0, -2) + "\n";

    content += `];\n`;

    const outFilePath = path.resolve(this._builder.rootDirPath, "_routes.ts");

    if (fs.pathExistsSync(outFilePath)) {
      if (fs.readFileSync(outFilePath, "utf-8") !== content) {
        fs.mkdirsSync(path.dirname(outFilePath));
        fs.writeFileSync(outFilePath, content);
        return {filePath: outFilePath, type: "change"};
      }
    }
    else {
      fs.mkdirsSync(path.dirname(outFilePath));
      fs.writeFileSync(outFilePath, content);
      return {filePath: outFilePath, type: "add"};
    }
  }

  private _isRoutingModule(filePath: string): boolean {
    return filePath.startsWith(this._modulesDirPath) && filePath.endsWith("RoutingModule.ts");
  }
}
