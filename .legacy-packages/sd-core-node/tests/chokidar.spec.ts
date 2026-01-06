import { describe, it } from "vitest";
import * as chokidar from "chokidar";
import path from "path";

describe("test", () => {
  it("test", async () => {
    const watcher = chokidar.watch("D:\\workspaces-12\\simplysm\\packages\\sd-core-node\\tests", {
      ignored: (filePath) => {
        return (
          path.basename(path.dirname(filePath)) === "tests" &&
          path.basename(filePath) === "routes.txt"
        );
      },
      ignoreInitial: true,
      persistent: true,
    });

    await new Promise<void>((resolve) => {
      watcher.on("all", async (event, filePath) => {
        console.log(event, filePath);

        await watcher.close();
        resolve();
      });
    });
  });
});
