import {FsUtil, Logger} from "@simplysm/sd-core-node";
import * as ts from "typescript";
import * as path from "path";
import * as os from "os";
import {ISdMetadataBundleNgModuleDef, SdBundleMetadata, SdObjectMetadata} from "../utils/SdMetadata";
import {isMetadataError, MetadataCollector} from "@angular/compiler-cli";
import {NotImplementError} from "@simplysm/sd-core-common";
import {SdTypescriptUtils} from "../utils/SdTypescriptUtils";
import {JSDOM} from "jsdom";
import * as tslint from "tslint";

export class SdTypescriptChecker {
  private readonly _packagePath: string;
  private readonly _srcPath: string;
  private readonly _distPath: string;
  private readonly _moduleDirSrcPath: string;
  private readonly _moduleDirDistPath: string;
  private readonly _routesFileSrcPath: string;
  private readonly _logger: Logger;

  private _program?: ts.Program;
  private readonly _diagnostics: ts.Diagnostic[] = [];
  private readonly _watchFiles: { eventKind: ts.FileWatcherEventKind; fileName: string }[] = [];
  private readonly _metadataBundle = new SdBundleMetadata();
  private readonly _genFileCache: { [fileName: string]: string } = {};

  public constructor(private readonly _tsconfigPath: string,
                     private readonly _isAngular: boolean,
                     private readonly _polyfills: string[],
                     private readonly _indexTsFilePath: string | undefined) {
    this._packagePath = path.dirname(this._tsconfigPath);
    const packageKey = path.basename(this._packagePath);

    const tsconfig = FsUtil.readJson(this._tsconfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, path.dirname(this._tsconfigPath));
    const isNode = parsedTsConfig.options.target !== ts.ScriptTarget.ES5;

    this._srcPath = parsedTsConfig.options.rootDir ? path.resolve(parsedTsConfig.options.rootDir) : path.resolve(this._packagePath, "src");
    this._distPath = parsedTsConfig.options.outDir ? path.resolve(parsedTsConfig.options.outDir) : path.resolve(this._packagePath, "dist");

    this._moduleDirSrcPath = path.resolve(this._srcPath, "_modules");
    this._moduleDirDistPath = path.resolve(this._distPath, "_modules");

    this._routesFileSrcPath = path.resolve(this._srcPath, "_routes.ts");

    this._logger = Logger.get(["simplysm", "sd-cli", packageKey, isNode ? "node" : "browser", "check"]);
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("타입체크 및 변경감지를 시작합니다.");

    const host = ts.createWatchCompilerHost(
      this._tsconfigPath,
      {},
      ts.sys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      (diag: ts.Diagnostic) => {
        this._diagnostics.push(diag);
      },
      (diagnostic) => {
        if (
          ts.flattenDiagnosticMessageText(diagnostic.messageText, os.EOL).startsWith("File change detected") &&
          this._watchFiles.length > 0
        ) {
          this._logger.log("타입체크에 대한 변경이 감지되었습니다.");
        }
      }
    );

    await new Promise<void>((resolve) => {
      let lastProcId = 0;
      const prevAfterProgramCreate = host.afterProgramCreate;
      host.afterProgramCreate = async (builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram) => {
        const procId = lastProcId + 1;
        lastProcId = procId;

        this._program = builderProgram.getProgram();

        if (prevAfterProgramCreate) {
          prevAfterProgramCreate(builderProgram);
        }

        if (this._watchFiles.length <= 0) {
          return;
        }
        const watchFileInfos = this._watchFiles
          .distinct()
          .map((item) => this._getWatchFileInfo(item));
        this._watchFiles.clear();

        //--------------------------------------------
        // 타입체크 결과 구성
        //--------------------------------------------

        const messages = this._diagnostics.map((diagnostic) => SdTypescriptUtils.getDiagnosticMessage(diagnostic));
        this._diagnostics.clear();

        const warnings = messages.filter((item) => item.severity === "warning")
          .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

        const errors = messages.filter((item) => item.severity === "error")
          .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

        const errorWatchFileInfos = watchFileInfos.filter((item) =>
          messages.some((item1) =>
            item1.severity === "warning" || item1.severity === "error" &&
            item1.file &&
            path.resolve(item1.file) === path.resolve(item.watchFile.fileName)
          )
        );
        this._watchFiles.push(...errorWatchFileInfos.map((item) => item.watchFile));

        //--------------------------------------------
        // LINT 수행
        //--------------------------------------------

        // TSLINT 메시지 구성
        if (watchFileInfos.length > 0) {
          const lintFailures = await this._lintAsync(watchFileInfos);
          for (const lintFailure of lintFailures) {
            const file = lintFailure.getFileName();
            const lineAndCharacter = lintFailure.getStartPosition().getLineAndCharacter();
            const line = lineAndCharacter.line;
            const char = lineAndCharacter.character;
            const severity = lintFailure.getRuleSeverity();
            const messageText = lintFailure.getFailure();
            const rule = lintFailure.getRuleName();

            const text = `${file}(${line}, ${char}): ${rule}: ${severity} ${messageText}`;

            if (severity === "warning") {
              warnings.push(text);
            }
            else {
              errors.push(text);

              const lintErrorWatchFileInfos = watchFileInfos.filter((item) =>
                path.resolve(item.watchFile.fileName) === path.resolve(file)
              );
              this._watchFiles.push(...lintErrorWatchFileInfos.map((item) => item.watchFile));
            }
          }
        }

        //--------------------------------------------
        // ANGULAR 모듈 등 생성
        //--------------------------------------------

        if (this._isAngular) {
          // 메타데이터 정보 업데이트
          for (const watchFileInfo of watchFileInfos) {
            if (watchFileInfo.isDeleted || !watchFileInfo.isTypescriptFile) {
              this._metadataBundle.unregister(watchFileInfo.metadataFilePath);
              continue;
            }

            // 신규 패키지 파일인 경우 메타데이터 파일 생성
            if (watchFileInfo.isPackageFile) {
              const result = await this._generateMetadataFileAsync(watchFileInfo);
              if (result.warnings.length > 0 || result.errors.length > 0) {
                warnings.push(...result.warnings);
                errors.push(...result.errors);

                this._watchFiles.push(watchFileInfo.watchFile);
              }
            }

            if (FsUtil.exists(watchFileInfo.metadataFilePath)) {
              await this._metadataBundle.registerAsync(watchFileInfo.metadataFilePath, watchFileInfo.isGeneratedFile);
            }
          }

          // 메타데이터로 NgModule 정의 가져오기
          const ngModuleDefs = this._metadataBundle.ngModuleDefs;

          // 신규 NgModule, NgRoutingModule 파일 생성
          const moduleFilePaths: string[] = [];
          for (const ngModuleDef of ngModuleDefs) {
            if (ngModuleDef.moduleName || !ngModuleDef.isForGeneratedFile) continue;
            const ngModuleName = ngModuleDef.className;

            const importObj: { [requirePath: string]: string[] } = {
              "@angular/core": ["NgModule"]
            };

            // NgModule
            const ngModuleDeclarations: string[] = [];
            const ngModuleExports: string[] = [];
            const ngModuleEntryComponents: string[] = [];
            const ngModuleImports: string[] = [];
            for (const exportClass of ngModuleDef.exports) {
              if (!exportClass.name) throw new NotImplementError();

              const exportClassSourceFilePath = path.resolve(
                this._srcPath,
                path.relative(
                  this._distPath,
                  exportClass.moduleMetadata.filePath.replace(/\.metadata\.json$/, ".ts")
                )
              );
              if (!exportClass.decorators) throw new NotImplementError();
              for (const decorator of exportClass.decorators) {
                if (decorator.expression.module === "@angular/core" && decorator.expression.name === "Component") {
                  ngModuleExports.push(exportClass.name);
                  ngModuleDeclarations.push(exportClass.name);
                  if (exportClass.name.endsWith("PrintTemplate") || exportClass.name.endsWith("Modal")) {
                    ngModuleEntryComponents.push(exportClass.name);
                  }
                }
                else if (decorator.expression.module === "@angular/core" && decorator.expression.name === "Directive") {
                  ngModuleExports.push(exportClass.name);
                  ngModuleDeclarations.push(exportClass.name);
                }
                else if (decorator.expression.module === "@angular/core" && decorator.expression.name === "Pipe") {
                  ngModuleExports.push(exportClass.name);
                  ngModuleDeclarations.push(exportClass.name);
                }
                else {
                  // IGNORE
                  // throw new NotImplementError();
                }
              }

              const relativePath = path.relative(this._moduleDirSrcPath, exportClassSourceFilePath)
                .replace(/\\/g, "/")
                .replace(/\.ts$/, "");
              importObj[relativePath] = importObj[relativePath] ?? [];
              if (!importObj[relativePath].includes(exportClass.name)) {
                importObj[relativePath].push(exportClass.name);
              }

              const exportClassSourceFile = this._program.getSourceFile(exportClassSourceFilePath);
              if (!exportClassSourceFile) throw new NotImplementError();

              const exportClassImportNodes = exportClassSourceFile["imports"];
              if (exportClassImportNodes && exportClassImportNodes instanceof Array) {
                for (const exportClassImportNode of exportClassImportNodes) {
                  if (exportClassImportNode.text === "tslib") continue;

                  const importModuleName = exportClassImportNode.text;
                  const importClassNames = exportClassImportNode.parent.importClause?.namedBindings?.elements?.map((item: any) => item.name.text);
                  if (!importClassNames) continue;


                  const needModuleDefs = ngModuleDefs.filter((moduleDef) =>
                    moduleDef.exports.some((exp) =>
                      (
                        (exp.moduleMetadata.name === undefined && importModuleName.startsWith(".")) ||
                        (exp.moduleMetadata.name === importModuleName)
                      ) &&
                      importClassNames.includes(exp.name)
                    )
                  );

                  for (const needModuleDef of needModuleDefs) {
                    const realModuleImportObj = this._getRealModuleImportObj(needModuleDef);

                    ngModuleImports.push(realModuleImportObj.targetName);

                    const requirePath = realModuleImportObj.requirePath;
                    importObj[requirePath] = importObj[requirePath] ?? [];
                    if (!importObj[requirePath].includes(realModuleImportObj.targetName)) {
                      importObj[requirePath].push(realModuleImportObj.targetName);
                    }
                  }
                }
              }
              else {
                throw new NotImplementError();
              }

              const componentDec = Array.from(exportClass.decorators).single((dec) => dec.expression.module === "@angular/core" && dec.expression.name === "Component");
              if (componentDec) {
                if (!componentDec.arguments || !componentDec.arguments[0] || !(componentDec.arguments[0] instanceof SdObjectMetadata)) throw new NotImplementError();
                const arg = componentDec.arguments[0] as SdObjectMetadata;
                const templateText = arg.getChildString("template");
                if (templateText) {
                  const templateDOM = new JSDOM(templateText);

                  const needModuleDefs = ngModuleDefs.filter((item) =>
                    item.exports.some((exp) =>
                      exp.decorators &&
                      exp.decorators.some((dec) =>
                        dec.expression.module === "@angular/core" &&
                        dec.expression.name === "Component" &&
                        dec.arguments &&
                        dec.arguments[0] &&
                        dec.arguments[0] instanceof SdObjectMetadata &&
                        dec.arguments[0].getChildString("selector") &&
                        templateDOM.window.document.querySelector(dec.arguments[0].getChildString("selector")!)
                      )
                    )
                  );

                  for (const needModuleDef of needModuleDefs) {
                    const realModuleImportObj = this._getRealModuleImportObj(needModuleDef);

                    ngModuleImports.push(realModuleImportObj.targetName);

                    const requirePath = realModuleImportObj.requirePath;
                    importObj[requirePath] = importObj[requirePath] ?? [];
                    if (!importObj[requirePath].includes(needModuleDef.className)) {
                      importObj[requirePath].push(needModuleDef.className);
                    }
                  }
                }
              }
            }

            if (ngModuleDeclarations.length > 0) {
              const importText = Object.keys(importObj)
                .map((key) => `import {${importObj[key].join(", ")}} from "${key}";`);
              const ngModuleContent = `
${importText.join("\n")}

@NgModule({
  imports: [${ngModuleImports.length > 0 ? "\n    " + ngModuleImports.join(",\n    ") + "\n  " : ""}],
  declarations: [${ngModuleDeclarations.length > 0 ? "\n    " + ngModuleDeclarations.join(",\n    ") + "\n  " : ""}],
  exports: [${ngModuleExports.length > 0 ? "\n    " + ngModuleExports.join(",\n    ") + "\n  " : ""}],
  entryComponents: [${ngModuleEntryComponents.length > 0 ? "\n    " + ngModuleEntryComponents.join(",\n    ") + "\n  " : ""}]
})
export class ${ngModuleName} {
}`.trim();

              const distPath = path.resolve(this._moduleDirSrcPath, ngModuleName + ".ts");
              if (this._genFileCache[distPath] !== ngModuleContent) {
                this._genFileCache[distPath] = ngModuleContent;
                await FsUtil.writeFileAsync(distPath, ngModuleContent);
              }

              moduleFilePaths.push(distPath);
            }
            else {
              const distPath = path.resolve(this._moduleDirSrcPath, ngModuleName + ".ts");
              await FsUtil.removeAsync(distPath);
              delete this._genFileCache[distPath];
            }
          }

          // 삭제된 모듈 지우기
          const moduleDirFileNames = await FsUtil.readdirAsync(this._moduleDirSrcPath);
          for (const moduleDirFileName of moduleDirFileNames) {
            const moduleDirFilePath = path.resolve(this._moduleDirSrcPath, moduleDirFileName);
            if (!moduleFilePaths.includes(path.resolve(this._moduleDirSrcPath, moduleDirFileName))) {
              await FsUtil.removeAsync(moduleDirFilePath);
              delete this._genFileCache[moduleDirFilePath];
            }
          }

          // TODO: NgRoutingModule

          // TODO: 신규 _routes 파일 생성
        }

        //--------------------------------------------
        // INDEX 파일 생성
        //--------------------------------------------

        if (this._indexTsFilePath) {
          await this._generateIndexTsFileAsync();
        }

        //--------------------------------------------
        // 마무리
        //--------------------------------------------

        // 메시지 출력
        if (procId !== lastProcId) return;

        if (warnings.length > 0) {
          this._logger.warn("타입체크 경고\n", warnings.join("\n").trim());
        }

        if (errors.length > 0) {
          this._logger.error("타입체크 오류\n", errors.join("\n").trim());
        }

        this._logger.log("타입체크가 완료되었습니다.");
        resolve();
      };

      const prevWatchFile = host.watchFile;
      host.watchFile = (filePath: string, callback: ts.FileWatcherCallback, pollingInterval?: number): ts.FileWatcher => {
        if (FsUtil.exists(filePath)) {
          this._watchFiles.push({eventKind: ts.FileWatcherEventKind.Created, fileName: filePath});
        }

        return prevWatchFile(
          filePath,
          (fileName, eventKind) => {
            if (!path.relative(this._distPath, filePath).startsWith("..")) {
              return;
            }

            this._watchFiles.push({eventKind, fileName});

            callback(fileName, eventKind);
          },
          pollingInterval
        );
      };

      ts.createWatchProgram(host);
    });
  }

  public async runAsync(): Promise<void> {

  }

  private _getWatchFileInfo(watchFile: { eventKind: ts.FileWatcherEventKind; fileName: string }): IWatchFileInfo {
    const isTypescriptFile = !!watchFile.fileName.match(/\.ts$/);
    const isDeleted = watchFile.eventKind === ts.FileWatcherEventKind.Deleted || !FsUtil.exists(watchFile.fileName);
    const isPackageFile = !path.relative(this._srcPath, watchFile.fileName).includes("..");

    let metadataFilePath: string;
    if (isPackageFile) {
      const metadataFileRelativePath = path.relative(this._srcPath, watchFile.fileName.replace(/\.ts$/, ".metadata.json"));
      metadataFilePath = path.resolve(this._distPath, metadataFileRelativePath);
    }
    else {
      metadataFilePath = watchFile.fileName.replace(/(\.d)?\.(ts|js)$/, ".metadata.json");
    }

    const isGeneratedFile = !path.relative(this._moduleDirSrcPath, watchFile.fileName).includes("..")
      || path.resolve(watchFile.fileName) === this._routesFileSrcPath;

    return {
      watchFile,
      isTypescriptFile,
      isPackageFile,
      isDeleted,
      isGeneratedFile,
      metadataFilePath
    };
  }

  private async _generateMetadataFileAsync(watchFileInfo: IWatchFileInfo): Promise<{ warnings: string[]; errors: string[] }> {
    if (!this._program) throw new NotImplementError();

    const diagnostics: ts.Diagnostic[] = [];

    if (watchFileInfo.isTypescriptFile && watchFileInfo.isPackageFile && !watchFileInfo.isDeleted) {
      const sourceFile = this._program.getSourceFile(watchFileInfo.watchFile.fileName);
      if (!sourceFile) throw new NotImplementError();

      const metadata = new MetadataCollector().getMetadata(
        sourceFile,
        true,
        (value, tsNode) => {
          if (isMetadataError(value)) {
            diagnostics.push({
              file: sourceFile,
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

      if (metadata) {
        await FsUtil.writeFileAsync(watchFileInfo.metadataFilePath, JSON.stringify(metadata));
      }
      else {
        await FsUtil.removeAsync(watchFileInfo.metadataFilePath);
      }
    }

    const messages = diagnostics
      .map((item) => SdTypescriptUtils.getDiagnosticMessage(item));

    return {
      warnings: messages.filter((item) => item.severity === "warning")
        .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item)),
      errors: messages.filter((item) => item.severity === "error")
        .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item))
    };
  }

  private async _generateIndexTsFileAsync(): Promise<void> {
    if (!this._indexTsFilePath) throw new NotImplementError();

    const importTexts: string[] = [];
    if (this._polyfills) {
      for (const polyfill of this._polyfills) {
        importTexts.push(`import "${polyfill}";`);
      }
    }

    const srcTsFiles = await FsUtil.globAsync(path.resolve(this._srcPath, "**", "*.ts"));
    for (const srcTsFile of srcTsFiles) {
      if (path.resolve(srcTsFile) === this._indexTsFilePath) {
        continue;
      }

      const relativePath = path.relative(this._srcPath, srcTsFile);
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
    if (this._genFileCache[this._indexTsFilePath] !== content) {
      this._genFileCache[this._indexTsFilePath] = content;
      await FsUtil.writeFileAsync(this._indexTsFilePath, content);
    }
  }

  private _getRealModuleImportObj(moduleDef: ISdMetadataBundleNgModuleDef): { requirePath: string; targetName: string } {
    let requirePath = moduleDef.moduleName ? moduleDef.moduleName
      : moduleDef.filePath ? path.relative(this._moduleDirDistPath, moduleDef.filePath)
          .replace(/\.metadata\.json$/, "")
          .replace(/\\/g, "/")
        : "./" + moduleDef.className;

    let targetName = moduleDef.className;

    if (requirePath === "@angular/platform-browser" && targetName === "BrowserModule") {
      requirePath = "@angular/common";
      targetName = "CommonModule";
    }

    return {requirePath, targetName};
  }

  private async _lintAsync(watchFileInfo: IWatchFileInfo[]): Promise<tslint.RuleFailure[]> {
    const lintConfigPath = path.resolve(this._packagePath, "tslint.json");
    const config = tslint.Configuration.findConfiguration(lintConfigPath).results;
    if (!config) {
      throw new Error("'" + lintConfigPath + "'파일을 찾을 수 없습니다.");
    }

    const linter = new tslint.Linter({formatter: "json", fix: false}, this._program);

    const lintFileInfos = watchFileInfo
      .filter((item) =>
        !item.isDeleted &&
        item.isTypescriptFile &&
        !item.watchFile.fileName.endsWith(".d.ts")
      )
      .distinct();
    for (const lintFileInfo of lintFileInfos) {
      linter.lint(lintFileInfo.watchFile.fileName, await FsUtil.readFileAsync(lintFileInfo.watchFile.fileName), config);
    }

    return linter.getResult().failures;
  }
}

interface IWatchFileInfo {
  watchFile: { eventKind: ts.FileWatcherEventKind; fileName: string };
  isTypescriptFile: boolean;
  isPackageFile: boolean;
  isDeleted: boolean;
  isGeneratedFile: boolean;
  metadataFilePath: string;
}