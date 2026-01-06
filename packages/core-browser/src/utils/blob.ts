/**
 * Blob을 파일로 다운로드
 * @param blob 다운로드할 Blob 객체
 * @param fileName 저장할 파일명
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
