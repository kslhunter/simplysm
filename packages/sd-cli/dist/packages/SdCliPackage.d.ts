/// <reference types="node" />
import { ISdCliPackageBuildResult, TSdCliPackageConfig } from "../commons";
import { EventEmitter } from "events";
export declare class SdCliPackage extends EventEmitter {
    private readonly _workspaceRootPath;
    private readonly _rootPath;
    private readonly _config;
    private readonly _npmConfig;
    get name(): string;
    get allDependencies(): string[];
    constructor(_workspaceRootPath: string, _rootPath: string, _config: TSdCliPackageConfig);
    on(event: "change", listener: () => void): this;
    on(event: "complete", listener: (results: ISdCliPackageBuildResult[]) => void): this;
    setNewVersionAsync(newVersion: string, pkgNames: string[]): Promise<void>;
    watchAsync(): Promise<void>;
    buildAsync(): Promise<ISdCliPackageBuildResult[]>;
    publishAsync(): Promise<void>;
    private _genBuildTsconfigAsync;
}
