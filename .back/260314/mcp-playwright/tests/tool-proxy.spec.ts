import { vi, describe, it, expect } from "vitest";

// session-manager.ts (imported transitively) calls createRequire at module level
vi.mock("node:module", () => ({
  createRequire: () => (id: string) => {
    if (id === "@playwright/mcp") {
      return { createConnection: vi.fn() };
    }
    if (id === "../package.json") {
      return { version: "0.0.0-test" };
    }
    throw new Error(`Unexpected require: ${id}`);
  },
}));

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

  it("overrides existing sessionId property with injected definition", () => {
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
    // Injected definition should win — has description
    expect((result.inputSchema.properties as Record<string, unknown>)["sessionId"]).toEqual({
      type: "string",
      description: "Session ID for browser isolation",
    });
  });

});
