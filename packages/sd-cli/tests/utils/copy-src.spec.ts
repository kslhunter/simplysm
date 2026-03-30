import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

const mockOnChange = vi.fn();
const mockWatcherClose = vi.fn();

vi.mock("@simplysm/core-node", () => ({
  fsx: {
    glob: vi.fn(),
    mkdir: vi.fn(),
    copy: vi.fn(),
    rm: vi.fn(),
  },
  FsWatcher: {
    watch: vi.fn(() => Promise.resolve({
      onChange: mockOnChange,
      close: mockWatcherClose,
    })),
  },
}));

const { fsx, FsWatcher } = await import("@simplysm/core-node");
const { copySrcFiles, watchCopySrcFiles } = await import("../../src/utils/copy-src");

const pkgDir = path.resolve("/workspace/packages/my-pkg");
const srcDir = path.join(pkgDir, "src");
const distDir = path.join(pkgDir, "dist");

describe("copySrcFiles", () => {
  beforeEach(() => {
    vi.mocked(fsx.glob).mockReset();
    vi.mocked(fsx.mkdir).mockReset();
    vi.mocked(fsx.copy).mockReset();
    vi.mocked(fsx.mkdir).mockResolvedValue(undefined as any);
    vi.mocked(fsx.copy).mockResolvedValue(undefined as any);
  });

  it("copies files matching glob patterns preserving relative paths", async () => {
    vi.mocked(fsx.glob).mockResolvedValue([
      path.join(srcDir, "styles", "app.css"),
    ]);

    await copySrcFiles(pkgDir, ["**/*.css"]);

    expect(fsx.glob).toHaveBeenCalledWith("**/*.css", { cwd: srcDir, absolute: true });
    expect(fsx.mkdir).toHaveBeenCalledWith(path.join(distDir, "styles"));
    expect(fsx.copy).toHaveBeenCalledWith(
      path.join(srcDir, "styles", "app.css"),
      path.join(distDir, "styles", "app.css"),
    );
  });

  it("handles multiple patterns", async () => {
    vi.mocked(fsx.glob)
      .mockResolvedValueOnce([path.join(srcDir, "a.css")])
      .mockResolvedValueOnce([path.join(srcDir, "b.json")]);

    await copySrcFiles(pkgDir, ["**/*.css", "**/*.json"]);

    expect(fsx.glob).toHaveBeenCalledTimes(2);
    expect(fsx.copy).toHaveBeenCalledTimes(2);
  });

  it("does nothing when no files match", async () => {
    vi.mocked(fsx.glob).mockResolvedValue([]);

    await copySrcFiles(pkgDir, ["**/*.css"]);

    expect(fsx.copy).not.toHaveBeenCalled();
  });
});

describe("watchCopySrcFiles", () => {
  beforeEach(() => {
    vi.mocked(fsx.glob).mockReset();
    vi.mocked(fsx.mkdir).mockReset();
    vi.mocked(fsx.copy).mockReset();
    vi.mocked(fsx.rm).mockReset();
    mockOnChange.mockReset();
    vi.mocked(fsx.glob).mockResolvedValue([]);
    vi.mocked(fsx.mkdir).mockResolvedValue(undefined as any);
    vi.mocked(fsx.copy).mockResolvedValue(undefined as any);
    vi.mocked(fsx.rm).mockResolvedValue(undefined as any);
  });

  it("performs initial copy then starts watch", async () => {
    const watcher = await watchCopySrcFiles(pkgDir, ["**/*.css"]);

    expect(fsx.glob).toHaveBeenCalledWith("**/*.css", { cwd: srcDir, absolute: true });
    expect(FsWatcher.watch).toHaveBeenCalledWith([path.join(srcDir, "**/*.css")]);
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
      { event: "change", path: path.join(srcDir, "styles", "app.css") },
    ]);

    expect(fsx.mkdir).toHaveBeenCalledWith(path.join(distDir, "styles"));
    expect(fsx.copy).toHaveBeenCalledWith(
      path.join(srcDir, "styles", "app.css"),
      path.join(distDir, "styles", "app.css"),
    );
  });

  it("deletes dist file on unlink event", async () => {
    await watchCopySrcFiles(pkgDir, ["**/*.css"]);

    const onChangeCallback = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    await onChangeCallback([
      { event: "unlink", path: path.join(srcDir, "styles", "old.css") },
    ]);

    expect(fsx.rm).toHaveBeenCalledWith(path.join(distDir, "styles", "old.css"));
  });

  it("handles add event same as change event", async () => {
    await watchCopySrcFiles(pkgDir, ["**/*.css"]);

    const onChangeCallback = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    await onChangeCallback([
      { event: "add", path: path.join(srcDir, "new.css") },
    ]);

    expect(fsx.copy).toHaveBeenCalledWith(
      path.join(srcDir, "new.css"),
      path.join(distDir, "new.css"),
    );
  });
});
