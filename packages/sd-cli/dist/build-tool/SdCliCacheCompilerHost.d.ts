import ts from "typescript";
export declare class SdCliCacheCompilerHost {
    static create(parsedTsconfig: ts.ParsedCommandLine, moduleResolutionCache: ts.ModuleResolutionCache, sourceFileCache: Map<string, IFileCache>, outputFileCache: Map<string, string>): ts.CompilerHost;
}
interface IFileCache {
    exists?: boolean;
    sourceFile?: ts.SourceFile;
    content?: string;
}
export {};
