import * as ts from "typescript";
import * as path from "path";
import * as vueCompiler from "vue-template-compiler";
import {MetadataCollector, ModuleMetadata} from "@angular/compiler-cli";
import {MetadataBundler} from "@angular/compiler-cli/src/metadata/bundler";
import * as fs from "fs-extra";

export class SdCompilerHostFactory {
  public static createWatchCompilerHost(
    packageName: string,
    framework: undefined | "vue" | "angular",
    rootFiles: string[],
    options: ts.CompilerOptions,
    contextPath: string,
    onStart: () => void,
    onDiagnostic: (diagnostic: ts.Diagnostic) => void,
    onFinish: () => void,
    onReadFile?: (filePath: string, content?: string) => void
  ): ts.WatchCompilerHostOfFilesAndCompilerOptions<ts.EmitAndSemanticDiagnosticsBuilderProgram> {

    const host = ts.createWatchCompilerHost(
      rootFiles,
      options,
      ts.sys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      diagnostic => {
        onDiagnostic(diagnostic);
      },
      diagnostic => {
        const messageText = diagnostic.messageText.toString();
        if (
          messageText.includes("Starting compilation in watch mode") ||
          messageText.includes("File change detected. Starting incremental compilation")
        ) {
          onStart();
        }
        else if (messageText.includes("Watching for file changes")) {
          if (framework === "angular") {
            const distPath = options.outDir || path.resolve(contextPath, "dist");
            SdCompilerHostFactory._emitMetadata(packageName, rootFiles[0], distPath);
          }

          onFinish();
        }
      }
    );

    if (framework === "vue") {
      const prevReadFile = host.readFile;
      host.readFile = (filePath, encoding) => {
        const content = prevReadFile(filePath, encoding);

        if (content && path.extname(filePath) === ".vue") {
          const resolved = SdCompilerHostFactory._resolveVueScriptBlock(content);
          return resolved.content;
        }

        return content;
      };

      host.resolveModuleNames = (moduleNames, containingFile) => {
        const resolvedModules: ts.ResolvedModule[] = [];

        for (const moduleName of moduleNames) {
          const resolvedModule = ts.resolveModuleName(
            moduleName,
            containingFile,
            options,
            {
              fileExists: fileName => {
                if (fileName.endsWith(".vue.ts")) {
                  return (
                    host.fileExists(fileName.slice(0, -3)) ||
                    host.fileExists(fileName)
                  );
                }
                else {
                  return host.fileExists(fileName);
                }
              },
              readFile: fileName => {
                if (fileName.endsWith(".vue.ts") && !host.fileExists(fileName)) {
                  return host.readFile(fileName.slice(0, -3));
                }
                else {
                  return host.readFile(fileName);
                }
              }
            }
          ).resolvedModule;

          if (resolvedModule) {
            if (resolvedModule.resolvedFileName.endsWith(".vue.ts") && !host.fileExists(resolvedModule.resolvedFileName)) {
              resolvedModule.resolvedFileName = resolvedModule.resolvedFileName.slice(0, -3);
            }
            resolvedModules.push(resolvedModule);
          }
          else {
            const absolutePath = SdCompilerHostFactory._resolveNonTsModuleName(
              moduleName,
              containingFile,
              contextPath,
              options
            );

            if (path.extname(moduleName) === ".vue") {
              resolvedModules.push({
                resolvedFileName: absolutePath,
                extension: ".ts"
              } as ts.ResolvedModuleFull);
            }
            else {
              resolvedModules.push({
                resolvedFileName: host.fileExists(absolutePath) ? "" : absolutePath,
                extension: ".ts"
              } as ts.ResolvedModuleFull);
            }
          }
        }

        return resolvedModules;
      };
    }

    if (onReadFile) {
      const prevReadFile1 = host.readFile;
      host.readFile = (filePath, encoding) => {
        const content = prevReadFile1(filePath, encoding);
        onReadFile(filePath, content);
        return prevReadFile1(filePath, encoding);
      };
    }

    return host;
  }

  public static createCompilerHost(
    packageName: string,
    framework: undefined | "vue" | "angular",
    rootFiles: string[],
    options: ts.CompilerOptions,
    contextPath: string
  ): ts.CompilerHost {
    const host = ts.createCompilerHost(options);

    if (framework === "angular") {
      const distPath = options.outDir || path.resolve(contextPath, "dist");
      SdCompilerHostFactory._emitMetadata(packageName, rootFiles[0], distPath);
    }

    return host;
  }

  private static _resolveNonTsModuleName(moduleName: string, containingFile: string, basedir: string, options: ts.CompilerOptions): string {
    const baseUrl = options.baseUrl ? options.baseUrl : basedir;
    const discardedSymbols = [".", "..", "/"];
    const wildcards: string[] = [];

    if (options.paths) {
      Object.keys(options.paths).forEach(key => {
        const pathSymbol = key[0];
        if (
          discardedSymbols.indexOf(pathSymbol) < 0 &&
          wildcards.indexOf(pathSymbol) < 0
        ) {
          wildcards.push(pathSymbol);
        }
      });
    }
    else {
      wildcards.push("@");
    }

    const isRelative = !path.isAbsolute(moduleName);
    let correctWildcard;

    wildcards.forEach(wildcard => {
      if (moduleName.substr(0, 2) === `${wildcard}/`) {
        correctWildcard = wildcard;
      }
    });

    let result = moduleName;
    if (correctWildcard) {
      const pattern = options.paths ? options.paths[`${correctWildcard}/*`] : undefined;
      const substitution = pattern ? options.paths![`${correctWildcard}/*`][0].replace("*", "") : "src";
      result = path.resolve(baseUrl, substitution, result.substr(2));
    }
    else if (isRelative) {
      result = path.resolve(path.dirname(containingFile), result);
    }
    return result;
  }

  private static _resolveVueScriptBlock(content: string): IResolvedVueScript {
    const script = vueCompiler.parseComponent(content, {pad: "space"}).script;

    if (!script) {
      return {
        scriptKind: ts.ScriptKind.JS,
        content:
          "/* tslint:disable */\n" +
          "export default {};\n"
      };
    }

    const scriptKind =
      script.lang === "ts" ? ts.ScriptKind.TS
        : script.lang === "tsx" ? ts.ScriptKind.TSX
        : script.lang === "jsx" ? ts.ScriptKind.JSX
          : ts.ScriptKind.JS;

    if (script.attrs.src) {
      const src = script.attrs.src.replace(/\.tsx?$/i, "");
      return {
        scriptKind,
        content:
          "/* tslint:disable */\n" +
          "// @ts-ignore\n" +
          `export { default } from '${src}';\n` +
          "// @ts-ignore\n" +
          `export * from '${src}';\n`
      };
    }

    const offset = content.slice(0, script.start).split(/\r?\n/g).length;
    const paddedContent = Array(offset).join("//\n") + script.content.slice(script.start);

    return {scriptKind, content: paddedContent};
  }

  private static _emitMetadata(packageName: string, rootFilePath: string, distPath: string): void {
    const metadataCollector = new MetadataCollector();
    const metadataBundler = new MetadataBundler(
      rootFilePath.replace(/\.ts$/, ""),
      packageName,
      {
        getMetadataFor: (moduleName: string): ModuleMetadata | undefined => {
          const sourceText = fs.readFileSync(moduleName + ".ts").toString();
          const sourceFile = ts.createSourceFile(moduleName + ".ts", sourceText, ts.ScriptTarget.Latest);
          return metadataCollector.getMetadata(sourceFile);
        }
      }
    );

    fs.mkdirsSync(distPath);
    fs.writeJsonSync(path.resolve(distPath, path.basename(rootFilePath, path.extname(rootFilePath)) + ".metadata.json"), metadataBundler.getMetadataBundle().metadata);
  }
}

interface IResolvedVueScript {
  scriptKind: ts.ScriptKind;
  content: string;
}