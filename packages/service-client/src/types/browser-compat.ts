/**
 * Cross-environment compatible types for browser globals.
 * DOM-only 타입(FileList, BlobPart)을 대체하여
 * Node.js / browser 양쪽 환경에서 typecheck가 통과하도록 한다.
 */

/** Blob constructor가 허용하는 데이터 타입 (DOM BlobPart 대체) */
export type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string;

/**
 * File 컬렉션 인터페이스 (DOM FileList 대체).
 * 브라우저 FileList와 구조적으로 호환됨.
 */
export interface FileCollection {
  readonly length: number;
  item(index: number): File | null;
  [index: number]: File;
  [Symbol.iterator](): IterableIterator<File>;
}

/** Web Worker 최소 인터페이스 (DOM lib 없이도 타입체크 통과용) */
export interface BrowserWorker {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  postMessage(message: unknown, transfer?: unknown[]): void;
  terminate(): void;
}

/** DOM Worker API 지원 여부 확인 (browser 환경) */
export function isBrowserWorkerSupported(): boolean {
  return "Worker" in globalThis;
}

/** Node.js worker_threads 지원 여부 확인 */
export function isNodeWorkerSupported(): boolean {
  const proc = (globalThis as Record<string, unknown>)["process"] as
    | { versions?: { node?: string } }
    | undefined;
  return proc?.versions?.node != null;
}

/** Worker 오프로딩 지원 여부 (browser DOM Worker 또는 Node.js worker_threads) */
export function isWorkerSupported(): boolean {
  return isBrowserWorkerSupported() || isNodeWorkerSupported();
}

