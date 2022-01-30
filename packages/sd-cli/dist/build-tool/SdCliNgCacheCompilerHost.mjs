import { PathUtil } from "@simplysm/sd-core-node";
import sass from "sass";
import { pathToFileURL, URL } from "url";
export class SdCliNgCacheCompilerHost {
    static wrap(compilerHost, sourceFileCache) {
        const cacheCompilerHost = { ...compilerHost };
        cacheCompilerHost["readResource"] = (fileName) => {
            const cache = sourceFileCache.getOrCreate(PathUtil.posix(fileName), {});
            if (cache.content === undefined) {
                cache.content = compilerHost.readFile.call(cacheCompilerHost, fileName);
            }
            return cache.content;
        };
        cacheCompilerHost["transformResource"] = async (data, context) => {
            if (context.resourceFile || context.type !== "style") {
                return null;
            }
            const cache = sourceFileCache.getOrCreate(PathUtil.posix(context.containingFile), {});
            if (cache.styleContent === undefined) {
                cache.styleContent = (await sass.compileStringAsync(data, {
                    url: new URL(context.containingFile + ".sd.scss"),
                    importer: {
                        findFileUrl: (url) => {
                            if (!url.startsWith("~"))
                                return undefined;
                            return new URL(url.substring(1), pathToFileURL("node_modules"));
                        }
                    }
                })).css.toString();
            }
            return { content: cache.styleContent };
        };
        return cacheCompilerHost;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RDbGlOZ0NhY2hlQ29tcGlsZXJIb3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2J1aWxkLXRvb2wvU2RDbGlOZ0NhY2hlQ29tcGlsZXJIb3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRCxPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxFQUFFLGFBQWEsRUFBRSxHQUFHLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFFekMsTUFBTSxPQUFPLHdCQUF3QjtJQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQTZCLEVBQzdCLGVBQXdDO1FBQ3pELE1BQU0saUJBQWlCLEdBQUcsRUFBRSxHQUFHLFlBQVksRUFBRSxDQUFDO1FBRTlDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBZ0IsRUFBRSxFQUFFO1lBQ3ZELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN4RSxJQUFJLEtBQUssQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFO2dCQUMvQixLQUFLLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3pFO1lBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQztRQUVGLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUMvRCxJQUFJLE9BQU8sQ0FBQyxZQUFZLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7Z0JBQ3BELE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3RGLElBQUksS0FBSyxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQ3BDLEtBQUssQ0FBQyxZQUFZLEdBQUcsQ0FDbkIsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFO29CQUNsQyxHQUFHLEVBQUUsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBRyxVQUFVLENBQUM7b0JBQ2pELFFBQVEsRUFBRTt3QkFDUixXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTs0QkFDbkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO2dDQUFFLE9BQU8sU0FBUyxDQUFDOzRCQUMzQyxPQUFPLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xFLENBQUM7cUJBQ0Y7aUJBQ0YsQ0FBQyxDQUNILENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQ2xCO1lBQ0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDekMsQ0FBQyxDQUFDO1FBRUYsT0FBTyxpQkFBaUIsQ0FBQztJQUMzQixDQUFDO0NBQ0YifQ==