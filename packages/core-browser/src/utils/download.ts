import sanitize from "sanitize-filename";

/**
 * Blob을 파일로 다운로드
 *
 * @param blob - 다운로드할 Blob 객체
 * @param fileName - 저장할 파일명 (파일시스템 금지 문자·예약어는 자동 제거)
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = sanitize(fileName).replace(/[[\]]/g, "") || "download";
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
