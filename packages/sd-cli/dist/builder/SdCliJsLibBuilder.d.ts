/// <reference types="node" />
import { ISdCliPackageBuildResult } from "../commons";
import { EventEmitter } from "events";
export declare class SdCliJsLibBuilder extends EventEmitter {
    private readonly _rootPath;
    private readonly _logger;
    private readonly _linter;
    constructor(_rootPath: string);
    on(event: "change", listener: () => void): this;
    on(event: "complete", listener: (results: ISdCliPackageBuildResult[]) => void): this;
    watchAsync(): Promise<void>;
    buildAsync(): Promise<ISdCliPackageBuildResult[]>;
    private getRelatedPathsAsync;
}
