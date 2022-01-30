/// <reference types="node" />
import child_process from "child_process";
export declare class SdProcess {
    static execAsync(cmd: string, opts?: child_process.ExecOptions): Promise<string>;
}
