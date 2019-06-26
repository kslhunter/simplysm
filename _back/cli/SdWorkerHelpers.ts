import * as ts from "typescript";
import {ISdWorkerMessage} from "../commons/interfaces";
import * as path from "path";
import * as fs from "fs-extra";
import {FileWatcher} from "@simplysm/sd-core";
import * as os from "os";
import * as sass from "node-sass";
import * as tslint from "tslint";
import * as chokidar from "chokidar";
import {MetadataCollector, ModuleMetadata} from "@angular/compiler-cli";
import {MetadataBundler} from "@angular/compiler-cli/src/metadata/bundler";
import CpuUsage = NodeJS.CpuUsage;

export class SdWorkerHelpers {
  private static _cpuUsage: CpuUsage;

  public static createWatchCompilerHost(compile: boolean,
                                        rootFiles: string[],
                                        options: ts.CompilerOptions,
                                        onRun?: () => void,
                                        onDone?: () => void,
                                        onDiagnostic?: (diagnostic: ts.Diagnostic) => void): ts.WatchCompilerHostOfFilesAndCompilerOptions<ts.BuilderProgram> {
    const builderProgram = (
      compile ? ts.createEmitAndSemanticDiagnosticsBuilderProgram : ts.createSemanticDiagnosticsBuilderProgram
    ) as ts.CreateProgram<ts.BuilderProgram>;

    return ts.createWatchCompilerHost(
      rootFiles,
      {
        ...options,
        ...compile
          ? {}
          : {
            strict: false,
            noUnusedLocals: false,
            skipLibCheck: true,
            noEmit: true
          }
      },
      ts.sys,
      builderProgram,
      diagnostic => {
        if (onDiagnostic) {
          onDiagnostic(diagnostic);
        }
      },
      diagnostic => {
        const messageText = diagnostic.messageText.toString();
        if (
          messageText.includes("Starting compilation in watch mode") ||
          messageText.includes("File change detected. Starting incremental compilation")
        ) {
          if (onRun) {
            onRun();
          }
        }
        else if (messageText.includes("Watching for file changes")) {
          if (onDone) {
            onDone();
          }
        }
      }
    );
  }

  public static compile(fileName: string, content: string, options: ts.CompilerOptions): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];
    const result = ts.transpileModule(content, {
      fileName,
      compilerOptions: options,
      reportDiagnostics: false
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      diagnostics.pushRange(result.diagnostics);
    }

    const relativePath = path.relative(options.rootDir!, fileName);
    const outPath = path.resolve(options.outDir!, relativePath).replace(/\.ts$/, ".js");

    fs.mkdirsSync(path.dirname(outPath));
    fs.writeFileSync(outPath, result.outputText);

    if (options.sourceMap && !options.inlineSourceMap) {
      fs.writeFileSync(outPath + ".map", result.sourceMapText);
    }

    return diagnostics;
  }

  public static compileScss(fileName: string, content: string, sourceMap: boolean): string {
    const scssRegex = /(scss\()?\/\* *language=SCSS *\*\/ *[`"'](((?!['"`]\)?[\],][,;]?[\r\n\\])(.|\r|\n))*)['"`]\)?/;

    let newContent = content;
    const matches = newContent.match(new RegExp(scssRegex, "gi"));
    if (matches) {
      const results = matches.map(match => {
        try {
          return sass.renderSync({
            file: fileName,
            data: match.match(scssRegex)![2],
            sourceMapEmbed: sourceMap,
            outputStyle: "compressed"
          });
        }
        catch (err) {
          console.error(err, match.match(scssRegex)![2]);
          throw err;
        }
      });

      let i = 0;
      newContent = newContent.replace(new RegExp(scssRegex, "gi"), () => {
        let result = "`" + results[i].css.toString() + "`";
        const prev = matches[i];

        const diffCount = Array.from(prev).filter(item => item === "\n").length - Array.from(result).filter(item => item === "\n").length;
        result += "/* tslint:disable */";
        for (let j = 0; j < diffCount; j++) {
          result += "\n";
        }
        result += "/* tslint:enable */";

        i++;
        return result;
      });
    }

    return newContent;
  }

  public static lint(program: ts.Program, contextPath: string, sourceFiles: ts.SourceFile[]): ts.Diagnostic[] {
    const linter = new tslint.Linter({formatter: "json", fix: false}, program);
    const config = tslint.Configuration.findConfiguration(path.resolve(contextPath, "tslint.json")).results!;

    for (const sourceFile of sourceFiles) {
      linter.lint(sourceFile.fileName, sourceFile.getFullText(), config);
    }

    const failures = linter.getResult().failures;

    return failures.map(item => ({
      file: program.getSourceFile(item.getFileName()),
      start: item.getStartPosition().getPosition(),
      messageText: item.getFailure(),
      category: ts.DiagnosticCategory.Warning,
      code: 0,
      length: undefined,
      rule: item.getRuleName()
    }));
  }

  public static generateMetadata(sourceFile: ts.SourceFile, contextPath: string): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];
    const metadata = new MetadataCollector().getMetadata(sourceFile, false, (value, tsNode) => {
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
    });

    const relativePath = path.relative(path.resolve(contextPath, "src"), sourceFile.fileName);
    const outPath = path.resolve(path.resolve(contextPath, "dist"), relativePath).replace(/\.ts$/, ".metadata.json");

    if (metadata) {
      fs.mkdirsSync(path.dirname(outPath));
      fs.writeJsonSync(outPath, metadata);
    }

    return diagnostics;
  }

  public static generateMetadataBundle(packageName: string, rootFilePath: string, contextPath: string): ts.Diagnostic[] {
    const result: ts.Diagnostic[] = [];

    const metadataCollector = new MetadataCollector();
    const metadataBundler = new MetadataBundler(
      rootFilePath.replace(/\.ts$/, ""),
      packageName,
      {
        getMetadataFor: (moduleName: string): ModuleMetadata | undefined => {
          const sourceText = fs.readFileSync(moduleName + ".ts").toString();
          const sourceFile = ts.createSourceFile(moduleName + ".ts", sourceText, ts.ScriptTarget.Latest);
          return metadataCollector.getMetadata(sourceFile, false, (value, tsNode) => {
            if (value && value["__symbolic"] && value["__symbolic"] === "error") {
              result.push({
                file: sourceFile,
                start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
                messageText: value["message"],
                category: ts.DiagnosticCategory.Error,
                code: 0,
                length: undefined
              });
            }
            return value;
          });
        }
      }
    );

    const relativePath = path.relative(path.resolve(contextPath, "src"), rootFilePath);
    const outPath = path.resolve(path.resolve(contextPath, "dist"), relativePath).replace(/\.ts$/, ".metadata.json");

    fs.mkdirsSync(path.dirname(outPath));
    fs.writeJsonSync(outPath, metadataBundler.getMetadataBundle().metadata);

    return result;
  }

  public static sendMessage(message: ISdWorkerMessage): void {
    if (message.type === "run") {
      SdWorkerHelpers._cpuUsage = process.cpuUsage();
    }
    else if (message.type === "done") {
      const usage = process.cpuUsage(SdWorkerHelpers._cpuUsage);
      Object.assign(message, {message: {cpuUsage: Math.floor((usage.user + usage.system) / 1000)}});
    }

    process.send!(message, (err: Error) => {
      if (err) throw err;
    });
  }

  public static getParsedTsConfig(contextPath: string): ts.ParsedCommandLine {
    const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");
    const tsConfig = fs.readJsonSync(tsConfigPath);
    return ts.parseJsonConfigFileContent(tsConfig, ts.sys, contextPath);
  }

  public static getIsMyTsFile(fileName: string, sourcePath: string): boolean {
    return !!fileName.match(/\.ts$/) && !fileName.match(/\.d\.ts$/) && path.resolve(fileName).startsWith(sourcePath);
  }

  public static diagnosticToMessage(diagnostic: ts.Diagnostic): string | undefined {
    if (diagnostic.file) {
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
      const tsMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      return `${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): ${diagnostic.category.toString().toLowerCase()}: ${tsMessage}` + (diagnostic["rule"] ? ` (${diagnostic["rule"]})` : "");
    }
    else {
      return undefined;
    }
  }

  public static getDependencies(sourceFile: ts.SourceFile, checker: ts.TypeChecker): string[] {
    const result: string[] = [];
    ts.forEachChild(sourceFile, node => {
      if (
        node.kind === ts.SyntaxKind.ImportDeclaration ||
        node.kind === ts.SyntaxKind.ImportEqualsDeclaration ||
        node.kind === ts.SyntaxKind.ExportDeclaration
      ) {
        let moduleNameExpr: ts.Expression | undefined;
        if (node.kind === ts.SyntaxKind.ImportDeclaration) {
          moduleNameExpr = (node as ts.ImportDeclaration).moduleSpecifier;
        }
        else if (node.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
          const reference = (node as ts.ImportEqualsDeclaration).moduleReference;
          if (reference.kind === ts.SyntaxKind.ExternalModuleReference) {
            moduleNameExpr = reference.expression;
          }
        }
        else if (node.kind === ts.SyntaxKind.ExportDeclaration) {
          moduleNameExpr = (node as ts.ExportDeclaration).moduleSpecifier;
        }

        if (moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral) {
          const moduleSymbol = checker.getSymbolAtLocation(moduleNameExpr);
          if (moduleSymbol) {
            result.push(moduleSymbol.name.slice(1, -1));
          }
        }
      }
    });

    return result;
  }

  public static watch(contextPath: string,
                      rootFiles: string[],
                      options: ts.CompilerOptions,
                      useParentVisit: boolean,
                      doing: (program: ts.Program, changedInfos: { type: "change" | "check" | "unlink"; filePath: string }[]) => ts.Diagnostic[],
                      error: (message: string) => void,
                      start?: () => void,
                      finish?: () => void
  ): void {
    if (start) start();

    const depObj: { [key: string]: string[] } = {};
    const diagnostics: ts.Diagnostic[] = [];

    const program = ts.createProgram(rootFiles, options);
    const typeChecker = program.getTypeChecker();

    const sourceFiles = program.getSourceFiles();

    if (useParentVisit) {
      for (const sourceFile of sourceFiles) {
        if (!SdWorkerHelpers.getIsMyTsFile(sourceFile.fileName, contextPath)) {
          continue;
        }

        if (!Object.keys(depObj).includes(sourceFile.fileName)) {
          const deps = SdWorkerHelpers.getDependencies(sourceFile, typeChecker);
          depObj[sourceFile.fileName] = Array.from(deps);
        }
      }
    }

    diagnostics.pushRange(
      doing(
        program,
        sourceFiles
          .map(item => item.fileName)
          .distinct()
          .filter(item => SdWorkerHelpers.getIsMyTsFile(item, contextPath))
          .map(item => ({type: "change", filePath: item}))
      ).filter(item => item.file)
    );

    const messages = diagnostics.map(item => SdWorkerHelpers.diagnosticToMessage(item)).filterExists().distinct();
    if (messages.length > 0) {
      error(messages.join(os.EOL).trim());
    }

    if (finish) finish();

    const createWatcher = () => {
      const watchFiles = sourceFiles
        .filter(item => SdWorkerHelpers.getIsMyTsFile(item.fileName, contextPath))
        .map(item => item.fileName)
        .concat(
          Object.values(depObj)
            .mapMany(item => item)
            .mapMany(item => [
              item,
              item + ".ts",
              item + ".js",
              item + ".json",
              item + ".d.ts"
            ])
        )
        .distinct()
        .filter(item => fs.pathExistsSync(item));

      let watcher: chokidar.FSWatcher;
      FileWatcher.watch(watchFiles, ["add", "change", "unlink"], changedFiles => {
        watcher.close();

        if (start) start();

        const watchedProgram = ts.createProgram(rootFiles, options);
        const watchedTypeChecker = watchedProgram.getTypeChecker();

        const changedInfos = changedFiles
          .filter(item => SdWorkerHelpers.getIsMyTsFile(item.filePath, contextPath))
          .map(item => ({
            type: (item.type === "unlink" ? "unlink" : "change") as "change" | "check" | "unlink",
            filePath: item.filePath.replace(/\\/g, "/")
          }));

        if (useParentVisit) {
          for (const changedFile of changedFiles) {
            const filePath = changedFile.filePath.replace(/\\/g, "/");

            if (SdWorkerHelpers.getIsMyTsFile(filePath, contextPath)) {
              if (changedFile.type === "unlink") {
                delete depObj[filePath];
              }
              else {
                const sourceFile = watchedProgram.getSourceFile(filePath);
                if (!sourceFile) {
                  continue;
                }

                const deps = SdWorkerHelpers.getDependencies(sourceFile, watchedTypeChecker);
                depObj[sourceFile.fileName] = Array.from(deps);
              }
            }

            for (const depObjKey of Object.keys(depObj)) {
              if (!depObj[depObjKey].some(item =>
                filePath === item ||
                filePath === item + ".ts" ||
                filePath === item + ".js" ||
                filePath === item + ".json" ||
                filePath === item + ".d.ts"
              )) {
                continue;
              }

              if (!SdWorkerHelpers.getIsMyTsFile(depObjKey, contextPath)) {
                continue;
              }

              const parentSourceFile = watchedProgram.getSourceFile(depObjKey);
              if (!parentSourceFile) {
                continue;
              }

              if (!changedInfos.some(item => (item.type === "change" || item.type === "check") && item.filePath === depObjKey)) {
                changedInfos.push({
                  type: "check",
                  filePath: depObjKey
                });
              }
            }
          }
        }

        diagnostics.remove(diag => changedInfos.some(item => path.resolve(item.filePath) === path.resolve(diag.file!.fileName)));

        diagnostics.pushRange(doing(watchedProgram, changedInfos).filter(item => item.file));

        const watchMessages = diagnostics.map(item => SdWorkerHelpers.diagnosticToMessage(item)).filterExists().distinct();
        if (watchMessages.length > 0) {
          error(watchMessages.join(os.EOL).trim());
        }

        createWatcher();

        if (finish) finish();
      }).then(w => {
        watcher = w;
      }).catch(err => {
        error(err);
      });
    };

    createWatcher();
  }
}
