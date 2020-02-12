import {FsUtil, Logger} from "@simplysm/sd-core-node";
import * as ts from "typescript";
import * as path from "path";
import * as os from "os";
import {isMetadataError, MetadataCollector} from "@angular/compiler-cli";
import {NotImplementError} from "@simplysm/sd-core-common";
import {SdTypescriptUtils} from "../utils/SdTypescriptUtils";
import * as tslint from "tslint";
import {SdAngularUtils} from "../utils/SdAngularUtils";
import {SdMetadataCollector} from "../metadata/SdMetadataCollector";
import {SdNgModuleGenerator} from "../metadata/SdNgModuleGenerator";

export class SdTypescriptChecker {
  private readonly _packagePath: string;
  private readonly _srcPath: string;
  private readonly _distPath: string;
  private readonly _logger: Logger;

  private _program?: ts.Program;
  private readonly _diagnostics: ts.Diagnostic[] = [];
  private readonly _watchFiles: { eventKind: ts.FileWatcherEventKind; fileName: string }[] = [];
  private readonly _metadataCollector: SdMetadataCollector;
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

    this._logger = Logger.get(["simplysm", "sd-cli", packageKey, isNode ? "node" : "browser", "check"]);

    this._metadataCollector = new SdMetadataCollector(this._distPath);
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("타입체크 및 변경감지를 시작합니다.");

    //--------------------------------------------
    // GEN FILE CACHE 초기화
    //--------------------------------------------

    if (this._indexTsFilePath && FsUtil.exists(this._indexTsFilePath)) {
      this._genFileCache[this._indexTsFilePath] = await FsUtil.readFileAsync(this._indexTsFilePath);
    }

    //--------------------------------------------

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

        const warnings: string[] = [];
        const errors: string[] = [];

        const watchFileInfos = this._watchFiles
          .distinct()
          .map((item) => this._getWatchFileInfo(item));
        this._watchFiles.clear();

        //--------------------------------------------
        // 타입체크 결과 구성
        //--------------------------------------------

        {
          const checkResult = this._getDiagnosticResult(this._diagnostics);
          this._diagnostics.clear();

          warnings.push(...checkResult.warnings);
          errors.push(...checkResult.errors);

          const invalidWatchFiles = watchFileInfos.filter((item) =>
            checkResult.invalidFilePaths.filter((item1) =>
              path.resolve(item.watchFile.fileName) === path.resolve(item1)
            )
          ).map((item) => item.watchFile);
          this._watchFiles.push(...invalidWatchFiles);
        }

        //--------------------------------------------
        // LINT 수행
        //--------------------------------------------

        // TSLINT 메시지 구성
        {
          const lintFilePaths = watchFileInfos
            .filter((item) =>
              !item.isDeleted &&
              item.isTypescriptFile &&
              !item.watchFile.fileName.endsWith(".d.ts")
            ).map((item) => item.watchFile.fileName);

          const lintResult = await this._lintAsync(lintFilePaths);
          warnings.push(...lintResult.warnings);
          errors.push(...lintResult.errors);

          const invalidWatchFiles = watchFileInfos.filter((item) =>
            lintResult.invalidFilePaths.filter((item1) =>
              path.resolve(item.watchFile.fileName) === path.resolve(item1)
            )
          ).map((item) => item.watchFile);
          this._watchFiles.push(...invalidWatchFiles);
        }

        //--------------------------------------------
        // ANGULAR 모듈 등 생성
        //--------------------------------------------

        if (this._isAngular) {
          await this._updateMetadataInfoAsync(watchFileInfos);

          const ngModuleGenerator = new SdNgModuleGenerator(
            this._program,
            this._metadataCollector,
            this._srcPath,
            this._distPath
          );
          await ngModuleGenerator.generateAsync();
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

        if (warnings.filterExists().length > 0) {
          this._logger.warn("타입체크 경고\n", warnings.join("\n").trim());
        }

        if (errors.filterExists().length > 0) {
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
    this._logger.log("타입체크를 시작합니다.");

    //--------------------------------------------
    // GEN FILE CACHE 초기화
    //--------------------------------------------

    if (this._indexTsFilePath && FsUtil.exists(this._indexTsFilePath)) {
      this._genFileCache[this._indexTsFilePath] = await FsUtil.readFileAsync(this._indexTsFilePath);
    }

    //--------------------------------------------

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
      const checkResult = this._getDiagnosticResult(diagnostics);
      warnings.push(...checkResult.warnings);
      errors.push(...checkResult.errors);

      //--------------------------------------------
      // LINT 수행
      //--------------------------------------------

      const sourceFiles = this._program.getSourceFiles();
      const sourceFilePaths = sourceFiles
        .filter((item) =>
          item.fileName.endsWith(".ts") &&
          !item.fileName.endsWith(".d.ts") &&
          !path.relative(this._srcPath, item.fileName).includes("..")
        )
        .map((item) => item.fileName);

      const lintResult = await this._lintAsync(sourceFilePaths);
      warnings.push(...lintResult.warnings);
      errors.push(...lintResult.errors);

      //--------------------------------------------
      // ANGULAR 모듈 등 생성
      //--------------------------------------------

      const watchFileInfos = sourceFiles.map((item) =>
        this._getWatchFileInfo({
          fileName: item.fileName,
          eventKind: ts.FileWatcherEventKind.Created
        })
      );

      if (this._isAngular) {
        await this._updateMetadataInfoAsync(watchFileInfos);
        const ngModuleGenerator = new SdNgModuleGenerator(
          this._program,
          this._metadataCollector,
          this._srcPath,
          this._distPath
        );
        const ngModuleGenerated = await ngModuleGenerator.generateAsync();
        changed = changed || ngModuleGenerated;
      }

      //--------------------------------------------
      // INDEX 파일 생성
      //--------------------------------------------

      if (this._indexTsFilePath) {
        changed = changed || await this._generateIndexTsFileAsync();
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
      metadataFilePath = watchFile.fileName.replace(/(\.d)?\.(ts|js)$/, ".metadata.json");
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

  private async _generateIndexTsFileAsync(): Promise<boolean> {
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
      return true;
    }

    return false;
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
      linter.lint(sourceFilePath, await FsUtil.readFileAsync(sourceFilePath), config);
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
        .map((item) => path.resolve(item.getFileName()))
    };
  }

  private _getDiagnosticResult(diagnostics: ts.Diagnostic[]): { warnings: string[]; errors: string[]; invalidFilePaths: string[] } {
    const messages = diagnostics.map((diagnostic) => SdTypescriptUtils.getDiagnosticMessage(diagnostic));

    const warnings = messages.filter((item) => item.severity === "warning")
      .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

    const errors = messages.filter((item) => item.severity === "error")
      .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

    return {
      warnings,
      errors,
      invalidFilePaths: messages
        .filter((item) =>
          item.severity === ("warning" || item.severity === "error")
          && item.file
        )
        .map((item) => path.resolve(item.file!))
    };
  }

  private async _updateMetadataInfoAsync(watchFileInfos: IWatchFileInfo[]): Promise<{ warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const watchFileInfo of watchFileInfos) {
      if (watchFileInfo.isDeleted || !watchFileInfo.isTypescriptFile) {
        this._metadataCollector.unregister(watchFileInfo.metadataFilePath);
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
        await this._metadataCollector.registerAsync(watchFileInfo.metadataFilePath);
      }
    }

    return {warnings, errors};
  }
}

interface IWatchFileInfo {
  watchFile: { eventKind: ts.FileWatcherEventKind; fileName: string };
  isTypescriptFile: boolean;
  isPackageFile: boolean;
  isDeleted: boolean;
  metadataFilePath: string;
}