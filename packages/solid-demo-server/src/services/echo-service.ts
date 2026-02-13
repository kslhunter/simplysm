import { defineService } from "@simplysm/service-server";

export const EchoService = defineService("Echo", () => ({
  echo: (message: string): string => {
    return message;
  },

  echoJson: <T>(data: T): T => {
    return data;
  },
}));
