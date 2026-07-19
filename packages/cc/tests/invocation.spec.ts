import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildClaudeInvocation } from "../src/invocation";

describe("buildClaudeInvocation", () => {
  it("sets every environment variable the profile launcher sets", () => {
    const { env } = buildClaudeInvocation([]);

    expect(env).toEqual({
      CLAUDE_CODE_DISABLE_AGENT_VIEW: "1",
      CLAUDE_CODE_USE_POWERSHELL_TOOL: "1",
      CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: "1",
      DISABLE_TELEMETRY: "1",
      DISABLE_ERROR_REPORTING: "1",
      DISABLE_BUG_COMMAND: "1",
      CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
      CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1",
      DISABLE_NON_ESSENTIAL_MODEL_CALLS: "1",
      CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION: "0",
      CLAUDE_CODE_ENABLE_AWAY_SUMMARY: "0",
      DISABLE_AUTO_COMPACT: "1",
      CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
      CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL: "1",
      CLAUDE_CODE_ACCESSIBILITY: "1",
      CLAUDE_CODE_DISABLE_CRON: "1",
      CLAUDE_CODE_DISABLE_ARTIFACT: "1",
      CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
      CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
      CLAUDE_CODE_DISABLE_ATTACHMENTS: "1",
      CLAUDE_CODE_NO_FLICKER: "1",
      CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT: "1",
    });
  });

  it("passes the permission, tool and mcp flags the profile launcher passes", () => {
    const { args } = buildClaudeInvocation([]);

    expect(args).toContain("--dangerously-skip-permissions");
    expect(args).toContain("--strict-mcp-config");
    expect(args[args.indexOf("--tools") + 1]).toBe(
      "Agent,PowerShell,Grep,Glob,Read,Write,Edit,Skill,WebSearch,WebFetch",
    );
    expect(args[args.indexOf("--mcp-config") + 1]).toBe('{"mcpServers":{}}');
    expect(args[args.indexOf("--settings") + 1]).toBe(
      '{"spinnerTipsEnabled":false,"terminalProgressBarEnabled":false}',
    );
  });

  it("loads both bundled plugins and the bundled system prompt", () => {
    const { args } = buildClaudeInvocation([]);

    const pluginDirs = args.filter((_, i) => args[i - 1] === "--plugin-dir");
    expect(pluginDirs).toHaveLength(2);
    expect(pluginDirs.some((dir) => dir.endsWith("plugins/sd"))).toBe(true);
    expect(pluginDirs.some((dir) => dir.endsWith("plugins/sd-wiki"))).toBe(true);

    expect(args[args.indexOf("--system-prompt-file") + 1]).toBe(
      `${pluginDirs.find((dir) => dir.endsWith("plugins/sd"))!}/output-styles/sd.md`,
    );
  });

  it("resolves bundled paths inside this package regardless of the working directory", () => {
    const { args } = buildClaudeInvocation([]);
    const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

    const pluginDirs = args.filter((_, i) => args[i - 1] === "--plugin-dir");
    for (const dir of pluginDirs) {
      expect(path.resolve(dir).startsWith(path.resolve(pkgRoot))).toBe(true);
    }
  });

  it("appends user arguments after the fixed flags", () => {
    const { args } = buildClaudeInvocation(["--resume", "-p", "hello"]);

    expect(args.slice(-3)).toEqual(["--resume", "-p", "hello"]);
  });
});
