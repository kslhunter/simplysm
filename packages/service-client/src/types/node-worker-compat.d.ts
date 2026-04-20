// browser env typecheck에서 @types/node가 제외될 때 worker_threads 최소 타입 제공
// node env에서는 @types/node의 선언과 병합됨
declare module "worker_threads" {
  class Worker {
    constructor(filename: string | URL);
    on(event: "message", listener: (value: unknown) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    postMessage(value: unknown, transferList?: unknown[]): void;
    terminate(): Promise<number>;
  }

  const parentPort: {
    on(event: "message", listener: (value: unknown) => void): void;
    on(event: "error", listener: (err: Error) => void): void;
    postMessage(value: unknown, transferList?: unknown[]): void;
  } | null;
}

// import.meta.resolve — Node.js 20+ 표준 API
// browser env에서 @types/node 없이도 typecheck 통과용
interface ImportMeta {
  resolve(specifier: string): string;
}
