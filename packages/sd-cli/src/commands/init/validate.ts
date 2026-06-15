import path from "path";
import { fsx } from "@simplysm/core-node";
import type { ClientInputSpec, InitInput } from "./types";

const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export async function validateBeforePrompt(cwd: string): Promise<void> {
  if (!(await fsx.exists(cwd))) return;
  const children = await fsx.readdir(cwd);
  // 점프리픽스 항목 (`.git`, `.idea`, `.vscode`, `.logs`, `.cache`, `.DS_Store` 등 IDE/툴 자산) 은 무시
  const significant = children.filter((n) => !n.startsWith("."));
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

  if (input.hasAuth && input.userEntityName != null && !KEBAB_CASE_RE.test(input.userEntityName)) {
    throw new Error(
      `사용자 엔티티 영문 식별자는 kebab-case 여야 합니다 (예: employee). 입력값: "${input.userEntityName}"`,
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

/** init client — 신규 클라이언트가 기존 워크스페이스와 충돌하지 않는지 검증 */
export async function validateInitClientInput(
  cwd: string,
  newClient: ClientInputSpec,
  existingClients: ClientInputSpec[],
): Promise<void> {
  if (!KEBAB_CASE_RE.test(newClient.name)) {
    throw new Error(`client 이름은 영문 kebab-case 여야 합니다. 입력값: "${newClient.name}"`);
  }

  const toNormalized = (clientName: string): string =>
    clientName.startsWith("client-") ? clientName : `client-${clientName}`;
  const normalized = toNormalized(newClient.name);
  if (existingClients.some((c) => toNormalized(c.name) === normalized)) {
    throw new Error(`이미 존재하는 client 입니다: "${normalized}"`);
  }

  if (await fsx.exists(path.resolve(cwd, "packages", normalized))) {
    throw new Error(`이미 존재하는 패키지 디렉토리입니다: packages/${normalized}`);
  }
}
