import ts from "typescript";
import { PathUtil } from "@simplysm/sd-core-node";
export class SdCliCacheCompilerHost {
    static create(parsedTsconfig, moduleResolutionCache, sourceFileCache, outputFileCache) {
        const compilerHost = ts.createIncrementalCompilerHost(parsedTsconfig.options);
        const cacheCompilerHost = { ...compilerHost };
        cacheCompilerHost.fileExists = (fileName) => {
            const cache = sourceFileCache.getOrCreate(PathUtil.posix(fileName), {});
            if (cache.exists === undefined) {
                cache.exists = compilerHost.fileExists.call(cacheCompilerHost, fileName);
            }
            return cache.exists;
        };
        cacheCompilerHost.getSourceFile = (fileName, languageVersion) => {
            const cache = sourceFileCache.getOrCreate(PathUtil.posix(fileName), {});
            if (!cache.sourceFile) {
                cache.sourceFile = compilerHost.getSourceFile.call(cacheCompilerHost, fileName, languageVersion);
            }
            return cache.sourceFile;
        };
        cacheCompilerHost.writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
            fileName = fileName.replace(/\.js(\.map)?$/, ".mjs$1");
            const writeCache = outputFileCache.get(PathUtil.posix(fileName));
            if (writeCache !== data) {
                outputFileCache.set(PathUtil.posix(fileName), data);
                compilerHost.writeFile.call(cacheCompilerHost, fileName, data, writeByteOrderMark, onError, sourceFiles);
            }
        };
        cacheCompilerHost.readFile = (fileName) => {
            const cache = sourceFileCache.getOrCreate(PathUtil.posix(fileName), {});
            if (cache.content === undefined) {
                cache.content = compilerHost.readFile.call(cacheCompilerHost, fileName);
            }
            return cache.content;
        };
        cacheCompilerHost.resolveModuleNames = (moduleNames, containingFile) => {
            return moduleNames.map((moduleName) => {
                return ts.resolveModuleName(moduleName, PathUtil.posix(containingFile), parsedTsconfig.options, compilerHost, moduleResolutionCache).resolvedModule;
            });
        };
        return cacheCompilerHost;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RDbGlDYWNoZUNvbXBpbGVySG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9idWlsZC10b29sL1NkQ2xpQ2FjaGVDb21waWxlckhvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVsRCxNQUFNLE9BQU8sc0JBQXNCO0lBQzFCLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBb0MsRUFDcEMscUJBQStDLEVBQy9DLGVBQXdDLEVBQ3hDLGVBQW9DO1FBQ3ZELE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUUsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFFOUMsaUJBQWlCLENBQUMsVUFBVSxHQUFHLENBQUMsUUFBZ0IsRUFBRSxFQUFFO1lBQ2xELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN4RSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUFFO2dCQUM5QixLQUFLLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzFFO1lBQ0QsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ3RCLENBQUMsQ0FBQztRQUVGLGlCQUFpQixDQUFDLGFBQWEsR0FBRyxDQUFDLFFBQWdCLEVBQUUsZUFBZ0MsRUFBRSxFQUFFO1lBQ3ZGLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRTtnQkFDckIsS0FBSyxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7YUFDbEc7WUFDRCxPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFDMUIsQ0FBQyxDQUFDO1FBRUYsaUJBQWlCLENBQUMsU0FBUyxHQUFHLENBQUMsUUFBZ0IsRUFDaEIsSUFBWSxFQUNaLGtCQUEyQixFQUMzQixPQUFtQyxFQUNuQyxXQUFzQyxFQUFFLEVBQUU7WUFDdkUsUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRXZELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQzthQUMxRztRQUNILENBQUMsQ0FBQztRQUVGLGlCQUFpQixDQUFDLFFBQVEsR0FBRyxDQUFDLFFBQWdCLEVBQUUsRUFBRTtZQUNoRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDeEUsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRTtnQkFDL0IsS0FBSyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN6RTtZQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUN2QixDQUFDLENBQUM7UUFFRixpQkFBaUIsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLFdBQXFCLEVBQUUsY0FBc0IsRUFBRSxFQUFFO1lBQ3ZGLE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO2dCQUNwQyxPQUFPLEVBQUUsQ0FBQyxpQkFBaUIsQ0FDekIsVUFBVSxFQUNWLFFBQVEsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQzlCLGNBQWMsQ0FBQyxPQUFPLEVBQ3RCLFlBQVksRUFDWixxQkFBcUIsQ0FDdEIsQ0FBQyxjQUFjLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7UUFFRixPQUFPLGlCQUFpQixDQUFDO0lBQzNCLENBQUM7Q0FDRiJ9