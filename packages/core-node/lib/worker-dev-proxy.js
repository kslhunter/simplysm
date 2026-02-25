import { tsImport } from "tsx/esm/api";
import { pathToFileURL } from "url";

// Assume argv[2] contains the actual worker file path
const workerFile = process.argv[2];
if (!workerFile) {
  throw new Error("Worker file path is required as argument!");
}

// If file:// URL is already passed, use it as-is; otherwise convert
const workerFileUrl = workerFile.startsWith("file://")
  ? workerFile
  : pathToFileURL(workerFile).href;
await tsImport(workerFileUrl, import.meta.url);
