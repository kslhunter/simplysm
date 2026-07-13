import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerClear(pi: ExtensionAPI) {
  pi.registerCommand("clear", {
    description: "Alias of /new",
    handler: async (_args, ctx) => {
      await ctx.newSession();
    },
  });
}
