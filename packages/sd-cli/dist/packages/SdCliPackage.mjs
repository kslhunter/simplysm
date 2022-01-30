import path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdCliTsLibBuilder } from "../builder/SdCliTsLibBuilder";
import { SdCliJsLibBuilder } from "../builder/SdCliJsLibBuilder";
export class SdCliPackage extends EventEmitter {
    constructor(_workspaceRootPath, _rootPath, _config) {
        super();
        this._workspaceRootPath = _workspaceRootPath;
        this._rootPath = _rootPath;
        this._config = _config;
        const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
        this._npmConfig = FsUtil.readJson(npmConfigFilePath);
    }
    get name() {
        return this._npmConfig.name;
    }
    get allDependencies() {
        return [
            ...Object.keys(this._npmConfig.dependencies ?? {}),
            ...Object.keys(this._npmConfig.optionalDependencies ?? {}),
            ...Object.keys(this._npmConfig.devDependencies ?? {}),
            ...Object.keys(this._npmConfig.peerDependencies ?? {})
        ].distinct();
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    async watchAsync() {
        const isTs = FsUtil.exists(path.resolve(this._rootPath, "tsconfig.json"));
        if (isTs) {
            await this._genBuildTsconfigAsync();
        }
        const isAngular = isTs && this.allDependencies.includes("@angular/core");
        const builder = isTs ? new SdCliTsLibBuilder(this._rootPath, isAngular) : new SdCliJsLibBuilder(this._rootPath);
        await builder
            .on("change", () => {
            this.emit("change");
        })
            .on("complete", (results) => {
            this.emit("complete", results);
        })
            .watchAsync();
    }
    async buildAsync() {
        const isTs = FsUtil.exists(path.resolve(this._rootPath, "tsconfig.json"));
        if (isTs) {
            await this._genBuildTsconfigAsync();
        }
        const isAngular = isTs && this.allDependencies.includes("@angular/core");
        const builder = isTs ? new SdCliTsLibBuilder(this._rootPath, isAngular) : new SdCliJsLibBuilder(this._rootPath);
        return await builder.buildAsync();
    }
    async _genBuildTsconfigAsync() {
        const baseTsconfigFilePath = path.resolve(this._rootPath, "tsconfig.json");
        const baseTsconfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);
        const buildTsconfig = ObjectUtil.clone(baseTsconfig);
        buildTsconfig.compilerOptions = buildTsconfig.compilerOptions ?? {};
        delete buildTsconfig.compilerOptions.baseUrl;
        delete buildTsconfig.compilerOptions.paths;
        const buildTsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
        await FsUtil.writeJsonAsync(buildTsconfigFilePath, buildTsconfig, { space: 2 });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RDbGlQYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3BhY2thZ2VzL1NkQ2xpUGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDdEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWpFLE1BQU0sT0FBTyxZQUFhLFNBQVEsWUFBWTtJQWdCNUMsWUFBb0Msa0JBQTBCLEVBQzFCLFNBQWlCLEVBQ2pCLE9BQTRCO1FBQzlELEtBQUssRUFBRSxDQUFDO1FBSDBCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBUTtRQUMxQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLFlBQU8sR0FBUCxPQUFPLENBQXFCO1FBRzlELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFwQkQsSUFBVyxJQUFJO1FBQ2IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBVyxlQUFlO1FBQ3hCLE9BQU87WUFDTCxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDO1lBQ2xELEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJ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