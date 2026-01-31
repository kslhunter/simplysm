import { tsImport } from "tsx/esm/api";
import { pathToFileURL } from "url";

// argv[2]에 진짜 워커 파일 경로가 들어온다고 가정
const workerFile = process.argv[2];
if (!workerFile) {
  throw new Error("Worker file path is required as argument!");
}

// Windows에서 절대 경로는 file:// URL로 변환해야 ESM 로더가 처리 가능
const workerFileUrl = pathToFileURL(workerFile).href;
await tsImport(workerFileUrl, import.meta.url);
