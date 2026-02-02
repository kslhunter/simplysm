import type { Bytes } from "@simplysm/core-common";
import type { ServiceUploadResult } from "@simplysm/service-common";

export class FileClient {
  constructor(
    private readonly _hostUrl: string,
    private readonly _clientName: string,
  ) {}

  async download(relPath: string): Promise<Bytes> {
    // URL 구성
    const url = `${this._hostUrl}${relPath.startsWith("/") ? "" : "/"}${relPath}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }

    // ArrayBuffer -> Uint8Array
    return new Uint8Array(await res.arrayBuffer());
  }

  async upload(
    files: File[] | FileList | { name: string; data: BlobPart }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]> {
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

    const res = await fetch(`${this._hostUrl}/upload`, {
      method: "POST",
      headers: {
        "x-sd-client-name": this._clientName,
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }

    return res.json();
  }
}
