import { createSdWorker, type SdWorkerType } from "../../../src";

export interface TestWorkerType extends SdWorkerType {
  methods: {
    add: { params: [number, number]; returnType: number };
    echo: { params: [string]; returnType: string };
    throwError: { params: []; returnType: void };
  };
  events: {
    progress: number;
  };
}

const sender = createSdWorker<TestWorkerType>({
  add: (a, b) => {
    sender.send("progress", 50);
    return a + b;
  },
  echo: (message) => {
    return `Echo: ${message}`;
  },
  throwError: () => {
    throw new Error("Intentional error");
  },
});
