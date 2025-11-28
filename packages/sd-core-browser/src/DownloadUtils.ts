export class DownloadUtils {
  static download(filename: string, content: Blob | BufferSource | string): void {
    const blob = content instanceof Blob ? content : new Blob([content]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);

    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
}
