import { env } from "@simplysm/core-common";
import { createServiceServer } from "@simplysm/service-server";
import { EchoService } from "./services/echo-service";
import { HealthService } from "./services/health-service";
import { SharedDataDemoService } from "./services/shared-data-demo-service";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const server = createServiceServer({
  rootPath: __dirname,
  port: 40081,
  services: [EchoService, HealthService, SharedDataDemoService],
});

// Production mode: listen directly with static file serving
// Watch mode (env.DEV): Server Runtime Worker sets up proxy then calls listen
if (!env.DEV) {
  await server.listen();
}
