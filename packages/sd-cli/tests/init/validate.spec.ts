import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fsx } from "@simplysm/core-node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateBeforePrompt, validateInput } from "../../src/commands/init/validate";
import type { InitInput } from "../../src/commands/init/types";

const baseInput: InitInput = {
  workspaceName: "demo",
  description: "Demo",
  hasServer: true,
  clients: [{ name: "admin", type: "web", hasRouter: true }],
  hasDb: false,
};

describe("validateBeforePrompt", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "sd-init-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("빈 디렉토리는 통과", async () => {
    await expect(validateBeforePrompt(dir)).resolves.toBeUndefined();
  });

  it("파일이 있으면 거부", async () => {
    await fsx.write(join(dir, "x.txt"), "content");
    await expect(validateBeforePrompt(dir)).rejects.toThrow(/비어있지 않습니다/);
  });

  it(".git 만 있는 디렉토리는 통과", async () => {
    await fsx.mkdir(join(dir, ".git"));
    await expect(validateBeforePrompt(dir)).resolves.toBeUndefined();
  });

  it(".idea, .vscode, .logs 같은 점프리픽스 항목만 있는 디렉토리는 통과", async () => {
    await fsx.mkdir(join(dir, ".idea"));
    await fsx.mkdir(join(dir, ".vscode"));
    await fsx.write(join(dir, ".logs"), "");
    await expect(validateBeforePrompt(dir)).resolves.toBeUndefined();
  });
});

describe("validateInput", () => {
  it("server=Y + client>=1 통과", () => {
    expect(() => validateInput(baseInput)).not.toThrow();
  });

  it("server=N + client=0 거부", () => {
    expect(() => validateInput({ ...baseInput, hasServer: false, clients: [] })).toThrow(
      /server 도 client 도 없는/,
    );
  });

  it("workspaceName 이 kebab-case 아니면 거부", () => {
    expect(() => validateInput({ ...baseInput, workspaceName: "Demo" })).toThrow();
    expect(() => validateInput({ ...baseInput, workspaceName: "demo_app" })).toThrow();
    expect(() => validateInput({ ...baseInput, workspaceName: "1demo" })).toThrow();
  });

  it("client 이름 kebab-case 아니면 거부", () => {
    expect(() =>
      validateInput({
        ...baseInput,
        clients: [{ name: "Admin", type: "web", hasRouter: true }],
      }),
    ).toThrow();
  });

  it("client 이름 중복 (prefix 정규화 후) 거부", () => {
    expect(() =>
      validateInput({
        ...baseInput,
        clients: [
          { name: "admin", type: "web", hasRouter: true },
          { name: "client-admin", type: "web", hasRouter: true },
        ],
      }),
    ).toThrow(/중복/);
  });
});
