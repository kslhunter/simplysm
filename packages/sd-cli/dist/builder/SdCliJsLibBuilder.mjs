import { EventEmitter } from "events";
import { FsUtil, Logger, SdFsWatcher } from "@simplysm/sd-core-node";
import * as path from "path";
import { SdCliPackageLinter } from "../build-tool/SdCliPackageLinter";
export class SdCliJsLibBuilder extends EventEmitter {
    constructor(_rootPath) {
        super();
        this._rootPath = _rootPath;
        this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);
        this._linter = new SdCliPackageLinter(this._rootPath);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    async watchAsync() {
        this.emit("change");
        const relatedPaths = await this.getRelatedPathsAsync();
        const watcher = SdFsWatcher.watch(relatedPaths);
        watcher.onChange(async (changeInfos) => {
            const changeFilePaths = changeInfos.filter((item) => ["add", "change", "unlink"].includes(item.event)).map((item) => item.path);
            if (changeFilePaths.length === 0)
                return;
            this._logger.debug("파일 변경 감지", changeInfos);
            this.emit("change");
            const watchBuildResults = await this._linter.lintAsync(changeFilePaths);
            const watchRelatedPaths = await this.getRelatedPathsAsync();
            watcher.add(watchRelatedPaths);
            this.emit("complete", watchBuildResults);
        });
        // 빌드
        const buildResults = await this._linter.lintAsync(relatedPaths);
        this.emit("complete", buildResults);
    }
    async buildAsync() {
        const relatedPaths = await this.getRelatedPathsAsync();
        return await this._linter.lintAsync(relatedPaths);
    }
    async getRelatedPathsAsync() {
        const mySourceGlobPath = path.resolve(this._rootPath, "**", "+(*.js|*.cjs|*.mjs|*.ts)");
        const mySourceFilePaths = await FsUtil.globAsync(mySourceGlobPath, {
            ignore: [
                "**/node_modules/**",
                "**/dist/**",
                "**/.*/**"
            ]
        });
        return [...mySourceFilePaths, path.resolve(this._rootPath, ".eslintrc.cjs")].distinct();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RDbGlKc0xpYkJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYnVpbGRlci9TZENsaUpzTGliQnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3JFLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXRFLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxZQUFZO0lBS2pELFlBQW9DLFNBQWlCO1FBQ25ELEtBQUssRUFBRSxDQUFDO1FBRDBCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFKcEMsWUFBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQU1uRixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFJZSxFQUFFLENBQUMsS0FBc0IsRUFBRSxRQUFrQztRQUMzRSxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBVTtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXBCLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDdkQsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNoRCxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsRUFBRTtZQUNyQyxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hJLElBQUcsZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDO2dCQUFFLE9BQU87WUFFeEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFcEIsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRXhFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMzQyxDQUFDLENBQUMsQ0FBQztRQUVILEtBQUs7UUFDTCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRWhFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBVTtRQUNyQixNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQ3ZELE9BQU8sTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQjtRQUNoQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUN4RixNQUFNLGlCQUFpQixHQUFHLE1BQU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNqRSxNQUFNLEVBQUU7Z0JBQ04sb0JBQW9CO2dCQUNwQixZQUFZO2dCQUNaLFVBQVU7YUFDWDtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxHQUFHLGlCQUFpQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzFGLENBQUM7Q0FDRiJ9