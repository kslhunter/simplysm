import * as events from "events";
import * as tslint from "tslint";
import * as path from "path";
import * as os from "os";
import {FileWatcher} from "@simplysm/sd-core";

export class SdPackageLinter extends events.EventEmitter {
  private readonly _contextPath: string;
  private readonly _tsConfigPath: string;
  private readonly _tsLintConfigPath: string;
  private readonly _tsLintConfig: tslint.Configuration.IConfigurationFile;

  public constructor(private readonly _packageKey: string) {
    super();

    this._contextPath = path.resolve(process.cwd(), "packages", this._packageKey);
    this._tsConfigPath = path.resolve(this._contextPath, "tsconfig.json");
    this._tsLintConfigPath = path.resolve(this._contextPath, "tslint.json");
    this._tsLintConfig = tslint.Configuration.findConfiguration(this._tsLintConfigPath).results!;
  }

  public async runAsync(): Promise<void> {
    this.emit("run");

    const messages = this._lintFiles();
    if (messages.length > 0) {
      this.emit("warning", messages.join(os.EOL));
    }

    this.emit("done");
  }

  public async watchAsync(): Promise<void> {
    await this.runAsync();

    await FileWatcher.watch(
      path.resolve(this._contextPath, "src", "**", "*.ts"), ["add", "change"],
      changedFileInfos => {
        this.emit("run");

        const messages = this._lintFiles(changedFileInfos.map(item => item.filePath));

        if (messages.length > 0) {
          this.emit("warning", messages.distinct().join(os.EOL));
        }

        this.emit("done");
      }
    );
  }

  private _lintFiles(fileNames?: string[]): string[] {
    const program = tslint.Linter.createProgram(this._tsConfigPath, path.dirname(this._tsConfigPath));
    const linter = new tslint.Linter({formatter: "json", fix: false}, program);

    const sourceFiles = (fileNames ? fileNames : tslint.Linter.getFileNames(program))
      .filter(item => path.resolve(item).startsWith(this._contextPath))
      .map(item => program.getSourceFile(item))
      .filterExists();

    const messages: string[] = [];
    for (const sourceFile of sourceFiles) {
      linter.lint(sourceFile.fileName, sourceFile.getFullText(), this._tsLintConfig);
    }

    messages.pushRange(linter.getResult().failures.map(item => this._failureToMessage(item)));
    return messages.distinct();
  }

  private _failureToMessage(failure: tslint.RuleFailure): string {
    const severity = failure.getRuleSeverity();
    const message = failure.getFailure();
    const rule = failure.getRuleName();
    const fileName = failure.getFileName();
    const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
    const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;

    return `${fileName}(${lineNumber},${charNumber}): ${severity}: ${message} (${rule})`;
  }
}
