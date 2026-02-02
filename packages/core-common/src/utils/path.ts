/**
 * 경로 유틸리티 함수
 * Node.js path 모듈 대체용 (브라우저 환경 지원)
 *
 * @note 이 유틸리티는 POSIX 스타일 경로(슬래시 `/`)만 지원합니다.
 *       Windows 백슬래시(`\`) 경로는 지원하지 않습니다.
 *       브라우저 환경 및 Capacitor 플러그인용으로 설계되었습니다.
 */

/**
 * 경로 조합 (path.join 대체)
 * @note POSIX 스타일 경로만 지원 (슬래시 `/`)
 */
export function pathJoin(...segments: string[]): string {
  return segments
    .map((s, i) => (i === 0 ? s.replace(/\/+$/, "") : s.replace(/^\/+|\/+$/g, "")))
    .filter(Boolean)
    .join("/");
}

/**
 * 파일명 추출 (path.basename 대체)
 */
export function pathBasename(filePath: string, ext?: string): string {
  const name = filePath.split("/").pop() ?? "";
  if (ext != null && ext !== "" && name.endsWith(ext)) {
    return name.slice(0, -ext.length);
  }
  return name;
}

/**
 * 확장자 추출 (path.extname 대체)
 * @note 숨김 파일(예: `.gitignore`)은 빈 문자열을 반환합니다 (Node.js path.extname과 동일)
 */
export function pathExtname(filePath: string): string {
  const name = filePath.split("/").pop() ?? "";
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(dotIndex) : "";
}
