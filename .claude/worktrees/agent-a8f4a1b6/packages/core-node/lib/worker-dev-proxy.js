import { tsImport } from "tsx/esm/api";
import { pathToFileURL } from "url";

// argv[2]에 진짜 워커 파일 경로가 들어온다고 가정
const workerFile = process.argv[2];
if (!workerFile) {
  throw new Error("Worker file path is required as argument!");
}

// file:// URL이 이미 전달된 경우 그대로 사용, 일반 경로인 경우 변환
const workerFileUrl = workerFile.startsWith("file://")
  ? workerFile
  : pathToFileURL(workerFile).href;
await tsImport(workerFileUrl, import.meta.url);
