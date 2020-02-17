import {FsUtil, FsWatcher, Logger} from "@simplysm/sd-core-node";
import * as ts from "typescript";
import * as path from "path";
import * as os from "os";
import {CustomError, NotImplementError, ObjectUtil, Wait} from "@simplysm/sd-core-common";
import * as tslint from "tslint";
import {SdTypescriptUtils} from "../utils/SdTypescriptUtils";
import {SdAngularUtils} from "../utils/SdAngularUtils";
import {SdMetadataCollector} from "../metadata/SdMetadataCollector";
import {SdNgModuleGenerator} from "../generators/SdNgModuleGenerator";
import {SdIndexTsFileGenerator} from "../generators/SdIndexTsFileGenerator";
import {SdMetadataGenerator} from "../generators/SdMetadataGenerator";
import {SdNgRoutingModuleGenerator} from "../generators/SdNgRoutingModuleGenerator";

export class SdTypescriptChecker {
  private readonly _packagePath: string;
  private readonly _srcPath: string;
  private readonly _distPath: string;
  private readonly _rootFilePaths: string[];
  private readonly _logger: Logger;

  private _program?: ts.Program;
  private readonly _diagnostics: ts.Diagnostic[] = [];
  private readonly _watchFiles: { eventKind: ts.FileWatcherEventKind; fileName: string }[] = [];

  private readonly _metadataGenerator: SdMetadataGenerator | undefined;
  private readonly _metadataCollector: SdMetadataCollector | undefined;
  private readonly _ngModuleGenerator: SdNgModuleGenerator | undefined;
  private readonly _ngRoutingModuleGenerator: SdNgRoutingModuleGenerator | undefined;
  private readonly _indexTsFileGenerator: SdIndexTsFileGenerator | undefined;

  public constructor(private readonly _tsconfigPath: string,
                     private readonly _isAngular: boolean,
                     private readonly _indexTsFilePath: string | undefined,
                     private readonly _polyfills: string[]) {
    this._packagePath = path.dirname(this._tsconfigPath);
    const packageKey = path.basename(this._packagePath);

    const tsconfig = FsUtil.readJson(this._tsconfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, path.dirname(this._tsconfigPath));
    const isNode = parsedTsConfig.options.target !== ts.ScriptTarget.ES5;

    this._rootFilePaths = tsconfig.files?.map((item: string) => path.resolve(path.dirname(this._tsconfigPath), item)) ?? [];
    this._srcPath = parsedTsConfig.options.rootDir ? path.resolve(parsedTsConfig.options.rootDir) : path.resolve(this._packagePath, "src");
    this._distPath = parsedTsConfig.options.outDir ? path.resolve(parsedTsConfig.options.outDir) : path.resolve(this._packagePath, "dist");

    this._logger = Logger.get(["simplysm", "sd-cli", packageKey, isNode ? "node" : "browser", "check"]);

    if (this._isAngular) {
      this._metadataGenerator = new SdMetadataGenerator(this._srcPath, this._distPath);
      this._metadataCollector = new SdMetadataCollector(this._distPath);
      this._ngModuleGenerator = new SdNgModuleGenerator(this._metadataCollector, this._srcPath, this._distPath);
      this._ngRoutingModuleGenerator = new SdNgRoutingModuleGenerator(this._srcPath, this._ngModuleGenerator);
    }

    if (this._indexTsFilePath) {
      this._indexTsFileGenerator = new SdIndexTsFileGenerator(
        this._indexTsFilePath,
        this._polyfills,
        this._rootFilePaths,
        this._srcPath
      );
    }
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("타입체크 및 변경감지를 시작합니다.");

    const host = ts.createWatchCompilerHost(
      this._tsconfigPath,
      {},
      {
        ...ts.sys,
        readFile: (filePath: string, encoding?: string) => {
          const isPackageFile = !path.relative(this._srcPath, filePath).includes("..");
          const isTypescriptFile = !!filePath.match(/\.ts$/);
          const isDeclFile = !!filePath.match(/\.d\.ts$/);

          if (isPackageFile && isTypescriptFile && !isDeclFile) {
            const fileContent = ts.sys.readFile(filePath, encoding);
            if (fileContent === undefined) return undefined;

            const scssResult = SdAngularUtils.replaceScssToCss(filePath, fileContent);
            return scssResult.content;
          }

          return ts.sys.readFile(filePath, encoding);
        }
      },
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      diag => {
        this._diagnostics.push(diag);
      },
      diagnostic => {
        if (
          ts.flattenDiagnosticMessageText(diagnostic.messageText, os.EOL).startsWith("File change detected") &&
          this._watchFiles.length > 0
        ) {
          this._logger.log("타입체크에 대한 변경이 감지되었습니다.");
        }
      }
    );

    await new Promise<void>(async (resolve, reject) => {
      try {
        let processing = false;
        let lastProcId = 0;
        const prevAfterProgramCreate = host.afterProgramCreate;
        host.afterProgramCreate = async (builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram) => {
          const procId = lastProcId + 1;
          lastProcId = procId;

          await Wait.true(() => !processing);
          if (procId !== lastProcId) return;
          processing = true;

          this._program = builderProgram.getProgram();

          if (prevAfterProgramCreate) {
            prevAfterProgramCreate(builderProgram);
          }

          const warnings: string[] = [];
          const errors: string[] = [];

          this._logger.debug(`${this._watchFiles.length}건의 파일 변경 감지`);

          if (this._watchFiles.length > 0) {
            try {
              const watchFileClone = ObjectUtil.clone(this._watchFiles.distinct());
              // .map(item => this._getWatchFileInfo(item));
              this._watchFiles.clear();

              //--------------------------------------------
              // 타입체크 결과 구성
              //--------------------------------------------
              this._logger.debug("타입체크 결과 구성...");

              {
                const checkResult = SdTypescriptUtils.getDiagnosticMessage(this._diagnostics);
                this._diagnostics.clear();

                warnings.push(...checkResult.warnings);
                errors.push(...checkResult.errors);

                const invalidWatchFiles = watchFileClone
                  .filter(item =>
                    checkResult.invalidFilePaths
                      .some(item1 =>
                        path.resolve(item.fileName) === path.resolve(item1)
                      )
                  ).map(item => item);
                this._watchFiles.push(...invalidWatchFiles);
              }

              //--------------------------------------------
              // LINT 수행
              //--------------------------------------------
              this._logger.debug("LINT 수행...");

              {
                const lintFilePaths = watchFileClone
                  .filter(item => {
                    const info = this._getWatchFileInfo(item);
                    return !info.isDeleted &&
                      info.isTypescriptFile &&
                      !item.fileName.endsWith(".d.ts") &&
                      info.isPackageFile;
                  }).map(item => item.fileName);

                const lintResult = await this._lintAsync(lintFilePaths);
                warnings.push(...lintResult.warnings);
                errors.push(...lintResult.errors);

                const invalidWatchFiles = watchFileClone.filter(item =>
                  lintResult.invalidFilePaths.some(item1 =>
                    path.resolve(item.fileName) === path.resolve(item1)
                  )
                ).map(item => item);
                this._watchFiles.push(...invalidWatchFiles);
              }

              //--------------------------------------------
              // 동일 패키지의 index.ts 를 import 한 부분 체크 메시지 구성
              //--------------------------------------------
              this._logger.debug("내부 import 체크...");

              for (const watchFile of watchFileClone) {
                const info = this._getWatchFileInfo(watchFile);
                if (info.isDeleted && !info.isPackageFile) {
                  continue;
                }

                const content = await FsUtil.readFileAsync(watchFile.fileName);
                const matches = content.match(/from ".*"/g);
                if (matches && matches.some(match => match.match(/\.\.\/?"$/))) {
                  errors.push(`${watchFile.fileName}: 소속 패키지의 'index.ts'를 import 하고 있습니다.`);

                  this._watchFiles.push(watchFile);
                }
              }

              //--------------------------------------------
              // ANGULAR 모듈 등 생성
              //--------------------------------------------
              if (this._isAngular) {
                this._logger.debug("ANGULAR 모듈 등 생성 준비...");

                for (const watchFile of watchFileClone) {
                  const info = this._getWatchFileInfo(watchFile);
                  if (info.isDeleted || !info.isTypescriptFile) {
                    this._metadataCollector!.unregister(info.metadataFilePath);
                    continue;
                  }

                  // 신규 패키지 파일인 경우 메타데이터 파일 생성
                  if (info.isPackageFile) {
                    const result = await this._generateMetadataFileAsync(info);
                    if (result.warnings.length > 0 || result.errors.length > 0) {
                      warnings.push(...result.warnings);
                      errors.push(...result.errors);
                    }
                  }

                  if (FsUtil.exists(info.metadataFilePath)) {
                    await this._metadataCollector!.registerAsync(info.metadataFilePath);
                  }
                }

                this._logger.debug("ANGULAR 모듈 생성...");
                await this._ngModuleGenerator!.generateAsync(
                  this._program,
                  watchFileClone
                    .map(item => this._getWatchFileInfo(item))
                    .filter(item => !item.isDeleted && item.isTypescriptFile)
                    .map(item => item.metadataFilePath)
                );

                this._logger.debug("ANGULAR 라우팅 모듈 생성...");
                await this._ngRoutingModuleGenerator!.generateAsync();
              }

              //--------------------------------------------
              // INDEX 파일 생성
              //--------------------------------------------

              if (this._indexTsFileGenerator) {
                this._logger.debug("INDEX 파일 생성...");
                await this._indexTsFileGenerator.generateAsync();
              }

              //--------------------------------------------
              // 삭제된 소스의 d.ts 파일 삭제
              //--------------------------------------------
              this._logger.debug("삭제된 소스의 d.ts 파일 삭제...");

              const deletedItems = watchFileClone.filter(watchFile => {
                const info = this._getWatchFileInfo(watchFile);
                return info.isPackageFile && info.isDeleted;
              });
              for (const deletedItem of deletedItems) {
                const tsFileRelativePath = path.relative(this._srcPath, deletedItem.fileName);
                const descFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".d.ts");
                const descFilePath = path.resolve(this._distPath, descFileRelativePath);

                await FsUtil.removeAsync(descFilePath);
              }
            }
            catch (err) {
              this._logger.error(new CustomError(err, "타입체크 오류 발생"));
            }
          }

          //--------------------------------------------
          // 마무리
          //--------------------------------------------
          this._logger.debug("마무리...");

          processing = false;

          setTimeout(() => {
            if (procId === lastProcId) {
              // 메시지 출력
              if (warnings.filterExists().length > 0) {
                this._logger.warn("타입체크 경고\n", warnings.join("\n").trim());
              }

              if (errors.filterExists().length > 0) {
                this._logger.error("타입체크 오류\n", errors.join("\n").trim());
              }

              this._logger.log("타입체크가 완료되었습니다.");
              resolve();
            }
          }, 100);
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

        await FsWatcher.watchAsync(path.resolve(this._srcPath, "**", "*.ts"), changedInfos => {
          this._watchFiles.push(...changedInfos.map(item => ({
            eventKind: item.type === "add" ? ts.FileWatcherEventKind.Created
              : item.type === "change" ? ts.FileWatcherEventKind.Changed
                : ts.FileWatcherEventKind.Deleted,
            fileName: item.filePath
          })));
        }, err => {
          this._logger.error(err);
        });

        ts.createWatchProgram(host);
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async runAsync(): Promise<void> {
    this._logger.log("타입체크를 시작합니다.");

    const tsConfig = await FsUtil.readJsonAsync(this._tsconfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, this._packagePath);

    const doing = async () => {
      let changed = false;

      const warnings: string[] = [];
      const errors: string[] = [];

      this._program = ts.createProgram(parsedTsConfig.fileNames, parsedTsConfig.options);

      //--------------------------------------------
      // 타입체크
      //--------------------------------------------
      this._logger.debug("타입체크...");

      let diagnostics: ts.Diagnostic[] = [];
      if (parsedTsConfig.options.declaration) {
        diagnostics = diagnostics.concat(ts.getPreEmitDiagnostics(this._program));
        const emitResult = this._program.emit(
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
        diagnostics = diagnostics.concat(emitResult.diagnostics);
      }
      else {
        diagnostics = diagnostics
          .concat(this._program.getSemanticDiagnostics())
          .concat(this._program.getSyntacticDiagnostics());
      }
      const checkResult = SdTypescriptUtils.getDiagnosticMessage(diagnostics);
      warnings.push(...checkResult.warnings);
      errors.push(...checkResult.errors);

      //--------------------------------------------
      // LINT 수행
      //--------------------------------------------
      this._logger.debug("LINT 수행...");

      const sourceFiles = this._program.getSourceFiles();
      const sourceFilePaths = sourceFiles
        .filter(item =>
          item.fileName.endsWith(".ts") &&
          !item.fileName.endsWith(".d.ts") &&
          !path.relative(this._srcPath, item.fileName).includes("..")
        )
        .map(item => item.fileName);

      const lintResult = await this._lintAsync(sourceFilePaths);
      warnings.push(...lintResult.warnings);
      errors.push(...lintResult.errors);

      //--------------------------------------------
      // 동일 패키지의 index.ts 를 import 한 부분 체크 메시지 구성
      //--------------------------------------------
      this._logger.debug("내부 import 체크...");

      const watchFileInfos = sourceFiles.map(item =>
        this._getWatchFileInfo({
          fileName: item.fileName,
          eventKind: ts.FileWatcherEventKind.Created
        })
      );

      for (const watchFileInfo of watchFileInfos) {
        if (watchFileInfo.isDeleted && !watchFileInfo.isPackageFile) {
          continue;
        }

        const content = await FsUtil.readFileAsync(watchFileInfo.watchFile.fileName);
        const matches = content.match(/from ".*"/g);
        if (matches && matches.some(match => match.match(/\.\.\/?"$/))) {
          errors.push(`${watchFileInfo.watchFile.fileName}: 소속 패키지의 'index.ts'를 import 하고 있습니다.`);

          this._watchFiles.push(watchFileInfo.watchFile);
        }
      }

      //--------------------------------------------
      // ANGULAR 모듈 등 생성
      //--------------------------------------------

      if (this._isAngular) {
        this._logger.debug("ANGULAR 모듈 등 생성 준비...");

        for (const watchFileInfo of watchFileInfos) {
          if (watchFileInfo.isDeleted || !watchFileInfo.isTypescriptFile) {
            this._metadataCollector!.unregister(watchFileInfo.metadataFilePath);
            continue;
          }

          // 신규 패키지 파일인 경우 메타데이터 파일 생성
          if (watchFileInfo.isPackageFile) {
            const result = await this._generateMetadataFileAsync(watchFileInfo);
            if (result.warnings.length > 0 || result.errors.length > 0) {
              warnings.push(...result.warnings);
              errors.push(...result.errors);
            }
          }

          if (FsUtil.exists(watchFileInfo.metadataFilePath)) {
            await this._metadataCollector!.registerAsync(watchFileInfo.metadataFilePath);
          }
        }

        this._logger.debug("ANGULAR 모듈 생성...");
        const changed1 = await this._ngModuleGenerator!.generateAsync(this._program);

        this._logger.debug("ANGULAR 라우팅 모듈 생성...");
        const changed2 = await this._ngRoutingModuleGenerator!.generateAsync();

        changed = changed || changed1 || changed2;
      }

      //--------------------------------------------
      // INDEX 파일 생성
      //--------------------------------------------

      if (this._indexTsFileGenerator) {
        this._logger.debug("INDEX 파일 생성...");
        const changed1 = await this._indexTsFileGenerator.generateAsync();
        changed = changed || changed1;
      }

      //--------------------------------------------
      // 삭제된 소스의 d.ts 파일 삭제
      //--------------------------------------------
      this._logger.debug("삭제된 소스의 d.ts 파일 삭제...");

      const deletedItems = watchFileInfos.filter(watchFileInfo => watchFileInfo.isPackageFile && watchFileInfo.isDeleted);
      for (const deletedItem of deletedItems) {
        const tsFileRelativePath = path.relative(this._srcPath, deletedItem.watchFile.fileName);
        const descFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".d.ts");
        const descFilePath = path.resolve(this._distPath, descFileRelativePath);

        await FsUtil.removeAsync(descFilePath);
      }

      //--------------------------------------------
      // 마무리
      //--------------------------------------------

      if (changed) {
        await doing();
      }
      else {
        if (warnings.filterExists().length > 0) {
          this._logger.warn("타입체크 경고\n", warnings.join("\n").trim());
        }

        if (errors.filterExists().length > 0) {
          this._logger.error("타입체크 오류\n", errors.join("\n").trim());
        }

        this._logger.log("타입체크가 완료되었습니다.");
      }
    };

    await doing();
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
      metadataFilePath = path.resolve(watchFile.fileName).replace(/(\.d)?\.(ts|js)$/, ".metadata.json");
    }

    return {
      watchFile,
      isTypescriptFile,
      isPackageFile,
      isDeleted,
      metadataFilePath
    };
  }

  private async _generateMetadataFileAsync(watchFileInfo: IWatchFileInfo): Promise<{ warnings: string[]; errors: string[] }> {
    if (!this._program) throw new NotImplementError();

    const diagnostics: ts.Diagnostic[] = [];

    if (watchFileInfo.isTypescriptFile && watchFileInfo.isPackageFile && !watchFileInfo.isDeleted) {
      const sourceFile = this._program.getSourceFile(watchFileInfo.watchFile.fileName);
      if (sourceFile) {
        diagnostics.push(
          ...await this._metadataGenerator!.generateAsync(sourceFile)
        );
      }
    }

    return SdTypescriptUtils.getDiagnosticMessage(diagnostics);
  }

  private async _lintAsync(sourceFilePaths: string[]): Promise<{ warnings: string[]; errors: string[]; invalidFilePaths: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const lintConfigPath = path.resolve(this._packagePath, "tslint.json");
    const config = tslint.Configuration.findConfiguration(lintConfigPath).results;
    if (!config) {
      throw new Error("'" + lintConfigPath + "'파일을 찾을 수 없습니다.");
    }

    const linter = new tslint.Linter({formatter: "json", fix: false}, this._program);

    for (const sourceFilePath of sourceFilePaths.distinct()) {
      try {
        linter.lint(sourceFilePath, await FsUtil.readFileAsync(sourceFilePath), config);
      }
      catch (err) {
        errors.push(`${sourceFilePath}: ` + err.stack);
      }
    }

    const failures = linter.getResult().failures;
    for (const lintFailure of failures) {
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
      }
    }

    return {
      warnings,
      errors,
      invalidFilePaths: failures
        .map(item => path.resolve(item.getFileName()))
    };
  }
}

interface IWatchFileInfo {
  watchFile: { eventKind: ts.FileWatcherEventKind; fileName: string };
  isTypescriptFile: boolean;
  isPackageFile: boolean;
  isDeleted: boolean;
  metadataFilePath: string;
}