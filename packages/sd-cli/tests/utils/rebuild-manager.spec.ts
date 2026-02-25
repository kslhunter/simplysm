import { describe, it, expect, vi } from "vitest";
import { consola } from "consola";
import { RebuildManager } from "../../src/utils/rebuild-manager";

describe("RebuildManager", () => {
  it("logs start/success messages on rebuild batch", async () => {
    const logger = consola.withTag("test");
    const startSpy = vi.spyOn(logger, "start");
    const successSpy = vi.spyOn(logger, "success");

    const manager = new RebuildManager(logger);

    const resolver = manager.registerBuild("pkg1:build", "pkg1 (node)");

    // resolve to complete the build
    resolver();

    // wait for _runBatch microtask + Promise.allSettled
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(startSpy).toHaveBeenCalledWith("Rebuilding... (pkg1 (node))");
    expect(successSpy).toHaveBeenCalledWith("Rebuild complete (pkg1 (node))");
  });

  it("batches multiple builds and logs them together", async () => {
    const logger = consola.withTag("test");
    const startSpy = vi.spyOn(logger, "start");
    const successSpy = vi.spyOn(logger, "success");

    const manager = new RebuildManager(logger);

    const resolver1 = manager.registerBuild("pkg1:build", "pkg1 (node)");
    const resolver2 = manager.registerBuild("pkg2:build", "pkg2 (browser)");

    resolver1();
    resolver2();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(startSpy).toHaveBeenCalledWith("Rebuilding... (pkg1 (node), pkg2 (browser))");
    expect(successSpy).toHaveBeenCalledWith("Rebuild complete (pkg1 (node), pkg2 (browser))");
  });
});
