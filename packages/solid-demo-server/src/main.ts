import { env } from "@simplysm/core-common";
import { createServiceServer } from "@simplysm/service-server";
import { EchoService } from "./services/echo-service";
import { HealthService } from "./services/health-service";
import { SharedDataDemoService } from "./services/shared-data-demo-service";

export const server = createServiceServer({
  rootPath: process.cwd(),
  port: 40081,
  services: [EchoService, HealthService, SharedDataDemoService],
});

// 프로덕션 모드: 정적 파일 서빙 포함하여 직접 listen
// Watch 모드 (env.DEV): Server Runtime Worker가 proxy 설정 후 listen 호출
if (!env.DEV) {
  await server.listen();
}
