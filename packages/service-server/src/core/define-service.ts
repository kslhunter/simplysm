import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { objMerge } from "@simplysm/core-common";
import { getConfig } from "../utils/config-manager";
import path from "path";

// ── Context ──

export interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: {
    clientName: string;
    authTokenPayload?: AuthTokenPayload<TAuthInfo>;
  };

  /** V1 legacy context (auto-update only) */
  legacy?: {
    clientName?: string;
  };

  get authInfo(): TAuthInfo | undefined;
  get clientName(): string | undefined;
  get clientPath(): string | undefined;
  getConfig<T>(section: string): Promise<T>;
}

export function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo> {
  return {
    server,
    socket,
    http,
    legacy,

    get authInfo(): TAuthInfo | undefined {
      return (socket?.authTokenPayload?.data ?? http?.authTokenPayload?.data) as TAuthInfo | undefined;
    },

    get clientName(): string | undefined {
      const name = socket?.clientName ?? http?.clientName ?? legacy?.clientName;
      if (name == null) return undefined;

      if (name === "" || name.includes("..") || name.includes("/") || name.includes("\\")) {
        throw new Error(`유효하지 않은 클라이언트 명입니다: ${name}`);
      }

      return name;
    },

    get clientPath(): string | undefined {
      const name = this.clientName;
      return name == null ? undefined : path.resolve(server.options.rootPath, "www", name);
    },

    async getConfig<T>(section: string): Promise<T> {
      let configParent: Record<string, T | undefined> = {};

      const rootFilePath = path.resolve(server.options.rootPath, ".config.json");
      const rootConfig = await getConfig<Record<string, T>>(rootFilePath);
      if (rootConfig != null) {
        configParent = rootConfig;
      }

      const targetPath = this.clientPath;
      if (targetPath != null) {
        const clientFilePath = path.resolve(targetPath, ".config.json");
        const clientConfig = await getConfig<Record<string, T>>(clientFilePath);
        if (clientConfig != null) {
          configParent = objMerge(configParent, clientConfig);
        }
      }

      const config = configParent[section];
      if (config == null) throw new Error(`설정 섹션을 찾을 수 없습니다: ${section}`);
      return config;
    },
  };
}

// ── Auth ──

const AUTH_PERMISSIONS = Symbol("authPermissions");

/** Read auth permissions from an auth()-wrapped function. Returns undefined if not wrapped. */
export function getServiceAuthPermissions(fn: Function): string[] | undefined {
  return (fn as unknown as Record<symbol, unknown>)[AUTH_PERMISSIONS] as string[] | undefined;
}

/**
 * Auth wrapper for service factories and methods.
 *
 * - Service-level: `auth((ctx) => ({ ... }))` — all methods require login
 * - Service-level with roles: `auth(["admin"], (ctx) => ({ ... }))`
 * - Method-level: `auth(() => result)` — this method requires login
 * - Method-level with roles: `auth(["admin"], () => result)`
 */
export function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;
export function auth<TFunction extends (...args: any[]) => any>(permissions: string[], fn: TFunction): TFunction;
export function auth(permissionsOrFn: string[] | Function, maybeFn?: Function): Function {
  const permissions = Array.isArray(permissionsOrFn) ? permissionsOrFn : [];
  const fn = Array.isArray(permissionsOrFn) ? maybeFn! : permissionsOrFn;

  // Create wrapper that preserves call behavior
  const wrapper = (...args: unknown[]) => fn(...args);
  (wrapper as unknown as Record<symbol, unknown>)[AUTH_PERMISSIONS] = permissions;

  return wrapper;
}

// ── Service Definition ──

export interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}

/**
 * Define a service with a name and factory function.
 *
 * @example
 * // Basic service
 * const HealthService = defineService("Health", (ctx) => ({
 *   check: () => ({ status: "ok" }),
 * }));
 *
 * // Service with auth
 * const UserService = defineService("User", auth((ctx) => ({
 *   getProfile: () => ctx.authInfo,
 *   adminOnly: auth(["admin"], () => "admin"),
 * })));
 */
export function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string,
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods> {
  return {
    name,
    factory,
    authPermissions: getServiceAuthPermissions(factory),
  };
}

// ── Type Utility ──

/**
 * Extract method signatures from a ServiceDefinition for client-side type sharing.
 *
 * @example
 * export type UserServiceType = ServiceMethods<typeof UserService>;
 * // Client: client.getService<UserServiceType>("User");
 */
export type ServiceMethods<TDefinition> = TDefinition extends ServiceDefinition<infer M> ? M : never;
