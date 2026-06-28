import { checkShellCommand } from "../shared/shell-guard.ts";

async function main(): Promise<void> {
  try {
    const data = await readStdinJson();
    const command = getCommand(data);
    if (!command) return;

    const violation = checkShellCommand(command);
    if (!violation) return;

    console.error(`Blocked: ${violation.label}`);
    process.exit(2);
  } catch (error) {
    console.error(`Blocked: check-shell failed: ${formatErrorMessage(error)}`);
    process.exit(2);
  }
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

function getCommand(data: unknown): string | undefined {
  const command = asRecord(asRecord(data)?.["tool_input"])?.["command"];
  return typeof command === "string" ? command : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

await main();
