import { ISdServiceUploadResult } from "@simplysm/sd-service-common";

export class SdServiceFileClient {
  constructor(readonly hostUrl: string) {}

  async downloadAsync(relPath: string): Promise<Buffer> {
    // URL 구성
    const url = `${this.hostUrl}${relPath.startsWith("/") ? "" : "/"}${relPath}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }

    // ArrayBuffer -> Buffer
    return Buffer.from(await res.arrayBuffer());
  }

  async uploadAsync(
    files: File[] | FileList | { name: string; data: Blob | Buffer }[],
  ): Promise<ISdServiceUploadResult[]> {
    const formData = new FormData();
    const fileList = files instanceof FileList ? Array.from(files) : files;

    for (const file of fileList) {
      if ("data" in file) {
        // 커스텀 객체 ({ name, data })
        const blob = file.data instanceof Blob ? file.data : new Blob([file.data]);
        formData.append("files", blob, file.name);
      } else {
        // 브라우저 File 객체
        formData.append("files", file, file.name);
      }
    }

    const res = await fetch(`${this.hostUrl}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }

    return await res.json();
  }
}
