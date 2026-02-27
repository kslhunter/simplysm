import { describe, it, expect } from "vitest";
import { injectSessionId } from "../src/tool-proxy.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const sampleTool: Tool = {
  name: "browser_navigate",
  description: "Navigate to a URL",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to navigate to" },
    },
    required: ["url"],
  },
};

describe("injectSessionId", () => {
  it("adds sessionId to properties", () => {
    const result = injectSessionId(sampleTool);
    expect(result.inputSchema.properties).toHaveProperty("sessionId");
    expect((result.inputSchema.properties as Record<string, unknown>)["sessionId"]).toEqual({
      type: "string",
      description: "Session ID for browser isolation",
    });
  });

  it("adds sessionId to required list", () => {
    const result = injectSessionId(sampleTool);
    expect(result.inputSchema.required).toContain("sessionId");
  });

  it("preserves original properties", () => {
    const result = injectSessionId(sampleTool);
    expect(result.inputSchema.properties).toHaveProperty("url");
  });

  it("preserves original required fields", () => {
    const result = injectSessionId(sampleTool);
    expect(result.inputSchema.required).toContain("url");
  });

  it("does not duplicate sessionId if already present", () => {
    const toolWithSession: Tool = {
      ...sampleTool,
      inputSchema: {
        ...sampleTool.inputSchema,
        properties: {
          sessionId: { type: "string" },
          ...sampleTool.inputSchema.properties,
        },
        required: ["sessionId", "url"],
      },
    };
    const result = injectSessionId(toolWithSession);
    const required = result.inputSchema.required as string[];
    expect(required.filter((r) => r === "sessionId")).toHaveLength(1);
  });

  it("preserves tool name and description", () => {
    const result = injectSessionId(sampleTool);
    expect(result.name).toBe("browser_navigate");
    expect(result.description).toBe("Navigate to a URL");
  });
});
