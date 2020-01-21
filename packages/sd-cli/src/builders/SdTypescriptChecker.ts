import * as ts from "typescript";
import * as os from "os";
import {Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import {ObjectUtil} from "@simplysm/sd-core-common";
import * as tslint from "tslint";
import * as fs from "fs-extra";
import {MetadataCollector} from "@angular/compiler-cli";

export class SdTypescriptChecker {
  private _program?: ts.Program;

  public constructor(private readonly _tsConfigPath: string,
                     private readonly _packagePath: string,
                     private readonly _logger: Logger,
                     private readonly _distPath: string,
                     private readonly _withMetadata?: boolean) {
  }

  public static async createAsync(tsConfigPath: string, withMetadata?: boolean): Promise<SdTypescriptChecker> {
    const packagePath = path.dirname(tsConfigPath);
    const packageKey = path.basename(packagePath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(await fs.readJson(tsConfigPath), ts.sys, path.dirname(tsConfigPath));
    const isNode = parsedTsConfig.options.target !== ts.ScriptTarget.ES5;
    const logger = Logger.get(["simplysm", "sd-cli", packageKey, isNode ? "node" : "browser", "check"]);

    const distPath = parsedTsConfig.options.outDir
      ? path.resolve(parsedTsConfig.options.outDir)
      : path.resolve(packagePath, "dist");

    return new SdTypescriptChecker(
      tsConfigPath,
      packagePath,
      logger,
      distPath,
      withMetadata
    );
  }

  public async watchAsync(): Promise<void> {
    this._logger.log("타입체크 및 변경감지를 시작합니다.");

    const diagnostics: ts.Diagnostic[] = [];
    const watchFiles: { eventKind: ts.FileWatcherEventKind; fileName: string }[] = [];

    const host = ts.createWatchCompilerHost(
      this._tsConfigPath,
      {},
      {
        ...ts.sys,
        writeFile(filePath: string, data: string, writeByteOrderMark?: boolean): void {
          if (filePath.endsWith(".d.ts")) {
            ts.sys.writeFile(filePath, data, writeByteOrderMark);
          }
        },
        createDirectory: (dirPath: string) => {
          if (this._program?.getCompilerOptions()?.declaration) {
            ts.sys.createDirectory(dirPath);
          }
        }
      },
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      (diag: ts.Diagnostic) => {
        diagnostics.push(diag);
      },
      (diagnostic) => {
        if (
          ts.flattenDiagnosticMessageText(diagnostic.messageText, os.EOL).startsWith("File change detected") &&
          watchFiles.length > 0
        ) {
          this._logger.log("타입체크에 대한 변경이 감지되었습니다.");
        }
      }
    );

    await new Promise<void>((resolve) => {
      const prevAfterProgramCreate = host.afterProgramCreate;
      host.afterProgramCreate = async (program: ts.EmitAndSemanticDiagnosticsBuilderProgram) => {
        if (watchFiles.length <= 0) {
          return;
        }

        this._program = program.getProgram();

        if (prevAfterProgramCreate) {
          prevAfterProgramCreate(program);
        }

        const watchFilesClone = ObjectUtil.clone(watchFiles);
        watchFiles.clear();

        if (watchFilesClone.length > 0 && this._withMetadata) {
          for (const watchFile of watchFilesClone) {
            const sourceFile = this._program.getSourceFile(watchFile.fileName);
            if (sourceFile) {
              diagnostics.concat(await this._generateMetadataFileAsync(sourceFile));
            }
          }
        }

        const messages = diagnostics.map((diagnostic) => this._getDiagnosticMessage(diagnostic));

        diagnostics.clear();

        const warningTextArr = messages.filter((item) => item.severity === "warning")
          .map((item) => this._getDiagnosticMessageText(item));

        const errorTextArr = messages.filter((item) => item.severity === "error")
          .map((item) => this._getDiagnosticMessageText(item));

        if (watchFilesClone.length > 0) {
          const lintFailures = await this._lintAsync(watchFilesClone);
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
              warningTextArr.push(text);
            }
            else {
              errorTextArr.push(text);
            }
          }
        }

        if (warningTextArr.length > 0) {
          this._logger.warn("타입체크 경고\n", warningTextArr.join("\n").trim());
        }

        if (errorTextArr.length > 0) {
          this._logger.error("타입체크 오류\n", errorTextArr.join("\n").trim());
        }

        this._logger.log("타입체크가 완료되었습니다.");
        resolve();
      };

      const prevWatchFile = host.watchFile;
      host.watchFile = (filePath: string, callback: ts.FileWatcherCallback, pollingInterval?: number): ts.FileWatcher => {
        watchFiles.push({eventKind: ts.FileWatcherEventKind.Created, fileName: filePath});

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

      ts.createWatchProgram(host).getProgram().getProgram();
    });
  }

  public async runAsync(): Promise<void> {
    this._logger.log("타입체크를 시작합니다.");

    const tsConfig = await fs.readJson(this._tsConfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, this._packagePath);
    const program = ts.createProgram(parsedTsConfig.fileNames, parsedTsConfig.options);

    let diagnostics: ts.Diagnostic[] = [];
    if (parsedTsConfig.options.declaration) {
      diagnostics = diagnostics.concat(ts.getPreEmitDiagnostics(program));
      const emitResult = program.emit(
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
        .concat(program.getSemanticDiagnostics())
        .concat(program.getSyntacticDiagnostics());
    }

    if (this._withMetadata) {
      for (const sourceFile of program.getSourceFiles()) {
        diagnostics.concat(await this._generateMetadataFileAsync(sourceFile));
      }
    }

    const messages = diagnostics.map((diagnostic) => this._getDiagnosticMessage(diagnostic));

    const warningTextArr = messages.filter((item) => item.severity === "warning")
      .map((item) => this._getDiagnosticMessageText(item));

    const errorTextArr = messages.filter((item) => item.severity === "error")
      .map((item) => this._getDiagnosticMessageText(item));

    if (warningTextArr.length > 0) {
      this._logger.warn("타입체크 경고\n", warningTextArr.join("\n").trim());
    }

    if (errorTextArr.length > 0) {
      this._logger.error("타입체크 오류\n", errorTextArr.join("\n").trim());
    }

    this._logger.log("타입체크가 완료되었습니다.");
  }

  private async _generateMetadataFileAsync(sourceFile: ts.SourceFile): Promise<ts.Diagnostic[]> {
    const diagnostics: ts.Diagnostic[] = [];

    if (path.resolve(sourceFile.fileName).startsWith(path.resolve(this._packagePath, "src"))) {
      const metadata = new MetadataCollector().getMetadata(
        sourceFile,
        false,
        (value, tsNode) => {
          if (value && value["__symbolic"] && value["__symbolic"] === "error") {
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

      const outFilePath = path.resolve(this._distPath, path.relative(path.resolve(this._packagePath, "src"), sourceFile.fileName))
        .replace(/\.ts$/, ".metadata.json");
      if (metadata) {
        const metadataJsonString = JSON.stringify(metadata);
        await fs.writeFile(outFilePath, metadataJsonString);
      }
      else {
        await fs.remove(outFilePath);
      }
    }

    return diagnostics;
  }

  private async _lintAsync(watchFiles: { eventKind: ts.FileWatcherEventKind; fileName: string }[]): Promise<tslint.RuleFailure[]> {
    const lintConfigPath = path.resolve(this._packagePath, "tslint.json");
    const config = tslint.Configuration.findConfiguration(lintConfigPath).results;
    if (!config) {
      throw new Error("'" + lintConfigPath + "'파일을 찾을 수 없습니다.");
    }

    const linter = new tslint.Linter({formatter: "json", fix: false}, this._program);

    const lintFileInfos = watchFiles
      .filter((item) =>
        item.eventKind !== ts.FileWatcherEventKind.Deleted &&
        !item.fileName.endsWith(".d.ts") &&
        item.fileName.endsWith(".ts")
      )
      .distinct();
    for (const watchFileInfo of lintFileInfos) {
      linter.lint(watchFileInfo.fileName, await fs.readFile(watchFileInfo.fileName, "utf8"), config);
    }

    return linter.getResult().failures;
  }

  private _getDiagnosticMessage(diagnostic: ts.Diagnostic): IDiagnosticMessage {
    const message: IDiagnosticMessage = {
      code: diagnostic.code,
      severity: ts.DiagnosticCategory[diagnostic.category].toLowerCase(),
      messageText: ts.flattenDiagnosticMessageText(diagnostic.messageText, os.EOL)
    };

    if (diagnostic.file) {
      message.file = diagnostic.file.fileName;

      if (diagnostic.start !== undefined) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        message.line = position.line + 1;
        message.char = position.character + 1;
      }
    }

    return message;
  }

  private _getDiagnosticMessageText(message: IDiagnosticMessage): string {
    return message.file
      ? `${message.file}(${message.line}, ${message.char}): ${message.code}: ${message.severity} ${message.messageText}`
      : `${message.code}: ${message.severity} ${message.messageText}`;
  }
}

interface IDiagnosticMessage {
  file?: string;
  line?: number;
  char?: number;
  code: number;
  severity: string;
  messageText: string;
}
