/// <reference types="node" />
import { ISdCliPackageBuildResult } from "../commons";
import { EventEmitter } from "events";
export declare class SdCliTsLibBuilder extends EventEmitter {
    private readonly _rootPath;
    private readonly _isAngular;
    private readonly _logger;
    private _moduleResolutionCache?;
    private readonly _linter;
    private readonly _fileCache;
    private readonly _writeFileCache;
    private _program?;
    private _ngProgram?;
    private _builder?;
    constructor(_rootPath: any, _isAngular: boolean);
    on(event: "change", listener: () => void): this;
    on(event: "complete", listener: (results: ISdCliPackageBuildResult[]) => void): this;
    watchAsync(): Promise<void>;
    buildAsync(): Promise<ISdCliPackageBuildResult[]>;
    private getAllRelatedPathsAsync;
    private _runBuilderAsync;
    private _createSdBuildPack;
    private _createProgram;
    private _configProgramSourceFileVersions;
    private _createCacheCompilerHost;
    private _getParsedTsconfigAsync;
}
