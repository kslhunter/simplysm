import ts from "typescript";
import { PathUtil } from "@simplysm/sd-core-node";

export class SdCliCacheCompilerHost {
  public static create(parsedTsconfig: ts.ParsedCommandLine,
                       moduleResolutionCache: ts.ModuleResolutionCache,
                       sourceFileCache: Map<string, IFileCache>,
                       outputFileCache: Map<string, string>): ts.CompilerHost {
    const compilerHost = ts.createIncrementalCompilerHost(parsedTsconfig.options);

    const cacheCompilerHost = { ...compilerHost };

    cacheCompilerHost.fileExists = (fileName: string) => {
      const cache = sourceFileCache.getOrCreate(PathUtil.posix(fileName), {});
      if (cache.exists === undefined) {
        cache.exists = compilerHost.fileExists.call(cacheCompilerHost, fileName);
      }
      return cache.exists;
    };

    cacheCompilerHost.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget) => {
      const cache = sourceFileCache.getOrCreate(PathUtil.posix(fileName), {});
      if (!cache.sourceFile) {
        cache.sourceFile = compilerHost.getSourceFile.call(cacheCompilerHost, fileName, languageVersion);
      }
      return cache.sourceFile;
    };

    cacheCompilerHost.writeFile = (fileName: string,
                                   data: string,
                                   writeByteOrderMark: boolean,
                                   onError?: (message: string) => void,
                                   sourceFiles?: readonly ts.SourceFile[]) => {
      // fileName = fileName.replace(/\.js(\.map)?$/, ".mjs$1");

      const writeCache = outputFileCache.get(PathUtil.posix(fileName));
      if (writeCache !== data) {
        outputFileCache.set(PathUtil.posix(fileName), data);
        compilerHost.writeFile.call(cacheCompilerHost, fileName, data, writeByteOrderMark, onError, sourceFiles);
      }
    };

    cacheCompilerHost.readFile = (fileName: string) => {
      const cache = sourceFileCache.getOrCreate(PathUtil.posix(fileName), {});
      if (cache.content === undefined) {
        cache.content = compilerHost.readFile.call(cacheCompilerHost, fileName);
      }
      return cache.content;
    };

    cacheCompilerHost.resolveModuleNames = (moduleNames: string[], containingFile: string) => {
      return moduleNames.map((moduleName) => {
        return ts.resolveModuleName(
          moduleName,
          PathUtil.posix(containingFile),
          parsedTsconfig.options,
          compilerHost,
          moduleResolutionCache
        ).resolvedModule;
      });
    };

    return cacheCompilerHost;
  }
}

interface IFileCache {
  exists?: boolean;
  sourceFile?: ts.SourceFile;
  content?: string;
}
