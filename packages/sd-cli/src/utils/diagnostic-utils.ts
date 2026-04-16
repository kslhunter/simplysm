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
 * ts.Diagnostic 배열을 중복 제거 후 컬러 컨텍스트 포맷으로 변환한다.
 * 빈 배열이면 빈 문자열을 반환한다.
 */
export function formatDiagnosticsOutput(diagnostics: ts.Diagnostic[], cwd: string): string {
  if (diagnostics.length === 0) return "";
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => cwd,
    getNewLine: () => ts.sys.newLine,
  };
  const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(diagnostics);
  return ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
}

/**
 * 진단 에러를 TypeScript 네이티브 컬러+코드 컨텍스트 포맷으로 변환한다.
 */
export function formatDiagnosticError(diagnostic: ts.Diagnostic, cwd: string): string {
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => cwd,
    getNewLine: () => ts.sys.newLine,
  };
  return ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost).trimEnd();
}
