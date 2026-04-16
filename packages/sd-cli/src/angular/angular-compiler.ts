import ts from "typescript";
import { pathx } from "@simplysm/core-node";

export interface EmitResult {
  filename: string;
  contents: string;
  /** emit의 원본 소스 파일 경로 */
  sourceFileName: string;
}

export interface EmitOptions {
  /** emit 대상 소스 디렉토리 필터 (지정 시 해당 디렉토리의 파일만 emit) */
  sourceFilter?: (fileName: string) => boolean;
  /** Angular transformers 외 추가 transformers */
  additionalTransformers?: {
    before?: ts.TransformerFactory<ts.SourceFile>[];
    after?: ts.TransformerFactory<ts.SourceFile>[];
  };
}

export class AngularSourceFileCache extends Map<string, ts.SourceFile> {
  readonly modifiedFiles = new Set<string>();

  invalidate(files: Iterable<string>): void {
    for (const file of files) {
      const normalized = pathx.posix(file);
      this.delete(normalized);
      this.modifiedFiles.add(normalized);
    }
  }
}

export function augmentHostWithCaching(
  host: ts.CompilerHost,
  cache: AngularSourceFileCache,
): void {
  const baseGetSourceFile = host.getSourceFile;
  host.getSourceFile = function (
    fileName: string,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean,
    ...rest: unknown[]
  ): ts.SourceFile | undefined {
    if (!shouldCreateNewSourceFile && cache.has(fileName)) {
      return cache.get(fileName);
    }
    const file = (baseGetSourceFile as Function).call(
      host,
      fileName,
      languageVersionOrOptions,
      onError,
      true,
      ...rest,
    ) as ts.SourceFile | undefined;
    if (file) {
      cache.set(fileName, file);
    }
    return file;
  };
}

