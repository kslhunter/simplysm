import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import { fsx, FsWatcher } from "@simplysm/core-node";

const mockOnChange = vi.fn();
const mockWatcherClose = vi.fn();

const toPosix = (p: string) => p.replace(/\\/g, "/");

vi.spyOn(fsx, "glob");
vi.spyOn(fsx, "mkdir");
vi.spyOn(fsx, "copy");
vi.spyOn(fsx, "rm");
vi.spyOn(fsx, "exists");
vi.spyOn(FsWatcher, "watch").mockImplementation(() =>
  Promise.resolve({ onChange: mockOnChange, close: mockWatcherClose } as any),
);

import { copyDirFiles, copySrcFiles, watchCopySrcFiles } from "../../src/utils/copy-src";

const pkgDir = toPosix(path.resolve("/workspace/packages/my-pkg"));
const srcDir = toPosix(path.join(pkgDir, "src"));
const distDir = toPosix(path.join(pkgDir, "dist"));

describe("copySrcFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fsx.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsx.copy).mockResolvedValue(undefined);
  });

  it("copies files matching glob patterns preserving relative paths", async () => {
    vi.mocked(fsx.glob).mockResolvedValue([toPosix(path.join(srcDir, "styles", "app.css"))]);

    await copySrcFiles(pkgDir, ["**/*.css"]);

    expect(fsx.glob).toHaveBeenCalledWith("**/*.css", { cwd: srcDir, absolute: true });
    expect(fsx.mkdir).toHaveBeenCalledWith(toPosix(path.join(distDir, "styles")));
    expect(fsx.copy).toHaveBeenCalledWith(
      toPosix(path.join(srcDir, "styles", "app.css")),
      toPosix(path.join(distDir, "styles", "app.css")),
    );
  });

  it("handles multiple patterns", async () => {
    vi.mocked(fsx.glob)
      .mockResolvedValueOnce([toPosix(path.join(srcDir, "a.css"))])
      .mockResolvedValueOnce([toPosix(path.join(srcDir, "b.json"))]);

    await copySrcFiles(pkgDir, ["**/*.css", "**/*.json"]);

    expect(fsx.copy).toHaveBeenCalledWith(
      toPosix(path.join(srcDir, "a.css")),
      toPosix(path.join(distDir, "a.css")),
    );
    expect(fsx.copy).toHaveBeenCalledWith(
      toPosix(path.join(srcDir, "b.json")),
      toPosix(path.join(distDir, "b.json")),
    );
  });

  it("does nothing when no files match", async () => {
    vi.mocked(fsx.glob).mockResolvedValue([]);

    await copySrcFiles(pkgDir, ["**/*.css"]);

    expect(fsx.copy).not.toHaveBeenCalled();
  });
});

describe("copyDirFiles", () => {
  const fromDir = toPosix(path.resolve("/workspace/plugins/sd"));
  const toDir = toPosix(path.join(distDir, "plugins", "sd"));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fsx.exists).mockResolvedValue(true);
    vi.mocked(fsx.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsx.copy).mockResolvedValue(undefined);
  });

  it("copies files from an outside directory preserving relative paths", async () => {
    vi.mocked(fsx.glob).mockResolvedValue([toPosix(path.join(fromDir, "hooks", "check-shell.ts"))]);

    await copyDirFiles(fromDir, toDir);

    expect(fsx.copy).toHaveBeenCalledWith(
      toPosix(path.join(fromDir, "hooks", "check-shell.ts")),
      toPosix(path.join(toDir, "hooks", "check-shell.ts")),
    );
  });

  it("includes dotfiles so plugin manifests are not dropped", async () => {
    vi.mocked(fsx.glob).mockResolvedValue([]);

    await copyDirFiles(fromDir, toDir);

    expect(fsx.glob).toHaveBeenCalledWith(
      "**/*",
      expect.objectContaining({ cwd: fromDir, absolute: true, dot: true, nodir: true }),
    );
  });

  it("passes ignore patterns through to the file scan", async () => {
    vi.mocked(fsx.glob).mockResolvedValue([]);

    await copyDirFiles(fromDir, toDir, ["**/node_modules/**", "**/__pycache__/**"]);

    expect(fsx.glob).toHaveBeenCalledWith(
      "**/*",
      expect.objectContaining({ ignore: ["**/node_modules/**", "**/__pycache__/**"] }),
    );
  });

  it("throws when the source directory does not exist", async () => {
    vi.mocked(fsx.exists).mockResolvedValue(false);

    await expect(copyDirFiles(fromDir, toDir)).rejects.toThrow(fromDir);
    expect(fsx.copy).not.toHaveBeenCalled();
  });
});

describe("watchCopySrcFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fsx.glob).mockResolvedValue([]);
    vi.mocked(fsx.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsx.copy).mockResolvedValue(undefined);
    vi.mocked(fsx.rm).mockResolvedValue(undefined);
  });

  it("performs initial copy then starts watch", async () => {
    const watcher = await watchCopySrcFiles(pkgDir, ["**/*.css"]);

    expect(fsx.glob).toHaveBeenCalledWith("**/*.css", { cwd: srcDir, absolute: true });
    expect(FsWatcher.watch).toHaveBeenCalledWith([toPosix(path.join(srcDir, "**/*.css"))]);
    expect(mockOnChange).toHaveBeenCalledWith({ delay: 300 }, expect.any(Function));
    expect(watcher).toBeDefined();
  });

  it("copies file on add/change event", async () => {
    await watchCopySrcFiles(pkgDir, ["**/*.css"]);

    // Get the onChange callback
    const onChangeCallback = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    await onChangeCallback([
      { event: "change", path: toPosix(path.join(srcDir, "styles", "app.css")) },
    ]);

    expect(fsx.mkdir).toHaveBeenCalledWith(toPosix(path.join(distDir, "styles")));
    expect(fsx.copy).toHaveBeenCalledWith(
      toPosix(path.join(srcDir, "styles", "app.css")),
      toPosix(path.join(distDir, "styles", "app.css")),
    );
  });

  it("deletes dist file on unlink event", async () => {
    await watchCopySrcFiles(pkgDir, ["**/*.css"]);

    const onChangeCallback = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    await onChangeCallback([
      { event: "unlink", path: toPosix(path.join(srcDir, "styles", "old.css")) },
    ]);

    expect(fsx.rm).toHaveBeenCalledWith(toPosix(path.join(distDir, "styles", "old.css")));
  });

  it("handles add event same as change event", async () => {
    await watchCopySrcFiles(pkgDir, ["**/*.css"]);

    const onChangeCallback = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    await onChangeCallback([{ event: "add", path: toPosix(path.join(srcDir, "new.css")) }]);

    expect(fsx.copy).toHaveBeenCalledWith(
      toPosix(path.join(srcDir, "new.css")),
      toPosix(path.join(distDir, "new.css")),
    );
  });
});
