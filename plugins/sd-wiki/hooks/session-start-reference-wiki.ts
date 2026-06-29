import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWikiReferenceContext } from "../shared/reference-wiki.ts";

async function main(): Promise<void> {
  try {
    const data = await readStdinJson();
    const pluginRoot = resolvePluginRoot(data);
    const context = await buildWikiReferenceContext({ pluginRoot });
    if (context) process.stdout.write(context);
  } catch {
    // SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
  }
}

function resolvePluginRoot(data: unknown): string {
  const envPluginRoot = process.env["CLAUDE_PLUGIN_ROOT"];
  if (envPluginRoot) return envPluginRoot;

  const inputPluginRoot = asRecord(data)?.["plugin_root"] ?? asRecord(data)?.["pluginRoot"];
  if (typeof inputPluginRoot === "string" && inputPluginRoot) return inputPluginRoot;

  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

async function readStdinJson(): Promise<unknown> {
  if (process.stdin.isTTY) return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? (JSON.parse(text) as unknown) : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

await main();
