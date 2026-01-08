import { tsImport } from "tsx/esm/api";

// argv[2]에 진짜 워커 파일 경로가 들어온다고 가정
const workerFile = process.argv[2];
if (!workerFile) {
  throw new Error("Worker file path is required as argument!");
}

await tsImport(workerFile, import.meta.url);
