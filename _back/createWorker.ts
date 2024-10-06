import Piscina from "piscina";
import path from "path";
import { fileURLToPath } from "url";
// import path from "path";
// import { fileURLToPath } from "url";

export function createWorker(
  filePath: string,
  additionalOptions?: Partial<Omit<NonNullable<ConstructorParameters<typeof Piscina>[0]>, "filename">>,
): Piscina {
  const defaultOptions: ConstructorParameters<typeof Piscina>[0] = {
    minThreads: 1,
    idleTimeout: Infinity,
    recordTiming: false,
    env: process.env
  };

  if (filePath.endsWith(".ts")) {
    return new Piscina({
      ...defaultOptions,
      filename: path.resolve(import.meta.dirname, "../../lib/dev-worker.cjs"),
      ...additionalOptions,
      workerData: {
        __file__: fileURLToPath(filePath),
        ...additionalOptions?.workerData,
      },
    });
  } else {
    return new Piscina({
      ...defaultOptions,
      filename: filePath,
      ...additionalOptions,
    });
  }
}
