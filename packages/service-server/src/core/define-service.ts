import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { obj } from "@simplysm/core-common";
import { getConfig } from "../utils/config-manager";
import path from "path";

// ── 컨텍스트 ──

export interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: {
    clientName: string;
    authTokenPayload?: AuthTokenPayload<TAuthInfo>;
  };

  /** V1 레거시 컨텍스트 (자동 업데이트 전용) */
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
      return (socket?.authTokenPayload?.data ?? http?.authTokenPayload?.data) as
        | TAuthInfo
        | undefined;
    },

    get clientName(): string | undefined {
      const name = socket?.clientName ?? http?.clientName ?? legacy?.clientName;
      if (name == null) return undefined;

      if (name === "" || name.includes("..") || name.includes("/") || name.includes("\\")) {
        throw new Error(`유효하지 않은 클라이언트 이름: ${name}`);
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
          configParent = obj.merge(configParent, clientConfig);
        }
      }

      const config = configParent[section];
      if (config == null) throw new Error(`설정 섹션을 찾을 수 없습니다: ${section}`);
      return config;
    },
  };
}

// ── 인증 ──

const AUTH_PERMISSIONS = Symbol("authPermissions");

/** auth()로 래핑된 함수에서 인증 권한을 읽는다. 래핑되지 않은 경우 undefined를 반환한다. */
export function getServiceAuthPermissions(fn: Function): string[] | undefined {
  return (fn as unknown as Record<symbol, unknown>)[AUTH_PERMISSIONS] as string[] | undefined;
}

/**
 * 서비스 팩토리 및 메서드용 인증 래퍼.
 *
 * - 서비스 수준: `auth((ctx) => ({ ... }))` — 모든 메서드에 로그인 필요
 * - 서비스 수준 (역할 지정): `auth(["admin"], (ctx) => ({ ... }))`
 * - 메서드 수준: `auth(() => result)` — 해당 메서드에 로그인 필요
 * - 메서드 수준 (역할 지정): `auth(["admin"], () => result)`
 */
export function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;
export function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;
export function auth(permissionsOrFn: string[] | Function, maybeFn?: Function): Function {
  const permissions = Array.isArray(permissionsOrFn) ? permissionsOrFn : [];
  const fn = Array.isArray(permissionsOrFn) ? maybeFn! : permissionsOrFn;

  // 호출 동작을 유지하는 래퍼 생성
  const wrapper = (...args: unknown[]) => fn(...args);
  (wrapper as unknown as Record<symbol, unknown>)[AUTH_PERMISSIONS] = permissions;

  return wrapper;
}

// ── 서비스 정의 ──

export interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}

/**
 * 이름과 팩토리 함수로 서비스를 정의한다.
 *
 * @example
 * // 기본 서비스
 * const HealthService = defineService("Health", (ctx) => ({
 *   check: () => ({ status: "ok" }),
 * }));
 *
 * // 인증이 필요한 서비스
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

// ── 타입 유틸리티 ──

/**
 * 클라이언트 측 타입 공유를 위해 ServiceDefinition에서 메서드 시그니처를 추출한다.
 *
 * @example
 * export type UserServiceType = ServiceMethods<typeof UserService>;
 * // 클라이언트: client.getService<UserServiceType>("User");
 */
export type ServiceMethods<TDefinition> =
  TDefinition extends ServiceDefinition<infer M> ? M : never;
