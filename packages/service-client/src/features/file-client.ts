import type { Bytes } from "@simplysm/core-common";
import type { ServiceUploadResult } from "@simplysm/service-common";

export interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileList | { name: string; data: BlobPart }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}

export function createFileClient(hostUrl: string, clientName: string): FileClient {
  async function download(relPath: string): Promise<Bytes> {
    // Build URL
    const url = `${hostUrl}${relPath.startsWith("/") ? "" : "/"}${relPath}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }

    // ArrayBuffer -> Uint8Array
    return new Uint8Array(await res.arrayBuffer());
  }

  async function upload(
    files: File[] | FileList | { name: string; data: BlobPart }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]> {
    const formData = new FormData();
    const fileList = files instanceof FileList ? Array.from(files) : files;

    for (const file of fileList) {
      if ("data" in file) {
        // Custom object ({ name, data })
        const blob = file.data instanceof Blob ? file.data : new Blob([file.data]);
        formData.append("files", blob, file.name);
      } else {
        // Browser File object
        formData.append("files", file, file.name);
      }
    }

    const res = await fetch(`${hostUrl}/upload`, {
      method: "POST",
      headers: {
        "x-sd-client-name": clientName,
        "Authorization": `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }

    return res.json();
  }

  return {
    download,
    upload,
  };
}
