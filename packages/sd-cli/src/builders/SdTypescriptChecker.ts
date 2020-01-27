import * as ts from "typescript";
import * as os from "os";
import {FsUtil, Logger} from "@simplysm/sd-core-node";
import * as path from "path";
import {ObjectUtil} from "@simplysm/sd-core-common";
import * as tslint from "tslint";
import {SdTypescriptUtils} from "../utils/SdTypescriptUtils";

export class SdTypescriptChecker {
  private _program?: ts.Program;

  public constructor(private readonly _tsConfigPath: string,
                     private readonly _packagePath: string,
                     private readonly _srcPath: string,
                     private readonly _distPath: string,
                     private readonly _logger: Logger) {
  }

  public static async createAsync(tsConfigPath: string): Promise<SdTypescriptChecker> {
    const packagePath = path.dirname(tsConfigPath);
    const packageKey = path.basename(packagePath);

    const tsConfig = await FsUtil.readJsonAsync(tsConfigPath);
    tsConfig.compilerOptions.rootDir = tsConfig.compilerOptions.rootDir || "src";
    tsConfig.compilerOptions.outDir = tsConfig.compilerOptions.outDir || "dist";

    const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path.dirname(tsConfigPath));
    const isNode = parsedTsConfig.options.target !== ts.ScriptTarget.ES5;

    const srcPath = path.resolve(parsedTsConfig.options.rootDir!);
    const distPath = path.resolve(parsedTsConfig.options.outDir!);

    const logger = Logger.get(["simplysm", "sd-cli", packageKey, isNode ? "node" : "browser", "check"]);

    return new SdTypescriptChecker(
      tsConfigPath,
      packagePath,
      srcPath,
      distPath,
      logger
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

        // 타입체크 메시지 구성
        const messages = diagnostics.map((diagnostic) => SdTypescriptUtils.getDiagnosticMessage(diagnostic));
        diagnostics.clear();

        const warningTextArr = messages.filter((item) => item.severity === "warning")
          .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

        const errorTextArr = messages.filter((item) => item.severity === "error")
          .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

        // TSLINT 메시지 구성
        const watchFilesClone = ObjectUtil.clone(watchFiles);
        watchFiles.clear();

        // INDEX 체크 메시지 구성
        for (const watchFile of watchFilesClone) {
          const content = await FsUtil.readFileAsync(watchFile.fileName);
          const matches = content.match(/from ".*"/g);
          if (watchFile.fileName.endsWith("PropertyValidate.ts")) {
            if (matches && matches.some((match) => match.match(/\.\.\/?"$/))) {
              errorTextArr.push(`${watchFile.fileName}: 소속 패키지의 'index.ts'를 import 하고 있습니다.`);
            }
          }
        }

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

        // 메시지 출력
        if (warningTextArr.length > 0) {
          this._logger.warn("타입체크 경고\n", warningTextArr.join("\n").trim());
        }

        if (errorTextArr.length > 0) {
          this._logger.error("타입체크 오류\n", errorTextArr.join("\n").trim());
        }

        // 삭제된 소스의 d.ts 파일 삭제
        const deletedItems = watchFilesClone
          .filter((item) => item.eventKind === ts.FileWatcherEventKind.Deleted);
        for (const deletedItem of deletedItems) {
          const tsFileRelativePath = path.relative(this._srcPath, deletedItem.fileName);
          const descFileRelativePath = tsFileRelativePath.replace(/\.ts$/, ".d.ts");
          const descFilePath = path.resolve(this._distPath, descFileRelativePath);

          await FsUtil.removeAsync(descFilePath);
        }

        this._logger.log("타입체크가 완료되었습니다.");
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

      ts.createWatchProgram(host).getProgram().getProgram();
    });
  }

  public async runAsync(): Promise<void> {
    this._logger.log("타입체크를 시작합니다.");

    const tsConfig = await FsUtil.readJsonAsync(this._tsConfigPath);
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

    const messages = diagnostics.map((diagnostic) => SdTypescriptUtils.getDiagnosticMessage(diagnostic));

    const warningTextArr = messages.filter((item) => item.severity === "warning")
      .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

    const errorTextArr = messages.filter((item) => item.severity === "error")
      .map((item) => SdTypescriptUtils.getDiagnosticMessageText(item));

    if (warningTextArr.length > 0) {
      this._logger.warn("타입체크 경고\n", warningTextArr.join("\n").trim());
    }

    if (errorTextArr.length > 0) {
      this._logger.error("타입체크 오류\n", errorTextArr.join("\n").trim());
    }

    this._logger.log("타입체크가 완료되었습니다.");
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
      linter.lint(watchFileInfo.fileName, await FsUtil.readFileAsync(watchFileInfo.fileName), config);
    }

    return linter.getResult().failures;
  }
}
