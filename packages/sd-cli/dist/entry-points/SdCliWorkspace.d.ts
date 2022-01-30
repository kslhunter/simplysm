export declare class SdCliWorkspace {
    private readonly _rootPath;
    private readonly _logger;
    private readonly _npmConfig;
    private readonly _config;
    constructor(_rootPath: string);
    watchAsync(): Promise<void>;
    buildAsync(): Promise<void>;
    private _buildPkgsAsync;
    publishAsync(opt: {
        noBuild: boolean;
    }): Promise<void>;
    private _upgradeVersionAsync;
    private _waitSecMessageAsync;
    private _getPackagesAsync;
    private _loggingResults;
}
