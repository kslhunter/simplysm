import { asRecord, formatErrorMessage, readStdinJson } from "../shared/hook-io.ts";
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

function getCommand(data: unknown): string | undefined {
  const command = asRecord(asRecord(data)?.["tool_input"])?.["command"];
  return typeof command === "string" ? command : undefined;
}

await main();
