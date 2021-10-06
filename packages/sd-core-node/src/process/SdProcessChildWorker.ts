import { NeverEntryError } from "@simplysm/sd-core-common";

export class SdProcessChildWorker {
  public constructor(private readonly _id: number) {
  }

  public send(event: Exclude<string, "done" | "error" | "ready">, body?: any): void {
    if (!process.send) throw new NeverEntryError();
    if (event === "error" && body instanceof Error) {
      process.send({
        event: "error",
        sendId: this._id,
        body: { name: body.name, message: body.message, stack: body.stack }
      });
    }
    else {
      process.send({ event, sendId: this._id, body });
    }
  }

  public static defineWorker(fn: (worker: SdProcessChildWorker, args: any[]) => Promise<any> | any): void {
    process.on("message", async (args: any[]) => {
      const childWorker = new SdProcessChildWorker(args[0]);

      try {
        const result = await fn(childWorker, args.slice(1).map((item) => (item == null ? undefined : item)));
        childWorker.send("done", result);
      }
      catch (err) {
        childWorker.send("error", err);
      }
    });

    if (!process.send) throw new NeverEntryError();
    process.send({ event: "ready" });
  }
}