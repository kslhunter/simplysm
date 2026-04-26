import type { SpawnOptions } from "child_process";
import { cpx } from "@simplysm/core-node";

export function shellSpawn(
  cmd: string,
  args: string[],
  options?: SpawnOptions & { reject?: boolean },
): cpx.SpawnProcess {
  return cpx.spawn(cmd, args, { ...options, shell: true });
}
