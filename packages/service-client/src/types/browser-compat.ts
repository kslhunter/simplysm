/**
 * Cross-environment compatible types for browser globals.
 * DOM-only 타입(FileList, BlobPart, Worker, Transferable)을 대체하여
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

/**
 * Web Worker 인터페이스 (DOM Worker 대체).
 * 브라우저 Worker와 구조적으로 호환됨.
 */
export interface WorkerLike {
  onmessage: ((ev: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: unknown[]): void;
  terminate(): void;
}

/** Web Worker API 지원 여부 확인 */
export function isWorkerSupported(): boolean {
  return "Worker" in globalThis;
}

/** Web Worker 생성 (미지원 환경이면 undefined) */
export function createBrowserWorker(
  url: URL,
  options: { type: string },
): WorkerLike | undefined {
  if (!isWorkerSupported()) return undefined;
  const ctor = (globalThis as Record<string, unknown>)["Worker"] as new (
    url: URL,
    opts: { type: string },
  ) => WorkerLike;
  return new ctor(url, options);
}
