import { constants } from "node:fs";
import { access, mkdir, open, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createReadToolDefinition,
  createWriteToolDefinition,
  type ExtensionAPI,
  type ReadOperations,
  type WriteOperations,
} from "@earendil-works/pi-coding-agent";
import {
  fileExists,
  hashBuffer,
  hashText,
  resolveFileKey,
  shortHash,
} from "../../shared/write-hash.ts";

interface ReadHashRecord {
  hash: string;
}

interface GuardedTools {
  read: ReturnType<typeof createReadToolDefinition>;
  write: ReturnType<typeof createWriteToolDefinition>;
}

const LOCK_DIR = join(tmpdir(), "simplysm-pi-write-hash-guard");
const LOCK_WAIT_TIMEOUT_MS = 30_000;
const LOCK_RETRY_INTERVAL_MS = 50;
const LOCK_STALE_MS = 5 * 60_000;

const readHashes = new Map<string, ReadHashRecord>();
const toolCache = new Map<string, GuardedTools>();

export function registerWriteHashHook(pi: ExtensionAPI) {
  const template = getGuardedTools(process.cwd());

  pi.registerTool({
    ...template.read,
    promptGuidelines: [
      ...(template.read.promptGuidelines ?? []),
      "기존 파일을 write로 덮어쓰기 전에 같은 파일을 read하여 변경 감지용 hash를 갱신하세요.",
    ],
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return getGuardedTools(ctx.cwd).read.execute(toolCallId, params, signal, onUpdate, ctx);
    },
  });

  pi.registerTool({
    ...template.write,
    description: `${template.write.description} 기존 파일은 마지막 read에서 기록한 hash와 현재 hash가 같을 때만 덮어씁니다.`,
    promptGuidelines: [
      ...(template.write.promptGuidelines ?? []),
      "기존 파일에 write를 사용하기 전에 같은 파일을 read하세요. write는 마지막 read 이후 파일 내용이 바뀌었으면 차단됩니다.",
    ],
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return getGuardedTools(ctx.cwd).write.execute(toolCallId, params, signal, onUpdate, ctx);
    },
  });
}

function getGuardedTools(cwd: string): GuardedTools {
  const cached = toolCache.get(cwd);
  if (cached) return cached;

  const tools = {
    read: createReadToolDefinition(cwd, { operations: createTrackingReadOperations() }),
    write: createWriteToolDefinition(cwd, { operations: createGuardedWriteOperations() }),
  };
  toolCache.set(cwd, tools);
  return tools;
}

function createTrackingReadOperations(): ReadOperations {
  return {
    async access(absolutePath) {
      await access(absolutePath, constants.R_OK);
    },

    async readFile(absolutePath) {
      const buffer = await readFile(absolutePath);
      await recordReadHash(absolutePath, buffer);
      return buffer;
    },

    detectImageMimeType: detectSupportedImageMimeType,
  };
}

function createGuardedWriteOperations(): WriteOperations {
  return {
    async mkdir(dir) {
      await mkdir(dir, { recursive: true });
    },

    async writeFile(absolutePath, content) {
      await writeFileWithHashGuard(absolutePath, content);
    },
  };
}

async function recordReadHash(absolutePath: string, content: Buffer): Promise<void> {
  const key = await resolveFileKey(absolutePath);
  readHashes.set(key, { hash: hashBuffer(content) });
}

async function writeFileWithHashGuard(absolutePath: string, content: string): Promise<void> {
  const lockKey = await resolveFileKey(absolutePath);

  await withFileLock(lockKey, async () => {
    const exists = await fileExists(absolutePath);
    const key = exists ? await resolveFileKey(absolutePath) : lockKey;

    if (exists) {
      await assertWriteHash(absolutePath, key);
    }

    await writeFile(absolutePath, content, "utf8");
    const nextKey = await resolveFileKey(absolutePath);
    readHashes.delete(key);
    readHashes.set(nextKey, { hash: hashText(content) });
  });
}

async function assertWriteHash(absolutePath: string, key: string): Promise<void> {
  const current = await readFile(absolutePath);
  const currentHash = hashBuffer(current);
  const lastRead = readHashes.get(key);

  if (!lastRead) {
    throw new Error(
      `write-hash-guard: 기존 파일을 덮어쓰려면 먼저 read로 현재 내용을 확인해야 합니다: ${absolutePath}`,
    );
  }

  if (lastRead.hash !== currentHash) {
    throw new Error(
      `write-hash-guard: 파일이 마지막 read 이후 변경되어 write를 차단했습니다: ${absolutePath}\n` +
        `다시 read한 뒤 현재 변경 사항을 반영해 재시도하세요. ` +
        `(lastRead=${shortHash(lastRead.hash)}, current=${shortHash(currentHash)})`,
    );
  }
}

async function withFileLock<T>(fileKey: string, fn: () => Promise<T>): Promise<T> {
  await mkdir(LOCK_DIR, { recursive: true });

  const lockPath = join(LOCK_DIR, `${hashText(fileKey)}.lock`);
  const startedAt = Date.now();

  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, fileKey, createdAt: Date.now() }));
        return await fn();
      } finally {
        await handle.close().catch(() => undefined);
        await unlink(lockPath).catch(() => undefined);
      }
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "EEXIST") throw error;

      await removeStaleLock(lockPath);
      if (Date.now() - startedAt > LOCK_WAIT_TIMEOUT_MS) {
        throw new Error(
          `write-hash-guard: 파일 잠금을 ${LOCK_WAIT_TIMEOUT_MS / 1000}초 안에 획득하지 못했습니다: ${fileKey}`,
        );
      }
      await sleep(LOCK_RETRY_INTERVAL_MS);
    }
  }
}

async function removeStaleLock(lockPath: string): Promise<void> {
  const createdAt = await readLockCreatedAt(lockPath);
  if (createdAt === undefined || Date.now() - createdAt <= LOCK_STALE_MS) return;

  await unlink(lockPath).catch(() => undefined);
}

async function readLockCreatedAt(lockPath: string): Promise<number | undefined> {
  try {
    const content = await readFile(lockPath, "utf8");
    const payload = JSON.parse(content) as { createdAt?: unknown };
    if (typeof payload.createdAt === "number") return payload.createdAt;
  } catch {
    // 비정상 종료로 lock 파일 내용이 비어 있거나 깨진 경우 mtime으로 stale 여부를 판단합니다.
  }

  try {
    return (await stat(lockPath)).mtimeMs;
  } catch {
    return undefined;
  }
}

async function detectSupportedImageMimeType(absolutePath: string): Promise<string | undefined> {
  const handle = await open(absolutePath, "r");
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const header = buffer.subarray(0, bytesRead);

    if (
      header.length >= 8 &&
      header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return "image/png";
    }
    if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return "image/jpeg";
    }
    if (
      header.length >= 6 &&
      (header.subarray(0, 6).toString("ascii") === "GIF87a" ||
        header.subarray(0, 6).toString("ascii") === "GIF89a")
    ) {
      return "image/gif";
    }
    if (
      header.length >= 12 &&
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "image/webp";
    }
    return undefined;
  } finally {
    await handle.close();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
