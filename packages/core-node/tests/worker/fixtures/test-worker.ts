import { createWorker } from "../../../src";

interface TestWorkerEvents extends Record<string, unknown> {
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
  logMessage: (message: string) => {
    console.log(message);
    return "logged";
  },
  crash: () => {
    // Exit immediately
    setImmediate(() => process.exit(1));
    return "crashing...";
  },
  getEnv: (key: string) => process.env[key],
};

const sender = createWorker<typeof methods, TestWorkerEvents>(methods);

export default sender;
