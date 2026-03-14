import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchUrlBytes } from "../../src/utils/fetch";

function createMockReader(chunks: Uint8Array[]) {
  let index = 0;
  const releaseLock = vi.fn();
  const reader = {
    read: vi.fn(async () => {
      if (index < chunks.length) {
        return { done: false as const, value: chunks[index++] };
      }
      return { done: true as const, value: undefined };
    }),
    releaseLock,
  };
  return { reader, releaseLock };
}

function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentLength?: number | null;
  chunks?: Uint8Array[];
  bodyNull?: boolean;
}) {
  const { reader, releaseLock } = options.bodyNull
    ? { reader: undefined, releaseLock: vi.fn() }
    : createMockReader(options.chunks ?? []);

  return {
    response: {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      statusText: options.statusText ?? "OK",
      headers: {
        get: (name: string) => {
          if (name === "Content-Length" && options.contentLength != null) {
            return String(options.contentLength);
          }
          return null;
        },
      },
      body: options.bodyNull ? null : { getReader: () => reader },
    } as unknown as Response,
    releaseLock,
  };
}

describe("fetchUrlBytes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads binary data when Content-Length is present", async () => {
    const chunk1 = new Uint8Array([1, 2, 3, 4, 5]);
    const chunk2 = new Uint8Array([6, 7, 8, 9, 10]);
    const { response } = createMockResponse({
      contentLength: 10,
      chunks: [chunk1, chunk2],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const result = await fetchUrlBytes("https://example.com/file.bin");

    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  });

  it("calls onProgress callback for each chunk", async () => {
    const chunk1 = new Uint8Array([1, 2, 3, 4, 5]);
    const chunk2 = new Uint8Array([6, 7, 8, 9, 10]);
    const { response } = createMockResponse({
      contentLength: 10,
      chunks: [chunk1, chunk2],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const onProgress = vi.fn();
    await fetchUrlBytes("https://example.com/file.bin", { onProgress });

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, { receivedLength: 5, contentLength: 10 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { receivedLength: 10, contentLength: 10 });
  });

  it("downloads binary data when Content-Length is absent", async () => {
    const chunk1 = new Uint8Array([10, 20]);
    const chunk2 = new Uint8Array([30, 40, 50]);
    const { response } = createMockResponse({
      contentLength: null,
      chunks: [chunk1, chunk2],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const result = await fetchUrlBytes("https://example.com/stream");

    expect(result).toEqual(new Uint8Array([10, 20, 30, 40, 50]));
  });

  it("throws on HTTP error response", async () => {
    const { response } = createMockResponse({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchUrlBytes("https://example.com/missing")).rejects.toThrow(
      "Download failed: 404 Not Found",
    );
  });

  it("throws when response body is null", async () => {
    const { response } = createMockResponse({ bodyNull: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchUrlBytes("https://example.com/nobody")).rejects.toThrow(
      "Response body is not readable",
    );
  });

  it("calls releaseLock after successful download", async () => {
    const { response, releaseLock } = createMockResponse({
      contentLength: 3,
      chunks: [new Uint8Array([1, 2, 3])],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await fetchUrlBytes("https://example.com/file.bin");

    expect(releaseLock).toHaveBeenCalledOnce();
  });

  it("calls releaseLock even when reader.read throws", async () => {
    const releaseLock = vi.fn();
    const reader = {
      read: vi.fn().mockRejectedValue(new Error("Network error")),
      releaseLock,
    };
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        get: () => null,
      },
      body: { getReader: () => reader },
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchUrlBytes("https://example.com/fail")).rejects.toThrow("Network error");
    expect(releaseLock).toHaveBeenCalledOnce();
  });
});
