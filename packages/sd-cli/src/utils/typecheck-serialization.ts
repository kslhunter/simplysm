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
 * SerializedDiagnostic을 ts.Diagnostic으로 복원
 * 실제 파일 내용을 읽어 formatDiagnosticsWithColorAndContext에서 소스 코드 컨텍스트가 표시되도록 함
 * @param serialized 직렬화된 진단 정보
 * @param fileCache 파일 내용 캐시 (동일 파일 중복 읽기 방지)
 * @returns 복원된 ts.Diagnostic 객체
 */
export function deserializeDiagnostic(
  serialized: SerializedDiagnostic,
  fileCache: Map<string, string>,
): ts.Diagnostic {
  let file: ts.SourceFile | undefined;
  if (serialized.file != null) {
    const fileName = serialized.file.fileName;

    // 캐시된 파일 내용 가져오기 (없으면 읽어서 캐시)
    // 파일이 삭제되었거나 접근 불가능한 경우 빈 내용으로 처리
    // (소스 코드 컨텍스트는 표시되지 않지만 진단 메시지는 정상 출력됨)
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
