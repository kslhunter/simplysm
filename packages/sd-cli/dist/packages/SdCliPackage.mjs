import path from "path";
import { FsUtil, SdProcess } from "@simplysm/sd-core-node";
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
    async setNewVersionAsync(newVersion, pkgNames) {
        this._npmConfig.version = newVersion;
        const updateDepVersion = (deps) => {
            if (!deps)
                return;
            for (const depName of Object.keys(deps)) {
                if (pkgNames.includes(depName)) {
                    deps[depName] = newVersion;
                }
            }
        };
        updateDepVersion(this._npmConfig.dependencies);
        updateDepVersion(this._npmConfig.optionalDependencies);
        updateDepVersion(this._npmConfig.devDependencies);
        updateDepVersion(this._npmConfig.peerDependencies);
        const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
        await FsUtil.writeJsonAsync(npmConfigFilePath, this._npmConfig, { space: 2 });
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
    async publishAsync() {
        if (this._config.type === "library" && this._config.publish === "npm") {
            await SdProcess.execAsync("npm publish --access public", { cwd: this._rootPath });
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RDbGlQYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3BhY2thZ2VzL1NkQ2xpUGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVqRSxNQUFNLE9BQU8sWUFBYSxTQUFRLFlBQVk7SUFnQjVDLFlBQW9DLGtCQUEwQixFQUMxQixTQUFpQixFQUNqQixPQUE0QjtRQUM5RCxLQUFLLEVBQUUsQ0FBQztRQUgwQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVE7UUFDMUIsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixZQUFPLEdBQVAsT0FBTyxDQUFxQjtRQUc5RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBcEJELElBQVcsSUFBSTtRQUNiLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDOUIsQ0FBQztJQUVELElBQVcsZUFBZTtRQUN4QixPQUFPO1lBQ0wsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztZQUNsRCxHQUFHLE1BQU0sQ0FBQyxJ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