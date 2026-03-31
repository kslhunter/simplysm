import ts from "typescript";
import { pathx } from "@simplysm/core-node";

/**
 * 워크스페이스 스코프 진단 필터.
 * cwd 하위 파일만 포함하고, node_modules는 제외한다.
 * 파일 정보가 없는 진단(global diagnostic)은 포함한다.
 */
export function isWorkspaceDiagnostic(diagnostic: ts.Diagnostic, cwd: string): boolean {
  if (diagnostic.file == null) return true;

  const normalized = pathx.posix(diagnostic.file.fileName);
  const normalizedCwd = pathx.posix(cwd).replace(/\/$/, "");
  return normalized.startsWith(normalizedCwd + "/") && !normalized.includes("/node_modules/");
}

/**
 * 진단 에러를 "파일:줄:열: TS코드: 메시지" 형식으로 포맷한다.
 * 파일 정보가 없는 경우 "TS코드: 메시지" 형식으로 반환한다.
 */
export function formatDiagnosticError(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (diagnostic.file != null && diagnostic.start != null) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return `${diagnostic.file.fileName}:${line + 1}:${character + 1}: TS${diagnostic.code}: ${message}`;
  }
  return `TS${diagnostic.code}: ${message}`;
}
