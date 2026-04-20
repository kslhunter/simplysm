import ts from "typescript";
import { fsx } from "@simplysm/core-node";

/**
 * DiagnosticMessageChain을 worker 경계로 넘기기 위한 직렬화 구조.
 * (chain 구조를 그대로 보존하여 formatter가 원본 들여쓰기/순서대로 출력하게 함)
 */
export interface SerializedMessageChain {
  messageText: string;
  category: number;
  code: number;
  next?: SerializedMessageChain[];
}

/**
 * Worker로 전달할 수 있는 직렬화된 Diagnostic.
 * ts.Diagnostic의 모든 사용자 가시 필드(detail/relatedInformation/flag)를 보존한다.
 */
export interface SerializedDiagnostic {
  category: number;
  code: number;
  /** messageText는 chain(overload 에러 등)이거나 단순 문자열. chain이면 구조 그대로 보존 */
  messageText: string | SerializedMessageChain;
  file?: {
    fileName: string;
  };
  start?: number;
  length?: number;
  relatedInformation?: SerializedDiagnosticRelatedInformation[];
  /** true 또는 ts가 넘기는 (빈) 객체. formatter가 인식. */
  reportsUnnecessary?: boolean;
  reportsDeprecated?: boolean;
  source?: string;
}

/** ts.DiagnosticRelatedInformation에 대응. file/start/length와 messageText만 가진 축약 구조. */
export interface SerializedDiagnosticRelatedInformation {
  category: number;
  code: number;
  messageText: string | SerializedMessageChain;
  file?: { fileName: string };
  start?: number;
  length?: number;
}

function serializeMessageChain(chain: ts.DiagnosticMessageChain): SerializedMessageChain {
  return {
    messageText: chain.messageText,
    category: chain.category,
    code: chain.code,
    next: chain.next?.map(serializeMessageChain),
  };
}

function serializeMessageText(
  messageText: string | ts.DiagnosticMessageChain,
): string | SerializedMessageChain {
  if (typeof messageText === "string") return messageText;
  return serializeMessageChain(messageText);
}

/**
 * Diagnostic을 직렬화 가능한 형태로 변환한다.
 * (Worker 스레드 간 structured clone 통신을 위해 순환 참조/함수를 제거)
 * messageText chain, relatedInformation, reportsUnnecessary/Deprecated, source 등 모든 detail 보존.
 */
export function serializeDiagnostic(diagnostic: ts.Diagnostic): SerializedDiagnostic {
  return {
    category: diagnostic.category,
    code: diagnostic.code,
    messageText: serializeMessageText(diagnostic.messageText),
    file: diagnostic.file != null ? { fileName: diagnostic.file.fileName } : undefined,
    start: diagnostic.start,
    length: diagnostic.length,
    relatedInformation: diagnostic.relatedInformation?.map((ri) => ({
      category: ri.category,
      code: ri.code,
      messageText: serializeMessageText(ri.messageText),
      file: ri.file != null ? { fileName: ri.file.fileName } : undefined,
      start: ri.start,
      length: ri.length,
    })),
    reportsUnnecessary: diagnostic.reportsUnnecessary != null ? true : undefined,
    reportsDeprecated: diagnostic.reportsDeprecated != null ? true : undefined,
    source: diagnostic.source,
  };
}

/**
 * 파일명에서 TypeScript ScriptKind를 결정한다.
 */
function getScriptKind(fileName: string): ts.ScriptKind {
  if (fileName.endsWith(".js") || fileName.endsWith(".mjs") || fileName.endsWith(".cjs"))
    return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/**
 * SerializedDiagnostic을 ts.Diagnostic으로 복원한다.
 * formatDiagnosticsWithColorAndContext에서 소스 코드 컨텍스트가 표시되도록 실제 파일 내용을 읽는다.
 * @param serialized - 직렬화된 진단 정보
 * @param fileCache - 파일 내용 캐시 (같은 파일의 중복 읽기 방지)
 * @returns 복원된 ts.Diagnostic 객체
 */
function deserializeMessageChain(chain: SerializedMessageChain): ts.DiagnosticMessageChain {
  return {
    messageText: chain.messageText,
    category: chain.category,
    code: chain.code,
    next: chain.next?.map(deserializeMessageChain),
  };
}

function deserializeMessageText(
  messageText: string | SerializedMessageChain,
): string | ts.DiagnosticMessageChain {
  if (typeof messageText === "string") return messageText;
  return deserializeMessageChain(messageText);
}

function loadFile(fileName: string, fileCache: Map<string, string>): ts.SourceFile {
  if (!fileCache.has(fileName)) {
    fileCache.set(fileName, fsx.existsSync(fileName) ? fsx.readSync(fileName) : "");
  }
  const content = fileCache.get(fileName)!;
  const scriptKind = getScriptKind(fileName);
  return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, false, scriptKind);
}

export function deserializeDiagnostic(
  serialized: SerializedDiagnostic,
  fileCache: Map<string, string>,
): ts.Diagnostic {
  const file = serialized.file != null ? loadFile(serialized.file.fileName, fileCache) : undefined;

  const relatedInformation: ts.DiagnosticRelatedInformation[] | undefined =
    serialized.relatedInformation?.map((ri) => ({
      category: ri.category,
      code: ri.code,
      messageText: deserializeMessageText(ri.messageText),
      file: ri.file != null ? loadFile(ri.file.fileName, fileCache) : undefined,
      start: ri.start,
      length: ri.length,
    }));

  return {
    category: serialized.category,
    code: serialized.code,
    messageText: deserializeMessageText(serialized.messageText),
    file,
    start: serialized.start,
    length: serialized.length,
    relatedInformation,
    reportsUnnecessary: serialized.reportsUnnecessary === true ? {} : undefined,
    reportsDeprecated: serialized.reportsDeprecated === true ? {} : undefined,
    source: serialized.source,
  };
}
