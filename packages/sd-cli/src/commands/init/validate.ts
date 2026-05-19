import { fsx } from "@simplysm/core-node";
import type { InitInput } from "./types";

const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export async function validateBeforePrompt(cwd: string): Promise<void> {
  if (!(await fsx.exists(cwd))) return;
  const children = await fsx.readdir(cwd);
  const significant = children.filter((n) => n !== ".git");
  if (significant.length > 0) {
    throw new Error(
      `작업 디렉토리가 비어있지 않습니다 (감지된 항목: ${significant.join(", ")}). 빈 디렉토리에서 다시 실행하세요.`,
    );
  }
}

export function validateInput(input: InitInput): void {
  if (!input.hasServer && input.clients.length === 0) {
    throw new Error("server 도 client 도 없는 워크스페이스는 만들 수 없습니다.");
  }

  if (!KEBAB_CASE_RE.test(input.workspaceName)) {
    throw new Error(
      `워크스페이스 이름은 영문 kebab-case 여야 합니다 (예: my-workspace). 입력값: "${input.workspaceName}"`,
    );
  }

  const clientNames = new Set<string>();
  for (const c of input.clients) {
    if (!KEBAB_CASE_RE.test(c.name)) {
      throw new Error(
        `client 이름은 영문 kebab-case 여야 합니다. 입력값: "${c.name}"`,
      );
    }
    const normalized = c.name.startsWith("client-") ? c.name : `client-${c.name}`;
    if (clientNames.has(normalized)) {
      throw new Error(`client 이름이 중복됩니다: "${normalized}"`);
    }
    clientNames.add(normalized);
  }
}
