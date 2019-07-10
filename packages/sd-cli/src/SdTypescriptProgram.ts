import * as ts from "typescript";
import * as fs from "fs-extra";
import * as path from "path";
import * as glob from "glob";
import * as os from "os";
import * as tslint from "tslint";
import {FileChangeInfoType, FileWatcher, IFileChangeInfo, optional} from "@simplysm/sd-core";
import {ClassMetadata, MetadataCollector, MetadataEntry, ModuleMetadata} from "@angular/compiler-cli";
import {JSDOM} from "jsdom";
import {SdAngularUtils} from "./commons/SdAngularUtils";

export class SdTypescriptProgram {
  private readonly _fileInfoMap = new Map<string, {
    version: number;
    invalid: boolean;
    sourceFile: ts.SourceFile;
    text: string;
    embeddedDependencies: string[];
    output: {
      transpile: {
        js: string;
        map: string;
        messages: string[];
        invalid: boolean;
      };
      emitDeclaration: {
        declaration: string;
        invalid: boolean;
      };
      lint: {
        messages: string[];
        invalid: boolean;
      };
      emitMetadata: {
        metadata: string;
        messages: string[];
        invalid: boolean;
      };
      emitNgModule: {
        ngModule: string;
        messages: string[];
        invalid: boolean;
      };
      emitNgRoutingModule: {
        ngRoutingModule: string;
        messages: string[];
        invalid: boolean;
      };
      getDependencies: {
        dependencies: string[];
        invalid: boolean;
      };
      getImports: {
        imports: { require: string; targets: string[] }[];
      };
      getMetadata: {
        metadata: ModuleMetadata | undefined;
        messages: string[];
        invalid: boolean;
      };
      getNgModuleInfos: {
        ngModuleInfos: ISdNgModuleInfo[];
        messages: string[];
        invalid: boolean;
      };
      getNgComponentOrDirectiveInfos: {
        ngComponentOrDirectiveInfos: ISdNgComponentOrDirectiveInfo[];
        messages: string[];
        invalid: boolean;
      };
    };
    syncVersions: {
      getSourceFile: number;
      transpile: number;
      emitDeclaration: number;
      lint: number;
      emitMetadata: number;
      emitNgModule: number;
      emitNgRoutingModule: number;
      getImports: number;
      getMetadata: number;
      getDependencies: number;
      getNgModuleInfos: number;
      getNgComponentOrDirectiveInfos: number;
    };
  }>();

  private _compilerOptions!: ts.CompilerOptions;

  public rootDirPath!: string;
  public outDirPath!: string;

  private _host!: ts.CompilerHost;
  private _program!: ts.Program;

  public constructor(private readonly _tsConfigFilePath: string,
                     private readonly _options: { replaceScssToCss?: boolean }) {
    this._reloadCompilerOptions();
    this._reloadCompilerHost();
    this.reloadProgram();
  }

  public async watch(callback: (changeInfos: IFileChangeInfo[]) => void, options: { withBeImportedFiles?: boolean; millisecond?: number }): Promise<void> {
    // Watch 경로 설정
    let watchPaths = [path.resolve(this.rootDirPath, "**", "*.ts")];

    if (this._options.replaceScssToCss) {
      watchPaths.push(...Array.from(this._fileInfoMap.entries()).mapMany(entry => entry[1].embeddedDependencies));
    }

    if (options.withBeImportedFiles) {
      watchPaths.push(...this._getMyTypescriptFiles().mapMany(item => this._getDependencies(item)));
    }

    const watcher = await FileWatcher.watch(watchPaths.distinct(), ["add", "change", "unlink"], fileChangeInfos => {
      const reloadedFileChangeInfos = this.applyChanges(fileChangeInfos, {withBeImportedFiles: options.withBeImportedFiles});

      // 콜백수행 (사용자 코드 수행)
      callback(reloadedFileChangeInfos);

      // Watch 경로 재설정
      watcher.unwatch(watchPaths);

      watchPaths = [path.resolve(this.rootDirPath, "**", "*.ts")];
      if (this._options.replaceScssToCss) {
        watchPaths.push(...Array.from(this._fileInfoMap.entries()).mapMany(entry => entry[1].embeddedDependencies));
      }

      if (options.withBeImportedFiles) {
        watchPaths.push(...this._getMyTypescriptFiles().mapMany(item => this._getDependencies(item)));
      }

      watcher.add(watchPaths.distinct());
    }, options.millisecond);
  }

  public applyChanges(fileChangeInfos: IFileChangeInfo[], options: { withBeImportedFiles?: boolean }): IFileChangeInfo[] {
    const myTypescriptFiles = this._getMyTypescriptFiles();
    const fileInfoEntries = Array.from(this._fileInfoMap.entries());

    // 내 소스만 포함
    let reloadedFileChangeInfos = fileChangeInfos.filter(item => myTypescriptFiles.includes(item.filePath));

    if (this._options.replaceScssToCss) {
      // 임베디드파일의 임베드한 소스들 추가 포함
      if (reloadedFileChangeInfos.length !== fileChangeInfos.length) {
        for (const fileChangeInfo of fileChangeInfos.filter(item => !myTypescriptFiles.includes(item.filePath))) {
          const embeddingFileInfoEntries = fileInfoEntries.filter(entry => entry[1].embeddedDependencies.includes(fileChangeInfo.filePath));
          const embeddingFilePaths = embeddingFileInfoEntries.map(entry => entry[0]);
          for (const embeddingFilePath of embeddingFilePaths) {
            if (reloadedFileChangeInfos.some(item => item.filePath === embeddingFilePath)) {
              continue;
            }

            reloadedFileChangeInfos.push({
              filePath: embeddingFilePath,
              type: "change"
            });
          }
        }
      }
    }
    else {
      // 모든변경파일 포함
      reloadedFileChangeInfos = fileChangeInfos;
    }

    // 변경된 파일을 사용(import)하고있는 내 소스 파일들을 모두 추가 포함
    if (options.withBeImportedFiles) {
      for (const fileChangeInfo of fileChangeInfos) {
        const beImportedFileInfoEntries = fileInfoEntries.filter(entry => this._getDependencies(entry[0]).includes(fileChangeInfo.filePath));

        const beImportedFilePaths = beImportedFileInfoEntries.map(entry => entry[0]);
        for (const beImportedFilePath of beImportedFilePaths) {
          if (reloadedFileChangeInfos.some(item => item.filePath === beImportedFilePath)) {
            continue;
          }

          reloadedFileChangeInfos.push({
            filePath: beImportedFilePath,
            type: "change"
          });
        }
      }
    }

    // 변경파일은 아니지만, 이전에 오류났던 소스들 추가 포함
    reloadedFileChangeInfos.push(
      ...fileInfoEntries
        .filter(entry => !reloadedFileChangeInfos.some(item => item.filePath === entry[0]))
        .filter(entry =>
          entry[1].invalid ||
          entry[1].output.transpile.invalid ||
          entry[1].output.emitDeclaration.invalid ||
          entry[1].output.lint.invalid ||
          entry[1].output.emitMetadata.invalid
        )
        .map(entry => ({
          filePath: entry[0],
          type: "change" as FileChangeInfoType
        }))
    );

    // 파일정보 맵의 버전정보 변경
    for (const reloadedFileChangeInfo of reloadedFileChangeInfos) {
      if (reloadedFileChangeInfo.type === "unlink") {
        this._fileInfoMap.delete(reloadedFileChangeInfo.filePath);
      }
      else if (this._fileInfoMap.has(reloadedFileChangeInfo.filePath)) {
        this._fileInfoMap.get(reloadedFileChangeInfo.filePath)!.version++;
      }
    }

    // 프로그램 다시 로드
    this.reloadProgram();

    return reloadedFileChangeInfos;
  }

  public transpile(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const result: string[] = [];
    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));

      const relativePath = path.relative(this.rootDirPath, filePath);
      const outJsFilePath = path.resolve(this.outDirPath, relativePath).replace(/\.ts$/, ".js");
      const outMapFilePath = outJsFilePath + ".map";

      if (!fileInfo) {
        fs.removeSync(outJsFilePath);
        fs.removeSync(outMapFilePath);
        continue;
      }

      if (fileInfo.syncVersions.transpile !== fileInfo.version) {
        const transpileResult = ts.transpileModule(fileInfo.text, {
          fileName: filePath,
          compilerOptions: this._compilerOptions,
          reportDiagnostics: false
        });

        if (!transpileResult.outputText) {
          fs.removeSync(outJsFilePath);
          fileInfo.output.transpile.js = "";
        }
        else if (transpileResult.outputText !== fileInfo.output.transpile.js) {
          this._writeFile(outJsFilePath, transpileResult.outputText);
          fileInfo.output.transpile.js = transpileResult.outputText;
        }

        if (!transpileResult.sourceMapText) {
          fs.removeSync(outMapFilePath);
          fileInfo.output.transpile.map = "";
        }
        else if (transpileResult.sourceMapText && transpileResult.sourceMapText !== fileInfo.output.transpile.map) {
          this._writeFile(outMapFilePath, transpileResult.sourceMapText);
          fileInfo.output.transpile.map = transpileResult.sourceMapText;
        }

        fileInfo.output.transpile.messages = transpileResult.diagnostics
          ? this._diagnosticsToMessages(transpileResult.diagnostics)
          : [];

        fileInfo.syncVersions.transpile = fileInfo.version;
      }

      fileInfo.output.transpile.invalid = fileInfo.output.transpile.messages.length > 0;
      result.push(...fileInfo.output.transpile.messages);
    }

    return result.distinct();
  }

  public emitDeclaration(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const result: string[] = [];
    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));

      const relativePath = path.relative(this.rootDirPath, filePath);
      const outFilePath = path.resolve(this.outDirPath, relativePath).replace(/\.ts$/, ".d.ts");

      if (!fileInfo) {
        fs.removeSync(outFilePath);
        continue;
      }

      if (!this._compilerOptions.declaration || fileInfo.syncVersions.emitDeclaration === fileInfo.version) {
        // NOTE: 파일이 변경되지 않았더라도, 타입체크는 해야함. (다른 파일의 변경에 따른 오류발생 가능성이 있음)
        result.push(...this._diagnosticsToMessages(
          this._program.getSemanticDiagnostics(fileInfo.sourceFile).concat(this._program.getSyntacticDiagnostics(fileInfo.sourceFile))
        ));
      }
      else {
        const preEmitDiagnostics = ts.getPreEmitDiagnostics(this._program, fileInfo.sourceFile);

        let declarationText = "";
        const emitResult = this._program.emit(
          fileInfo.sourceFile,
          (emitFilePath, data) => {
            declarationText = data;
          },
          undefined,
          true
        );

        if (emitResult.emitSkipped) {
          fs.removeSync(outFilePath);
          fileInfo.output.emitDeclaration.declaration = "";
        }
        else if (fileInfo.output.emitDeclaration.declaration !== declarationText) {
          this._writeFile(outFilePath, declarationText);
          fileInfo.output.emitDeclaration.declaration = declarationText;
        }

        fileInfo.syncVersions.emitDeclaration = fileInfo.version;

        const messages = this._diagnosticsToMessages(preEmitDiagnostics.concat(emitResult.diagnostics));
        fileInfo.output.emitDeclaration.invalid = messages.length > 0;
        result.push(...messages);
      }
    }
    return result.distinct();
  }

  public lint(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const lintConfigPath = path.resolve(path.dirname(this._tsConfigFilePath), "tslint.json");
    const config = tslint.Configuration.findConfiguration(path.resolve(path.dirname(this._tsConfigFilePath), "tslint.json")).results;
    if (!config) {
      throw new Error("'" + lintConfigPath + "'파일을 찾을 수 없습니다.");
    }

    const linter = new tslint.Linter({formatter: "json", fix: false}, this._program);

    const result: string[] = [];
    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));
      if (!fileInfo) {
        continue;
      }

      if (fileInfo.syncVersions.lint !== fileInfo.version) {
        linter.lint(filePath, fileInfo.text, config);
      }
    }

    const failures = linter.getResult().failures;

    const failureDiagnostics = failures.map(item => ({
      file: optional(() => this._fileInfoMap.get(path.normalize(item.getFileName()))!.sourceFile),
      start: item.getStartPosition().getPosition(),
      messageText: item.getFailure(),
      category: ts.DiagnosticCategory.Warning,
      code: 0,
      length: undefined,
      rule: item.getRuleName()
    }));

    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));
      if (!fileInfo) {
        continue;
      }

      if (fileInfo.syncVersions.lint !== fileInfo.version) {
        fileInfo.output.lint.messages = this._diagnosticsToMessages(
          failureDiagnostics.filter(item => item.file && path.normalize(item.file.fileName) === path.normalize(filePath))
        );

        fileInfo.syncVersions.lint = fileInfo.version;

        fileInfo.output.lint.invalid = fileInfo.output.lint.messages.length > 0;
      }

      result.push(...fileInfo.output.lint.messages);
    }

    return result.distinct();
  }

  public emitMetadata(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const result: string[] = [];
    for (const filePath of filePaths.distinct()) {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));

      const relativePath = path.relative(this.rootDirPath, filePath);
      const outFilePath = path.resolve(this.outDirPath, relativePath).replace(/\.ts$/, ".metadata.json");

      if (!fileInfo) {
        fs.removeSync(outFilePath);
        continue;
      }

      if (fileInfo.syncVersions.emitMetadata !== fileInfo.version) {
        const metadataInfo = this._getMetadata(filePath);
        if (!metadataInfo.metadata || metadataInfo.messages.length > 0) {
          fs.removeSync(outFilePath);
          fileInfo.output.emitMetadata.metadata = "";
        }
        else {
          const metadataJsonString = JSON.stringify(metadataInfo.metadata);

          if (fileInfo.output.emitMetadata.metadata !== metadataJsonString) {
            this._writeFile(outFilePath, metadataJsonString);
            fileInfo.output.emitMetadata.metadata = metadataJsonString;
          }
        }

        fileInfo.output.emitMetadata.messages = metadataInfo.messages;
        fileInfo.syncVersions.emitMetadata = fileInfo.version;
        fileInfo.output.emitMetadata.invalid = fileInfo.output.emitMetadata.messages.length > 0;
      }

      result.push(...fileInfo.output.emitMetadata.messages);
    }

    return result.distinct();
  }

  public emitNgModule(filePaths: string[] = this._getMyTypescriptFiles()): { changedModuleFilePaths: string[]; messages: string[] } {
    const pagesDirPath = path.resolve(this.rootDirPath, "pages");
    const modalsDirPath = path.resolve(this.rootDirPath, "modals");
    const printTemplatesDirPath = path.resolve(this.rootDirPath, "print-templates");
    const controlsDirPath = path.resolve(this.rootDirPath, "controls");
    const modulesDirPath = path.resolve(this.rootDirPath, "_modules");

    const validFilePaths = filePaths.filter(item =>
      item.startsWith(pagesDirPath) ||
      item.startsWith(modalsDirPath) ||
      item.startsWith(printTemplatesDirPath) ||
      item.startsWith(controlsDirPath)
    );

    if (validFilePaths.length < 1) {
      return {
        changedModuleFilePaths: [],
        messages: []
      };
    }

    const result: string[] = [];

    const getAllNgModuleInfoMapResult = this._getAllNgModuleInfoMap();
    const ngModuleInfoMap = getAllNgModuleInfoMapResult.infoMap;
    const ngModules: (ISdNgModuleInfo & { filePath: string })[] = Array.from(ngModuleInfoMap.entries()).mapMany(entry => entry[1].map(item => ({filePath: entry[0], ...item})));
    result.push(...getAllNgModuleInfoMapResult.messages);

    const getAllNgComponentOrDirectiveInfoMapResult = this._getAllNgComponentOrDirectiveInfoMap();
    const ngComponentOrDirectiveInfoMap = getAllNgComponentOrDirectiveInfoMapResult.infoMap;
    const components: (ISdNgComponentOrDirectiveInfo & { filePath: string })[] = Array.from(ngComponentOrDirectiveInfoMap.entries()).mapMany(entry => entry[1].map(item => ({filePath: entry[0], ...item})));
    result.push(...getAllNgModuleInfoMapResult.messages);

    const changeModuleFilePaths: string[] = [];
    for (const filePath of validFilePaths) {
      try {
        const className = path.basename(filePath, path.extname(filePath));
        const relativeDirPath = path.relative(this.rootDirPath, path.dirname(filePath));
        const outDirPath = path.resolve(modulesDirPath, relativeDirPath);
        const outFilePath = path.resolve(outDirPath, className + "Module.ts");

        const fileInfo = this._fileInfoMap.get(path.normalize(filePath));
        if (!fileInfo) {
          fs.removeSync(outFilePath);
          continue;
        }

        if (fileInfo.syncVersions.emitNgModule !== fileInfo.version) {
          const messages: string[] = [];

          let content = ``;
          content += `import {NgModule} from "@angular/core";\n`;
          content += `import {CommonModule} from "@angular/common";\n`;

          let fileRelativePath = path.relative(outDirPath, filePath);
          fileRelativePath = fileRelativePath.startsWith(".") ? fileRelativePath : ("./" + fileRelativePath);
          content += `import {${className}} from "${fileRelativePath.replace(/\\/g, "/").replace(/\.d\.ts$/g, "").replace(/\.ts$/g, "")}";\n`;

          const useModules: (ISdNgModuleInfo & { filePath: string })[] = [];

          // 현재 코드에서 'import'한 모든것들을 읽고, 해당 'import'파일들을 'export'하는 모든 모듈을 사용모듈로 등록
          const imports = this._getImports(filePath);
          for (const imp of imports) {
            useModules.push(
              ...ngModules.filter(item => (!item.packageName || item.packageName === imp.require) && item.exports.some(item1 => imp.targets.includes(item1)))
            );
          }

          // 현재 코드의 'template'에 있는 모든컨트롤들에 해당하는 컴포넌트나 디렉티브 파일들을 확인하고, 해당 컴포넌트등의 파일을 'export'하는 모든 모듈을 사용모듈로 등록
          const componentTemplateDOM = ngComponentOrDirectiveInfoMap.get(filePath)!.single(item => item.className === className)!.templateDOM;
          if (componentTemplateDOM) {
            for (const component of components.filter(item => !!item.selector)) {
              const selectors = [
                component.selector,
                component.selector.replace(/\[/g, "[\\[").replace(/]/g, "\\]]")
              ];
              if (selectors.some(selector => !!componentTemplateDOM.window.document.querySelector(selector))) {
                useModules.push(...ngModules.filter(item => (!item.packageName || item.packageName === component.packageName) && item.exports.includes(component.className)));
              }
            }
          }

          // 사용모듈의 'import' 경로 정리
          const importInfos = useModules.map(item => {
            let requireText = item.packageName;
            if (!requireText) {
              requireText = path.relative(outDirPath, item.filePath).replace(/\\/g, "/");
              requireText = requireText.startsWith(".") ? requireText : "./" + requireText;
              requireText = requireText.replace(/\.d\.ts$/g, "").replace(/\.ts$/g, "");
            }

            return {
              className: item.className,
              requireText
            };
          }).distinct();

          // 사용모듈들 'import'
          for (const group of importInfos.orderBy(item => item.className).groupBy(item => item.requireText)) {
            if (group.values.length > 1) {
              content += `import {\n`;
              content += group.values.map(item => `  ${item.className}`).join(",\n") + "\n";
              content += `} from "${group.key}";\n`;
            }
            else {
              content += `import {${group.values[0].className}} from "${group.key}";\n`;
            }
          }

          content += `\n`;

          // 사용모듈들 'NgModule'에 'import'
          content += `@NgModule({\n`;
          content += `  imports: [\n`;
          content += `    CommonModule${importInfos.length > 0 ? "," : ""}\n`;
          if (importInfos.length > 0) {
            content += importInfos.orderBy(item => item.className).map(item => `    ${item.className}`).join(",\n") + "\n";
          }
          content += `  ],\n`;

          if (
            filePath.startsWith(modalsDirPath) ||
            filePath.startsWith(printTemplatesDirPath)
          ) {
            content += `  entryComponents: [${className}],\n`;
          }

          content += `  declarations: [${className}],\n`;
          content += `  exports: [${className}]\n`;
          content += `})\n`;
          content += `export class ${className}Module {\n`;
          content += `}\n`;

          // 파일쓰기
          if (fileInfo.output.emitNgModule.ngModule !== content) {
            changeModuleFilePaths.push(outFilePath);
            this._writeFile(outFilePath, content);
            fileInfo.output.emitNgModule.ngModule = content;
          }

          fileInfo.output.emitNgModule.messages = messages;
          fileInfo.syncVersions.emitNgModule = fileInfo.version;
          fileInfo.output.emitNgModule.invalid = fileInfo.output.emitNgModule.messages.length > 0;
        }

        result.push(...fileInfo.output.emitNgModule.messages);
      }
      catch (err) {
        err.message = "[SdTypescriptProgram.emitNgModule] " + filePath + "\n==> " + err.message;
        throw err;
      }
    }

    if (changeModuleFilePaths.length > 0) {
      const myNgFiles = Array.from(this._fileInfoMap.keys()).filter(item =>
        item.startsWith(pagesDirPath) ||
        item.startsWith(modalsDirPath) ||
        item.startsWith(printTemplatesDirPath) ||
        item.startsWith(controlsDirPath)
      );

      for (const filePath of myNgFiles) {
        this._fileInfoMap.get(filePath)!.syncVersions.getDependencies--;
        this._fileInfoMap.get(filePath)!.syncVersions.getImports--;
        this._fileInfoMap.get(filePath)!.syncVersions.emitNgModule--;
      }

      const currResult = this.emitNgModule();
      changeModuleFilePaths.push(...currResult.changedModuleFilePaths);
      result.push(...currResult.messages);
    }

    return {
      changedModuleFilePaths: changeModuleFilePaths.distinct(),
      messages: result.distinct()
    };
  }

  public emitNgRoutingModule(filePaths: string[] = this._getMyTypescriptFiles()): { changedRoutingModuleFilePaths: string[]; messages: string[] } {
    const pagesDirPath = path.resolve(this.rootDirPath, "pages");
    const modulesDirPath = path.resolve(this.rootDirPath, "_modules");

    const validFilePaths = filePaths.filter(item => item.startsWith(pagesDirPath));
    if (validFilePaths.length < 1) {
      return {
        changedRoutingModuleFilePaths: [],
        messages: []
      };
    }

    const result: string[] = [];

    const changedRoutingModuleFilePaths: string[] = [];
    for (const filePath of validFilePaths) {
      try {
        const className = path.basename(filePath, path.extname(filePath));
        const relativeDirPath = path.relative(this.rootDirPath, path.dirname(filePath));
        const outDirPath = path.resolve(modulesDirPath, relativeDirPath);
        const outFilePath = path.resolve(outDirPath, className + "RoutingModule.ts");

        const fileInfo = this._fileInfoMap.get(path.normalize(filePath));
        if (!fileInfo) {
          fs.removeSync(outFilePath);
          continue;
        }

        if (fileInfo.syncVersions.emitNgRoutingModule !== fileInfo.version) {
          const messages: string[] = [];

          let pageId = className.replace(/Page$/, "");
          pageId = pageId[0].toLowerCase() + pageId.slice(1).replace(/[A-Z]/g, match => "-" + match.toLowerCase());

          let fileRelativeImportPath = path.relative(outDirPath, filePath);
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

          const subPageFilePaths = glob.sync(path.resolve(path.dirname(filePath), pageId, "*"));

          if (subPageFilePaths.length > 0) {
            content += `      {path: "", component: ${className}, children: [\n`;

            const addSubClassContent = (subPageFilePath: string, sub?: boolean) => {
              const subClassName = path.basename(subPageFilePath, path.extname(subPageFilePath));
              let subPageId = subClassName.replace(/Page$/, "");
              subPageId = subPageId[0].toLowerCase() + subPageId.slice(1).replace(/[A-Z]/g, match => "-" + match.toLowerCase());
              let subPageRelativeImportPath = path.relative(path.dirname(filePath), subPageFilePath);
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

          // 파일쓰기
          if (fileInfo.output.emitNgRoutingModule.ngRoutingModule !== content) {
            changedRoutingModuleFilePaths.push(outFilePath);
            this._writeFile(outFilePath, content);
            fileInfo.output.emitNgRoutingModule.ngRoutingModule = content;
          }

          fileInfo.output.emitNgRoutingModule.messages = messages;
          fileInfo.syncVersions.emitNgRoutingModule = fileInfo.version;
          fileInfo.output.emitNgRoutingModule.invalid = fileInfo.output.emitNgRoutingModule.messages.length > 0;
        }

        result.push(...fileInfo.output.emitNgRoutingModule.messages);
      }
      catch (err) {
        err.message = "[SdTypescriptProgram.emitNgRoutingModule] " + filePath + "\n==> " + err.message;
        throw err;
      }
    }

    if (changedRoutingModuleFilePaths.length > 0) {
      const parentPageFilePaths: string[] = [];
      const changedFilePaths = changedRoutingModuleFilePaths.map(item => path.resolve(this.rootDirPath, path.relative(modulesDirPath, item)).replace(/RoutingModule\.ts$/, ".ts"));
      for (const changedFilePath of changedFilePaths) {
        let parentDirPath = path.dirname(changedFilePath);

        while (true) {
          const basename = path.basename(parentDirPath);
          parentDirPath = path.resolve(parentDirPath, "..");
          if (!parentDirPath.startsWith(pagesDirPath)) {
            break;
          }

          const parentPageFileName = basename[0].toUpperCase() + basename.slice(1).replace(/-[a-z]/g, match => match.slice(1).toUpperCase()) + "Page.ts";
          const parentPageFilePath = path.resolve(parentDirPath, parentPageFileName);
          if (validFilePaths.includes(parentPageFilePath)) {
            break;
          }

          if (fs.pathExistsSync(parentPageFilePath)) {
            parentPageFilePaths.push(parentPageFilePath);
          }
        }
      }

      if (parentPageFilePaths.length > 0) {
        for (const filePath of parentPageFilePaths) {
          this._fileInfoMap.get(filePath)!.syncVersions.emitNgRoutingModule--;
        }

        const newResult = this.emitNgRoutingModule(parentPageFilePaths);
        changedRoutingModuleFilePaths.push(...newResult.changedRoutingModuleFilePaths);
        result.push(...newResult.messages);
      }
    }

    return {
      changedRoutingModuleFilePaths: changedRoutingModuleFilePaths.distinct(),
      messages: result.distinct()
    };
  }

  public emitRoutesRoot(filePaths: string[] = this._getMyTypescriptFiles()): string[] {
    const pagesDirPath = path.resolve(this.rootDirPath, "pages");

    if (!filePaths.some(item => item.startsWith(pagesDirPath))) {
      return [];
    }

    let content = ``;
    content += `export const routes = [\n`;

    const pageFilePaths = glob.sync(path.resolve(pagesDirPath, "*Page.ts"));

    for (const pageFilePath of pageFilePaths) {
      const className = path.basename(pageFilePath, path.extname(pageFilePath));
      let pageId = className.replace(/Page$/, "");
      pageId = pageId[0].toLowerCase() + pageId.slice(1).replace(/[A-Z]/g, match => "-" + match.toLowerCase());

      let relativeImportPath = path.relative(this.rootDirPath, pageFilePath);
      relativeImportPath = ("./\_modules/" + relativeImportPath).replace(/\\/g, "/").replace(/\.d\.ts$/g, "").replace(/\.ts$/g, "");

      content += `  {path: "${pageId}", loadChildren: "${relativeImportPath}RoutingModule#${className}RoutingModule"},\n`;
    }

    content = content.slice(0, -2) + "\n";

    content += `];\n`;

    const outFilePath = path.resolve(this.rootDirPath, "_routes.ts");

    this._writeFile(outFilePath, content);
    return [];
  }

  private _getMetadata(filePath: string): { metadata: ModuleMetadata | undefined; messages: string[] } {
    try {
      const fileInfo = this._fileInfoMap.get(path.normalize(filePath));
      if (!fileInfo) {
        return {
          metadata: undefined,
          messages: []
        };
      }

      if (fileInfo.syncVersions.getMetadata !== fileInfo.version) {
        if (filePath.endsWith(".d.ts") || filePath.endsWith(".js")) {
          const metadataFilePath = filePath.replace(/\.d\.ts$/, ".metadata.json");
          if (fs.pathExistsSync(metadataFilePath)) {
            const metadata = fs.readJsonSync(metadataFilePath);

            fileInfo.output.getMetadata.metadata = metadata instanceof Array ? metadata[0] : metadata;
            fileInfo.output.getMetadata.messages = [];
            fileInfo.output.getMetadata.invalid = false;
          }
          else {
            fileInfo.output.getMetadata.metadata = undefined;
            fileInfo.output.getMetadata.messages = [];
            fileInfo.output.getMetadata.invalid = false;
          }

          fileInfo.syncVersions.getMetadata = fileInfo.version;
        }
        else {
          const diagnostics: ts.Diagnostic[] = [];

          const metadata = new MetadataCollector().getMetadata(
            fileInfo.sourceFile,
            false,
            (value, tsNode) => {
              if (value && value["__symbolic"] && value["__symbolic"] === "error") {
                diagnostics.push({
                  file: fileInfo.sourceFile,
                  start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
                  messageText: value["message"],
                  category: ts.DiagnosticCategory.Error,
                  code: 0,
                  length: undefined
                });
              }

              return value;
            }
          );

          if (diagnostics.length > 0) {
            fileInfo.output.getMetadata.metadata = undefined;
          }
          else {
            fileInfo.output.getMetadata.metadata = metadata;
          }

          fileInfo.output.getMetadata.messages = this._diagnosticsToMessages(diagnostics);
          fileInfo.syncVersions.getMetadata = fileInfo.version;
          fileInfo.output.getMetadata.invalid = fileInfo.output.getMetadata.messages.length > 0;
        }
      }

      return {
        metadata: fileInfo.output.getMetadata.metadata,
        messages: fileInfo.output.getMetadata.messages
      };
    }
    catch (err) {
      err.message = "[SdTypescriptProgram._getMetadata] " + filePath + "\n==> " + err.message;
      throw err;
    }
  }

  private _getAllNgModuleInfoMap(): { infoMap: Map<string, ISdNgModuleInfo[]>; messages: string[] } {
    const messages: string[] = [];

    const infoMap = Array.from(this._fileInfoMap.keys()).toMap(key => key, key => {
      const result = this._getNgModuleInfos(key);
      messages.push(...result.messages);
      return result.infos;
    });

    return {infoMap, messages};
  }

  private _getAllNgComponentOrDirectiveInfoMap(): { infoMap: Map<string, ISdNgComponentOrDirectiveInfo[]>; messages: string[] } {
    const messages: string[] = [];

    const infoMap = Array.from(this._fileInfoMap.keys()).toMap(key => key, key => {
      const result = this._getNgComponentOrDirectiveInfos(key);
      messages.push(...result.messages);
      return result.infos;
    });

    return {infoMap, messages};
  }

  private _getNgModuleInfos(filePath: string): { infos: ISdNgModuleInfo[]; messages: string[] } {
    try {
      const fileInfo = this._fileInfoMap.get(filePath);
      if (!fileInfo) {
        return {
          infos: [],
          messages: []
        };
      }

      if (fileInfo.syncVersions.getNgModuleInfos !== fileInfo.version) {
        const messages: string[] = [];

        const metadataInfo = this._getMetadata(filePath);
        if (!metadataInfo.metadata || metadataInfo.messages.length > 0) {
          messages.push(...metadataInfo.messages);
          fileInfo.output.getNgModuleInfos.ngModuleInfos = [];
        }
        else {
          const findNgModuleClassMetadataListResult = this._findClassMetadataListByDecorator(metadataInfo.metadata, "@angular/core", ["NgModule"]);

          fileInfo.output.getNgModuleInfos.ngModuleInfos = findNgModuleClassMetadataListResult.map(info => {
            const decorator = this._findDecorator(info.metadata, "@angular/core", "NgModule");

            const exports: string[] = (optional(() => decorator.arguments[0].exports) || []).map((item: any) => item.name);

            const providerProperties: any | any[] = optional(() => decorator.arguments[0].providers) || [];
            let providers: string[] = ((providerProperties instanceof Array) ? providerProperties : [providerProperties])
              .map((item: any) => optional(() => item.name || item.expression.name))
              .filterExists();

            if (info.metadata.statics) {
              providers.push(
                ...Object.keys(info.metadata.statics)
                  .mapMany(key =>
                    ((optional(() => (info.metadata.statics![key] as any).value.providers) as any[]) || [])
                      .map((item: any) => optional(() => item.name || item.expression.name))
                      .filterExists()
                  )
              );
            }

            providers = providers.mapMany(item => this._getMetadataReferenceTarget(metadataInfo.metadata!, item));

            return {
              packageName: this._getPackageName(filePath),
              className: info.className,
              exports: exports.distinct(),
              providers: providers.distinct()
            };
          });
        }

        fileInfo.output.getNgModuleInfos.messages = messages;
        fileInfo.syncVersions.getNgModuleInfos = fileInfo.version;
        fileInfo.output.getNgModuleInfos.invalid = fileInfo.output.getNgModuleInfos.messages.length > 0;
      }

      return {
        infos: fileInfo.output.getNgModuleInfos.ngModuleInfos,
        messages: fileInfo.output.getNgModuleInfos.messages
      };
    }
    catch (err) {
      err.message = "[SdTypescriptProgram._getNgModuleInfos] " + filePath + "\n==> " + err.message;
      throw err;
    }
  }

  private _getNgComponentOrDirectiveInfos(filePath: string): { infos: ISdNgComponentOrDirectiveInfo[]; messages: string[] } {
    try {
      const fileInfo = this._fileInfoMap.get(filePath);
      if (!fileInfo) {
        return {
          infos: [],
          messages: []
        };
      }

      if (fileInfo.syncVersions.getNgComponentOrDirectiveInfos !== fileInfo.version) {
        const messages: string[] = [];

        const metadataInfo = this._getMetadata(filePath);
        if (!metadataInfo.metadata || metadataInfo.messages.length > 0) {
          messages.push(...metadataInfo.messages);
          fileInfo.output.getNgComponentOrDirectiveInfos.ngComponentOrDirectiveInfos = [];
        }
        else {
          const findNgComponentOrDirectiveClassMetadataListResult = this._findClassMetadataListByDecorator(metadataInfo.metadata, "@angular/core", ["Component", "Directive"]);

          fileInfo.output.getNgComponentOrDirectiveInfos.ngComponentOrDirectiveInfos = findNgComponentOrDirectiveClassMetadataListResult.map(info => {
            const decorator = this._findDecorator(info.metadata, "@angular/core", "Component") || this._findDecorator(info.metadata, "@angular/core", "Directive");

            return {
              packageName: this._getPackageName(filePath),
              className: info.className,
              selector: decorator.arguments[0].selector,
              template: decorator.arguments[0].template,
              templateDOM: decorator.arguments[0].template ? new JSDOM(decorator.arguments[0].template) : undefined
            };
          });
        }

        fileInfo.output.getNgComponentOrDirectiveInfos.messages = messages;
        fileInfo.syncVersions.getNgComponentOrDirectiveInfos = fileInfo.version;
        fileInfo.output.getNgComponentOrDirectiveInfos.invalid = fileInfo.output.getNgComponentOrDirectiveInfos.messages.length > 0;
      }

      return {
        infos: fileInfo.output.getNgComponentOrDirectiveInfos.ngComponentOrDirectiveInfos,
        messages: fileInfo.output.getNgComponentOrDirectiveInfos.messages
      };
    }
    catch (err) {
      err.message = "[SdTypescriptProgram._getNgComponentOrDirectiveInfos] " + filePath + "\n==> " + err.message;
      throw err;
    }
  }

  private _getDependencies(filePath: string): string[] {
    const result: string[] = [];
    let invalid = false;

    const doing = (currFilePath: string) => {
      const currFileInfo = this._fileInfoMap.get(currFilePath);
      if (!currFileInfo || !currFileInfo.sourceFile["imports"]) {
        return [];
      }

      if (currFileInfo.syncVersions.getDependencies !== currFileInfo.version) {
        const checker = this._program.getTypeChecker();

        for (const importNode of currFileInfo.sourceFile["imports"]) {
          const symbol = checker.getSymbolAtLocation(importNode);

          if (!symbol || !symbol.declarations) {
            continue;
          }

          for (const decl of symbol.declarations) {
            let node = decl as ts.Node;
            while (node && node.kind !== ts.SyntaxKind.SourceFile) {
              node = node.parent;
            }

            if (!node) {
              console.error(new Error(`'${symbol.name}'소스파일를 찾을 수 없습니다.`));
              invalid = true;
            }
            else {
              const beImportedFilePath = path.normalize((node as ts.SourceFile).fileName);

              if (!result.includes(beImportedFilePath) && beImportedFilePath !== filePath) {
                result.push(beImportedFilePath);
                doing(beImportedFilePath);
              }
            }
          }
        }
      }
      else {
        result.push(...currFileInfo.output.getDependencies.dependencies);
      }
    };

    const fileInfo = this._fileInfoMap.get(filePath);
    if (!fileInfo) {
      return [];
    }

    if (fileInfo.syncVersions.getDependencies !== fileInfo.version) {
      doing(filePath);

      fileInfo.output.getDependencies.dependencies = result.distinct();
      fileInfo.syncVersions.getDependencies = fileInfo.version;
      fileInfo.output.getDependencies.invalid = invalid;
    }

    return fileInfo.output.getDependencies.dependencies;
  }

  private _getImports(filePath: string): { require: string; targets: string[] }[] {
    const fileInfo = this._fileInfoMap.get(path.normalize(filePath));
    if (!fileInfo) {
      return [];
    }

    if (fileInfo.syncVersions.getImports !== fileInfo.version) {
      fileInfo.output.getImports.imports = this._getSourceNodes(fileInfo.sourceFile)
        .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)
        .map(node => ({
          require: ((node as ts.ImportDeclaration).moduleSpecifier as ts.StringLiteral).text,
          targets: optional(() =>
            ((node as ts.ImportDeclaration).importClause!.namedBindings! as ts.NamedImports).elements
              .map(item => item.propertyName ? item.propertyName.text : item.name.text)
          )
        }))
        .filter(item => item.require && item.targets) as { require: string; targets: string[] }[];

      fileInfo.syncVersions.getImports = fileInfo.version;
    }

    return fileInfo.output.getImports.imports;
  }

  private _getSourceNodes(sourceFile: ts.SourceFile): ts.Node[] {
    const nodes: ts.Node[] = [sourceFile];
    const result = [];

    while (nodes.length > 0) {
      const node = nodes.shift();

      if (node) {
        result.push(node);
        if (node.getChildCount(sourceFile) >= 0) {
          nodes.unshift(...node.getChildren());
        }
      }
    }

    return result;
  }

  private _findClassMetadataListByDecorator(metadata: ModuleMetadata, packageName: string, decoratorNames: string[]): { className: string; metadata: ClassMetadata }[] {
    const metadataObj = metadata.metadata as { [key: string]: ClassMetadata };

    return Object.keys(metadataObj)
      .filter(key =>
        optional(() =>
          metadataObj[key].decorators!.some((item: any) => item.expression.module === packageName && decoratorNames.includes(item.expression.name))
        ) || false
      )
      .map(key => ({
        className: key,
        metadata: metadataObj[key]
      }));
  }

  private _findDecorator(classMetadata: ClassMetadata, packageName: string, decoratorName: string): any | undefined {
    const result = optional(() => classMetadata.decorators!.single((item: any) => item.expression.module === packageName && decoratorName === item.expression.name));
    if (!result || result.__symbolic === "error") {
      return undefined;
    }

    return result;
  }

  private _getMetadataReferenceTarget(metadata: ModuleMetadata, metadataName: string): string[] {
    if (!metadataName.startsWith("ɵ")) {
      return [];
    }

    const newRefs = (metadata.metadata[metadataName] instanceof Array ? (metadata.metadata[metadataName] as MetadataEntry[]) : [metadata.metadata[metadataName]])
      .map((item: any) => optional(() => item.name || item.expression.name))
      .filterExists();

    const result: string[] = [metadataName];

    result.push(...newRefs);
    for (const newRef of newRefs) {
      result.push(...this._getMetadataReferenceTarget(metadata, newRef));
    }

    return result.distinct();
  }

  private _getPackageName(filePath: string): string | undefined {
    const nodeModulesDirPath = path.resolve(process.cwd(), "node_modules");

    if (path.normalize(filePath).startsWith(nodeModulesDirPath)) {
      const relativePath = path.relative(nodeModulesDirPath, filePath).replace(/\\/g, "/");
      return relativePath.split("/")[0].includes("@")
        ? relativePath.split("/")[0] + "/" + relativePath.split("/")[1]
        : relativePath.split("/")[0];
    }

    return undefined;
  }

  private _diagnosticsToMessages(diagnostics: ts.Diagnostic[]): string[] {
    const result: string[] = [];

    for (const diagnostic of diagnostics) {
      let message = "";
      if (diagnostic.file) {
        message += diagnostic.file.fileName;

        if (diagnostic.start) {
          const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          message += `(${position.line + 1},${position.character + 1})`;
        }

        message += ": ";
      }

      message += diagnostic.category.toString().toLowerCase() + ": ";

      message += ts.flattenDiagnosticMessageText(diagnostic.messageText, os.EOL);

      if (diagnostic["rule"]) {
        message += `(${diagnostic["rule"]})`;
      }


      result.push(message);
    }

    return result.distinct();
  }

  private _reloadCompilerOptions(): void {
    if (!fs.pathExistsSync(this._tsConfigFilePath)) {
      throw new Error("'" + this._tsConfigFilePath + "'파일을 찾을 수 없습니다.");
    }

    const tsConfigContents = fs.readFileSync(this._tsConfigFilePath, "utf-8");

    const tsConfig = JSON.parse(tsConfigContents);
    const contextPath = path.dirname(this._tsConfigFilePath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, contextPath);
    this._compilerOptions = parsedTsConfig.options;
    this.rootDirPath = parsedTsConfig.options.rootDir || path.resolve(contextPath, "src");
    this.outDirPath = parsedTsConfig.options.outDir || path.resolve(contextPath, "dist");
  }

  private _reloadCompilerHost(): void {
    this._host = ts.createCompilerHost(this._compilerOptions);

    this._host.getSourceFile = (filePath, languageVersion) => {
      let fileInfo = this._fileInfoMap.get(path.normalize(filePath));

      if (!fileInfo || fileInfo.version !== fileInfo.syncVersions.getSourceFile || fileInfo.invalid) {
        let content = this._host.readFile(filePath);
        if (!content) {
          return undefined;
        }

        let invalid = false;
        let embeddedDependencies: string[] = [];
        if (this._options.replaceScssToCss) {
          if (filePath.endsWith("\.ts") && !filePath.endsWith("\.d\.ts")) {
            try {
              const converted = SdAngularUtils.replaceScssToCss(filePath, content);
              content = converted.content;
              embeddedDependencies = converted.dependencies.map(item => path.normalize(item));
            }
            catch (err) {
              console.error(err);
              invalid = true;
            }
          }
        }

        const sourceFile = ts.createSourceFile(filePath, content, languageVersion, true);

        // 첫 생성된 파일일때
        if (!fileInfo) {
          fileInfo = {
            version: 1,
            invalid,
            text: content,
            sourceFile,
            embeddedDependencies,
            output: {
              transpile: {
                js: "",
                map: "",
                messages: [],
                invalid: false
              },
              emitDeclaration: {
                declaration: "",
                invalid: false
              },
              lint: {
                messages: [],
                invalid: false
              },
              emitMetadata: {
                metadata: "",
                messages: [],
                invalid: false
              },
              emitNgModule: {
                ngModule: "",
                messages: [],
                invalid: false
              },
              emitNgRoutingModule: {
                ngRoutingModule: "",
                messages: [],
                invalid: false
              },
              getDependencies: {
                dependencies: [],
                invalid: false
              },
              getMetadata: {
                metadata: undefined,
                messages: [],
                invalid: false
              },
              getImports: {
                imports: []
              },
              getNgModuleInfos: {
                ngModuleInfos: [],
                messages: [],
                invalid: false
              },
              getNgComponentOrDirectiveInfos: {
                ngComponentOrDirectiveInfos: [],
                messages: [],
                invalid: false
              }
            },
            syncVersions: {
              getSourceFile: 1,
              transpile: 0,
              emitDeclaration: 0,
              lint: 0,
              emitMetadata: 0,
              emitNgModule: 0,
              emitNgRoutingModule: 0,
              getDependencies: 0,
              getImports: 0,
              getMetadata: 0,
              getNgModuleInfos: 0,
              getNgComponentOrDirectiveInfos: 0
            }
          };

          this._fileInfoMap.set(path.normalize(filePath), fileInfo);
        }
        // 현재파일과 버전이 다를때
        else {
          fileInfo.invalid = invalid;
          fileInfo.text = content;
          fileInfo.sourceFile = sourceFile;
          fileInfo.embeddedDependencies = embeddedDependencies;
          fileInfo.syncVersions.getSourceFile = fileInfo.version;
        }
      }

      return fileInfo.sourceFile;
    };
  }

  public reloadProgram(): void {
    const myTypescriptFiles = this._getMyTypescriptFiles();
    this._program = ts.createProgram(
      myTypescriptFiles,
      this._compilerOptions,
      this._host,
      this._program
    );
  }

  private _getMyTypescriptFiles(): string[] {
    return glob.sync(path.resolve(this.rootDirPath, "**", "*.ts")).map(item => path.normalize(item));
  }

  private _writeFile(filePath: string, content: string): void {
    fs.mkdirsSync(path.dirname(filePath));
    fs.writeFileSync(filePath, content, {encoding: "utf-8"});
  }
}

interface ISdNgModuleInfo {
  packageName: string | undefined;
  className: string;
  exports: string[];
  providers: string[];
}

interface ISdNgComponentOrDirectiveInfo {
  packageName: string | undefined;
  className: string;
  selector: string;
  template: string | undefined;
  templateDOM: JSDOM | undefined;
}
