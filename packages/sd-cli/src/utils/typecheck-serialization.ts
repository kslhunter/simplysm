import ts from "typescript";
import { fsExistsSync, fsReadSync } from "@simplysm/core-node";

/**
 * Serialized Diagnostic that can be passed to Worker
 */
export interface SerializedDiagnostic {
  category: number;
  code: number;
  messageText: string;
  file?: {
    fileName: string;
  };
  start?: number;
  length?: number;
}

/**
 * Convert Diagnostic to serializable form
 * (remove circular references/functions for structured clone communication between Worker threads)
 */
export function serializeDiagnostic(diagnostic: ts.Diagnostic): SerializedDiagnostic {
  // If DiagnosticMessageChain, flatten entire chain to preserve all context info
  const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

  return {
    category: diagnostic.category,
    code: diagnostic.code,
    messageText,
    file: diagnostic.file
      ? {
          fileName: diagnostic.file.fileName,
        }
      : undefined,
    start: diagnostic.start,
    length: diagnostic.length,
  };
}

/**
 * Determine TypeScript ScriptKind from filename
 */
function getScriptKind(fileName: string): ts.ScriptKind {
  if (fileName.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (fileName.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (fileName.endsWith(".js") || fileName.endsWith(".mjs") || fileName.endsWith(".cjs"))
    return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/**
 * Restore SerializedDiagnostic to ts.Diagnostic
 * Reads actual file contents so source code context is displayed in formatDiagnosticsWithColorAndContext
 * @param serialized - Serialized diagnostic information
 * @param fileCache - File content cache (prevent duplicate reads of same file)
 * @returns Restored ts.Diagnostic object
 */
export function deserializeDiagnostic(
  serialized: SerializedDiagnostic,
  fileCache: Map<string, string>,
): ts.Diagnostic {
  let file: ts.SourceFile | undefined;
  if (serialized.file != null) {
    const fileName = serialized.file.fileName;

    // Get cached file content (read and cache if not present)
    // If file was deleted or inaccessible, treat as empty content
    // (source code context won't be displayed but diagnostic message is shown normally)
    if (!fileCache.has(fileName)) {
      fileCache.set(fileName, fsExistsSync(fileName) ? fsReadSync(fileName) : "");
    }
    const content = fileCache.get(fileName)!;

    const scriptKind = getScriptKind(fileName);
    file = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, false, scriptKind);
  }

  return {
    category: serialized.category,
    code: serialized.code,
    messageText: serialized.messageText,
    file,
    start: serialized.start,
    length: serialized.length,
  };
}
