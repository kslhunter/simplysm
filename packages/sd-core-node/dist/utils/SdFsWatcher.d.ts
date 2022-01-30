export declare class SdFsWatcher {
    private readonly _watcher;
    private constructor();
    static watch(paths: string[]): SdFsWatcher;
    onChange(cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>): void;
    add(paths: string[]): void;
}
export declare type TSdFsWatcherEvent = "change" | "unlink" | "add" | "unlinkDir" | "addDir";
export interface ISdFsWatcherChangeInfo {
    event: TSdFsWatcherEvent;
    path: string;
}
