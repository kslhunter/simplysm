import * as ts from "typescript";
import * as os from "os";
import {FsUtil, Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import {NotImplementError, ObjectUtil} from "@simplysm/sd-core-common";
import {isMetadataError, MetadataCollector} from "@angular/compiler-cli";
import {SdTypescriptUtils} from "../utils/SdTypescriptUtils";
import {SdBundleMetadata} from "../utils/SdMetadata";

export class SdAngularModuleGenerator {
  private _program?: ts.Program;
  private _checker?: ts.TypeChecker;

  public constructor(private readonly _tsConfigPath: string,
                     private readonly _packagePath: string,
                     private readonly _srcPath: string,
                     private readonly _distPath: string,
                     private readonly _logger: Logger) {
  }

  public static async createAsync(tsConfigPath: string): Promise<SdAngularModuleGenerator> {
    const packagePath = path.dirname(tsConfigPath);
    const packageKey = path.basename(packagePath);

    const tsConfig = await FsUtil.readJsonAsync(tsConfigPath);
    tsConfig.compilerOptions.rootDir = tsConfig.compilerOptions.rootDir || "src";
    tsConfig.compilerOptions.outDir = tsConfig.compilerOptions.outDir || "dist";

    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(tsConfigPath));
    const srcPath = path.resolve(parsedTsConfig.options.rootDir!);
    const distPath = path.resolve(parsedTsConfig.options.outDir!);

    const logger = Logger.get(["simplysm", "sd-cli", packageKey, "ng-module-generator"]);

    return new SdAngularModuleGenerator(
      tsConfigPath,
      packagePath,
      srcPath,
      distPath,
      logger
    );
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("ANGULAR 모듈 생성 및 변경감지를 시작합니다.");

    await FsUtil.removeAsync(path.resolve(this._srcPath, "_modules"));

    const watchFiles: { eventKind: ts.FileWatcherEventKind; fileName: string }[] = [];

    const metadataBundle = new SdBundleMetadata();
    const fileCache: { [filePath: string]: string } = {};

    const host = ts.createWatchCompilerHost(
      this._tsConfigPath,
      {},
      {
        ...ts.sys,
        writeFile(filePath: string, data: string, writeByteOrderMark?: boolean): void {
        },
        createDirectory: (dirPath: string) => {
        }
      },
      ts.createSemanticDiagnosticsBuilderProgram,
      (diag: ts.Diagnostic) => {
      },
      (diagnostic) => {
        if (
          ts.flattenDiagnosticMessageText(diagnostic.messageText, os.EOL).startsWith("File change detected") &&
          watchFiles.length > 0
        ) {
          this._logger.log("ANGULAR 모듈 생성에 대한 변경이 감지되었습니다.");
        }
      }
    );

    await new Promise<void>((resolve) => {
      const prevAfterProgramCreate = host.afterProgramCreate;
      host.afterProgramCreate = async (program: ts.EmitAndSemanticDiagnosticsBuilderProgram) => {
        this._program = program.getProgram();
        this._checker = this._program.getTypeChecker();

        if (prevAfterProgramCreate) {
          prevAfterProgramCreate(program);
        }

        if (watchFiles.length <= 0) {
          return;
        }

        const watchFilesClone = ObjectUtil.clone(watchFiles);
        watchFiles.clear();

        const warningTextArr: string[] = [];
        const errorTextArr: string[] = [];

        try {
          // 1. 변경사항 메타데이터 정보 업데이트
          for (const watchFile of watchFilesClone) {
            const isLibraryFile = path.relative(this._srcPath, watchFile.fileName).includes("..");

            let metadataFilePath: string;
            if (isLibraryFile) {
              metadataFilePath = watchFile.fileName.replace(/(\.d)?\.(ts|js)$/, ".metadata.json");
            }
            else {
              const metadataFileRelativePath = path.relative(this._srcPath, watchFile.fileName.replace(/\.ts$/, ".metadata.json"));
              metadataFilePath = path.resolve(this._distPath, metadataFileRelativePath);
            }

            if (
              watchFile.eventKind === ts.FileWatcherEventKind.Deleted ||
              !FsUtil.exists(watchFile.fileName)
            ) {
              metadataBundle.unregister(metadataFilePath);
              continue;
            }

            const isSourceFile = watchFile.fileName.match(/\.(ts|js)$/);
            if (!isSourceFile) {
              metadataBundle.unregister(metadataFilePath);
              continue;
            }

            if (isLibraryFile) {
              if (!FsUtil.exists(metadataFilePath)) {
                metadataBundle.unregister(metadataFilePath);
                continue;
              }

              await metadataBundle.registerAsync(metadataFilePath);
            }
            else {
              const sourceFile = this._program.getSourceFile(watchFile.fileName);
              if (!sourceFile) {
                throw new NotImplementError();
              }

              const diagnostics = await this._generateMetadataFileAsync(sourceFile, metadataFilePath);
              const messages = diagnostics.map((diagnostic) => SdTypescriptUtils.getDiagnosticMessage(diagnostic));
              if (messages.some((item) => ["warning", "error"].includes(item.severity))) {
                warningTextArr.push(
                  ...messages.filter((item) => item.severity === "warning")
                    .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item))
                );
                errorTextArr.push(
                  ...messages.filter((item) => item.severity === "error")
                    .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item))
                );

                if (!watchFiles.includes(watchFile)) {
                  watchFiles.push(watchFile);
                }
              }
              else {
                await metadataBundle.registerAsync(metadataFilePath);
              }
            }
          }

          // 2. 라이브러리/패키지 정보에 따라, 내 패키지 변경사항에 따른 모듈의 imports 구성 및 파일쓰기
          const ngModuleDefs = metadataBundle.ngModuleDefs;

          const pkgNgModuleDefs = ngModuleDefs.filter((item) => item.moduleName === undefined);
          for (const pkgNgModuleDef of pkgNgModuleDefs) {
            const pkgNgModuleClassName = pkgNgModuleDef.className;

            // IMPORTS
            const importObj: { [requirePath: string]: string[] } = {
              "@angular/core": ["NgModule"]
            };

            // NgModule IMPORTS
            const ngModuleClassNames: string[] = [];
            for (const exportClass of pkgNgModuleDef.exports) {
              const exportClassSourceFilePath = path.resolve(
                this._srcPath,
                path.relative(
                  this._distPath,
                  exportClass.moduleMetadata.filePath.replace(/\.metadata\.json$/, ".ts")
                )
              );
              const exportClassSourceFile = this._program.getSourceFile(exportClassSourceFilePath);
              if (!exportClassSourceFile) throw new NotImplementError();

              const exportClassImportNodes = exportClassSourceFile["imports"];
              if (exportClassImportNodes && exportClassImportNodes instanceof Array) {
                for (const exportClassImportNode of exportClassImportNodes) {
                  if (exportClassImportNode.text === "tslib") continue;

                  const importModuleName = exportClassImportNode.text;
                  const importClassNames = exportClassImportNode.parent.importClause?.namedBindings?.elements?.map((item: any) => item.name.text);
                  if (!importClassNames) continue;

                  const needModuleDefs = ngModuleDefs.filter((item) =>
                    item.exports.some((item1) =>
                      (
                        (item1.moduleMetadata.name === undefined && importModuleName.startsWith(".")) ||
                        (item1.moduleMetadata.name === importModuleName)
                      ) &&
                      importClassNames.includes(item1.name)
                    )
                  );

                  for (const needModuleDef of needModuleDefs) {
                    ngModuleClassNames.push(needModuleDef.className);

                    const requirePath = needModuleDef.moduleName ?? "./" + needModuleDef.className;
                    importObj[requirePath] = importObj[requirePath] || [];
                    importObj[requirePath].push(needModuleDef.className);
                  }
                }
              }
              else {
                throw new NotImplementError();
              }
            }

            const importText = Object.keys(importObj).map((key) => `import {${importObj[key].join(", ")}} from \"${key}\";`);
            const ngModuleContent = `
${importText.join("\n")}

@NgModule({
  imports: [${ngModuleClassNames ? "\n    " + ngModuleClassNames.join(",\n    ") + "\n  " : ""}],
})
export class ${pkgNgModuleClassName} {
}`.trim();

            const distPath = path.resolve(this._srcPath, "_modules", pkgNgModuleClassName + ".ts");
            if (fileCache[distPath] !== ngModuleContent) {
              fileCache[distPath] = ngModuleContent;
              await FsUtil.writeFileAsync(distPath, ngModuleContent);
            }
          }
        }
        catch (err) {
          errorTextArr.push(err.stack);
        }


        // 메시지 출력
        if (warningTextArr.length > 0) {
          this._logger.warn("ANGULAR 모듈 생성 경고\n", warningTextArr.join("\n").trim());
        }

        if (errorTextArr.length > 0) {
          this._logger.error("ANGULAR 모듈 생성 오류\n", errorTextArr.join("\n").trim());
        }

        this._logger.log("ANGULAR 모듈 생성이 완료되었습니다.");
        resolve();
      };

      const prevWatchFile = host.watchFile;
      host.watchFile = (filePath: string, callback: ts.FileWatcherCallback, pollingInterval?: number): ts.FileWatcher => {
        if (FsUtil.exists(filePath)) {
          watchFiles.push({eventKind: ts.FileWatcherEventKind.Created, fileName: filePath});
        }

        return prevWatchFile(
          filePath,
          (fileName, eventKind) => {
            const outDir = this._program?.getCompilerOptions().outDir ?? path.resolve(this._packagePath, "dist");
            if (!this._program || !path.relative(outDir, filePath).startsWith("..")) {
              return;
            }

            watchFiles.push({eventKind, fileName});

            callback(fileName, eventKind);
          },
          pollingInterval
        );
      };

      ts.createWatchProgram(host);
    });
  }

  public async runAsync(): Promise<void> {
    throw new NotImplementError();
  }

  private async _generateMetadataFileAsync(sourceFile: ts.SourceFile, outFilePath: string): Promise<ts.Diagnostic[]> {
    const diagnostics: ts.Diagnostic[] = [];

    if (path.resolve(sourceFile.fileName).startsWith(this._srcPath)) {
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
        const metadataJsonString = JSON.stringify(metadata);
        await FsUtil.mkdirsAsync(path.dirname(outFilePath));
        await FsUtil.writeFileAsync(outFilePath, metadataJsonString);
      }
      else {
        await FsUtil.removeAsync(outFilePath);
      }
    }

    return diagnostics;
  }
}
