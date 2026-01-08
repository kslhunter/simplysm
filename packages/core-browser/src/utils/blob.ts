export namespace BlobUtils {
  /**
   * Blob을 파일로 다운로드
   */
  export function download(blob: Blob, fileName: string): void {
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
}
