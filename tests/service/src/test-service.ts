import { defineService, auth } from "@simplysm/service-server";

export interface TestAuthInfo {
  userId: string;
  userName: string;
  roles: string[];
}

export const TestService = defineService("TestService", (ctx) => ({
  echo: (message: string): Promise<string> => {
    return Promise.resolve(`Echo: ${message}`);
  },

  getComplexData: (): Promise<{
    number: number;
    string: string;
    array: number[];
    nested: { a: string; b: number };
    date: Date;
  }> => {
    return Promise.resolve({
      number: 42,
      string: "hello",
      array: [1, 2, 3],
      nested: { a: "nested", b: 99 },
      date: new Date("2026-01-08T12:00:00Z"),
    });
  },

  throwError: (message: string): Promise<void> => {
    return Promise.reject(new Error(message));
  },

  delayedResponse: async (ms: number): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return `Delayed ${ms}ms`;
  },

  getAuthInfo: auth((): Promise<TestAuthInfo | undefined> => {
    return Promise.resolve(ctx.authInfo as TestAuthInfo | undefined);
  }),

  adminOnly: auth(["admin"], (): Promise<string> => {
    return Promise.resolve("Admin access granted");
  }),

  getClientName: (): Promise<string | undefined> => {
    return Promise.resolve(ctx.clientName);
  },

  getLargeData: (sizeKb: number): Promise<string> => {
    return Promise.resolve("A".repeat(sizeKb * 1024));
  },
}));

export type TestServiceMethods = import("@simplysm/service-server").ServiceMethods<typeof TestService>;
