import ts from "typescript";
export declare class SdCliNgCacheCompilerHost {
    static wrap(compilerHost: ts.CompilerHost, sourceFileCache: Map<string, IFileCache>): ts.CompilerHost;
}
interface IFileCache {
    exists?: boolean;
    sourceFile?: ts.SourceFile;
    content?: string;
    styleContent?: string;
}
export {};
