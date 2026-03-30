/**
 * 경로 유틸리티 함수
 * Node.js path 모듈 대체 (브라우저 환경 지원)
 *
 * @note 이 유틸리티는 POSIX 스타일 경로(슬래시 `/`)만 지원.
 *       Windows 백슬래시(`\`) 경로는 지원하지 않음.
 *       브라우저 환경 및 Capacitor 플러그인용으로 설계됨.
 */

/**
 * 경로 결합 (path.join 대체)
 * @note POSIX 스타일 경로(슬래시 `/`)만 지원
 */
export function join(...segments: string[]): string {
  return segments
    .map((s, i) => (i === 0 ? s.replace(/\/+$/, "") : s.replace(/^\/+|\/+$/g, "")))
    .filter(Boolean)
    .join("/");
}

/**
 * 파일명 추출 (path.basename 대체)
 */
export function basename(filePath: string, ext?: string): string {
  const name = filePath.split("/").pop() ?? "";
  if (ext != null && ext !== "" && name.endsWith(ext)) {
    return name.slice(0, -ext.length);
  }
  return name;
}

/**
 * 파일 확장자 추출 (path.extname 대체)
 * @note 숨김 파일(예: `.gitignore`)은 빈 문자열 반환 (Node.js path.extname과 동일)
 */
export function extname(filePath: string): string {
  const name = filePath.split("/").pop() ?? "";
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(dotIndex) : "";
}
