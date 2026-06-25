import { path, type Bytes } from "@simplysm/core-common";
import type { ServiceUploadResult } from "@simplysm/service-common";
import type { BlobInput, FileCollection } from "../types/browser-compat";

export interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileCollection | { name: string; data: BlobInput }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}

export function createFileClient(hostUrl: string, clientName: string): FileClient {
  async function download(relPath: string): Promise<Bytes> {
    // URL 생성
    const url = path.join(hostUrl, relPath);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`다운로드 실패: ${res.status} ${res.statusText}`);
    }

    // ArrayBuffer -> Uint8Array
    return new Uint8Array(await res.arrayBuffer());
  }

  async function upload(
    files: File[] | FileCollection | { name: string; data: BlobInput }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]> {
    const formData = new FormData();
    const fileArr = Array.isArray(files) ? files : Array.from(files);

    for (const file of fileArr) {
      if ("data" in file) {
        // 커스텀 객체 ({ name, data })
        const blob = file.data instanceof Blob ? file.data : new Blob([file.data]);
        formData.append("files", blob, file.name);
      } else {
        // 브라우저 File 객체
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
      throw new Error(`업로드 실패: ${res.statusText}`);
    }

    return (await res.json()) as ServiceUploadResult[];
  }

  return {
    download,
    upload,
  };
}
