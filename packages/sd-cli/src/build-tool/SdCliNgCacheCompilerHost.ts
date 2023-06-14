import ts from "typescript";
import { PathUtil } from "@simplysm/sd-core-node";
import * as sass from "sass";
import { fileURLToPath, pathToFileURL, URL } from "url";

export class SdCliNgCacheCompilerHost {
  public static wrap(compilerHost: ts.CompilerHost,
                     sourceFileCache: Map<string, IFileCache>): ts.CompilerHost {
    const cacheCompilerHost = { ...compilerHost };

    cacheCompilerHost["readResource"] = (fileName: string) => {
      const cache = sourceFileCache.getOrCreate(PathUtil.posix(fileName), {});
      if (cache.content === undefined) {
        cache.content = compilerHost.readFile.call(cacheCompilerHost, fileName);
      }
      return cache.content;
    };

    cacheCompilerHost["transformResource"] = async (data, context) => {
      if (context.resourceFile != null || context.type !== "style") {
        return null;
      }

      const cache = sourceFileCache.getOrCreate(PathUtil.posix(context.containingFile), {});
      if (cache.styleContent === undefined) {
        const scssResult = await sass.compileStringAsync(data, {
          url: new URL((context.containingFile as string) + ".sd.scss"),
          importer: {
            findFileUrl: (url) => {
              if (!url.startsWith("~")) return pathToFileURL(url);
              return new URL(url.substring(1), pathToFileURL("node_modules"));
            }
          }
        });

        cache.styleContent = scssResult.css.toString();

        const deps = scssResult.loadedUrls.slice(1).map((item) => PathUtil.posix(fileURLToPath(item.href)));
        for (const dep of deps) {
          const depCache = sourceFileCache.getOrCreate(dep, {});
          depCache.importerSet = depCache.importerSet ?? new Set<string>();
          depCache.importerSet.add(PathUtil.posix(context.containingFile));
        }
      }
      return { content: cache.styleContent };
    };

    return cacheCompilerHost;
  }
}

interface IFileCache {
  exists?: boolean;
  sourceFile?: ts.SourceFile;
  content?: string;
  styleContent?: string;
  importerSet?: Set<string>;
}
