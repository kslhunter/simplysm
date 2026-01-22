import { createSdWorker } from "../../../src";

interface TestWorkerEvents {
  progress: number;
}

const methods = {
  add: (a: number, b: number) => {
    sender.send("progress", 50);
    return a + b;
  },
  echo: (message: string) => `Echo: ${message}`,
  throwError: () => {
    throw new Error("Intentional error");
  },
  delay: async (ms: number) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return ms;
  },
  noReturn: () => {},
};

const sender = createSdWorker<typeof methods, TestWorkerEvents>(methods);

export default sender;
