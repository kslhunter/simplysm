import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { createServiceContext, getServiceAuthPermissions } from "./define-service";

export async function runServiceMethod(
  server: ServiceServer,
  def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  },
): Promise<unknown> {
  // Find service definition
  const serviceDef = server.options.services.find((item) => item.name === def.serviceName);

  if (serviceDef == null) {
    throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
  }

  // Request validation (gatekeeper)
  const clientName = def.socket?.clientName ?? def.http?.clientName;
  if (clientName != null) {
    if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
      throw new Error(`[Security] 유효하지 않은 클라이언트명입니다: ${clientName}`);
    }
  }

  // Create context
  const ctx = createServiceContext(server, def.socket, def.http);

  // Invoke factory to create method object
  const methods = serviceDef.factory(ctx);

  // Find method
  const method = (methods as Record<string, unknown>)[def.methodName];
  if (typeof method !== "function") {
    throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
  }

  // Auth check
  if (server.options.auth != null) {
    // Check method-level auth first, fallback to service-level
    const methodPerms = getServiceAuthPermissions(method);
    const requiredPerms = methodPerms ?? serviceDef.authPermissions;

    if (requiredPerms != null) {
      const authTokenPayload = def.socket?.authTokenPayload ?? def.http?.authTokenPayload;

      if (authTokenPayload == null) {
        throw new Error("로그인이 필요합니다.");
      }

      if (requiredPerms.length > 0) {
        const hasPerm = requiredPerms.some((perm) => authTokenPayload.roles.includes(perm));
        if (!hasPerm) {
          throw new Error("권한이 부족합니다.");
        }
      }
    }
  }

  // Execute
  return await method(...def.params);
}
