import fs from "fs";
import { createRequire } from "module";
import path from "path";
import type { Plugin, UserConfig as ViteUserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import solidPlugin from "vite-plugin-solid";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "tailwindcss";
import type esbuild from "esbuild";
import { getTailwindConfigDeps } from "./tailwind-config-deps.js";
import { FsWatcher, pathNorm } from "@simplysm/core-node";

/**
 * Tailwind config의 scope 패키지 의존성을 watch하는 Vite 플러그인.
 *
 * Tailwind CSS의 내장 의존성 추적은 상대 경로 import만 처리하므로,
 * preset 등으로 참조하는 scope 패키지의 config 변경을 감지하지 못한다.
 * 이 플러그인이 해당 파일들을 watch하고, 변경 시 Tailwind 캐시를 무효화한다.
 */
function sdTailwindConfigDepsPlugin(pkgDir: string, replaceDeps: string[]): Plugin {
  return {
    name: "sd-tailwind-config-deps",
    configureServer(server) {
      const configPath = path.join(pkgDir, "tailwind.config.ts");
      if (!fs.existsSync(configPath)) return;

      const allDeps = getTailwindConfigDeps(configPath, replaceDeps);
      const configAbsolute = path.resolve(configPath);
      const externalDeps = allDeps.filter((d) => d !== configAbsolute);
      if (externalDeps.length === 0) return;

      for (const dep of externalDeps) {
        server.watcher.add(dep);
      }

      server.watcher.on("change", (changed) => {
        if (externalDeps.some((d) => pathNorm(d) === pathNorm(changed))) {
          // jiti (Tailwind의 config 로더)가 사용하는 require 캐시를 정리하여
          // config 재로드 시 변경된 파일이 새로 읽히도록 한다
          const _require = createRequire(import.meta.url);
          for (const dep of allDeps) {
            delete _require.cache[dep];
          }

          // Tailwind 캐시 무효화: config의 mtime을 갱신하여 재로드 유도
          const now = new Date();
          fs.utimesSync(configPath, now, now);
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}

/**
 * 패키지가 subpath-only export인지 확인 (exports에 "."이 없는 패키지)
 *
 * 예: @tiptap/pm은 "./state", "./view" 등 subpath만 export하므로 pre-bundling 불가
 * pnpm 구조에서 두 경로를 시도:
 * 1. realpath를 따라 .pnpm node_modules에서 찾기
 * 2. symlink된 workspace 패키지의 node_modules에서 fallback
 */
function isSubpathOnlyPackage(pkgJsonPath: string): boolean {
  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as {
      exports?: Record<string, unknown> | string;
      main?: string;
      module?: string;
    };
    if (
      pkgJson.exports != null &&
      typeof pkgJson.exports === "object" &&
      !("." in pkgJson.exports) &&
      pkgJson.main == null &&
      pkgJson.module == null
    ) {
      return true;
    }
  } catch {
    // 읽기 실패 시 false 반환 (pre-bundling 포함)
  }
  return false;
}

/**
 * public-dev/ 디렉토리의 파일을 dev 모드에서 public/보다 우선하여 서빙하는 Vite 플러그인.
 * Vite의 기본 publicDir(public/)은 그대로 유지하면서, public-dev/의 파일이 같은 경로에 있으면 우선한다.
 */
function sdPublicDevPlugin(pkgDir: string): Plugin {
  const publicDevDir = path.join(pkgDir, "public-dev");

  return {
    name: "sd-public-dev",
    configureServer(server) {
      if (!fs.existsSync(publicDevDir)) return;

      // Vite의 기본 static 서빙보다 먼저 public-dev/ 파일을 체크
      server.middlewares.use((req, res, next) => {
        if (req.url == null) {
          next();
          return;
        }

        // base path 제거
        const base = server.config.base || "/";
        let urlPath = req.url.split("?")[0];
        if (urlPath.startsWith(base)) {
          urlPath = urlPath.slice(base.length);
        }
        if (urlPath.startsWith("/")) {
          urlPath = urlPath.slice(1);
        }

        const filePath = path.join(publicDevDir, urlPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // sirv 대신 간단히 파일 스트림으로 응답
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
        } else {
          next();
        }
      });
    },
  };
}

/**
 * scope 패키지의 dist 디렉토리 변경을 감지하는 Vite 플러그인.
 *
 * Vite는 node_modules를 기본적으로 watch에서 제외하므로,
 * scope 패키지의 dist 파일이 변경되어도 HMR/리빌드가 트리거되지 않는다.
 * 이 플러그인은 별도의 FsWatcher로 scope 패키지의 dist 디렉토리를 감시하고,
 * 변경 시 Vite의 내부 HMR 파이프라인을 트리거한다.
 * optimizeDeps에서 제외하여 pre-bundled 캐시로 인한 변경 무시를 방지한다.
 */
function sdScopeWatchPlugin(
  pkgDir: string,
  replaceDeps: string[],
  onScopeRebuild?: () => void,
): Plugin {
  return {
    name: "sd-scope-watch",
    config() {
      const excluded: string[] = [];
      const nestedDepsToInclude: string[] = [];

      for (const pkg of replaceDeps) {
        excluded.push(pkg);

        const pkgParts = pkg.split("/");
        const depPkgJsonPath = path.join(pkgDir, "node_modules", ...pkgParts, "package.json");
        try {
          const depPkgJson = JSON.parse(fs.readFileSync(depPkgJsonPath, "utf-8")) as {
            dependencies?: Record<string, string>;
          };
          for (const dep of Object.keys(depPkgJson.dependencies ?? {})) {
            if (replaceDeps.includes(dep)) continue;
            if (dep === "solid-js" || dep.startsWith("@solidjs/") || dep.startsWith("solid-"))
              continue;
            if (dep === "tailwindcss") continue;

            const realPkgPath = fs.realpathSync(path.join(pkgDir, "node_modules", ...pkgParts));
            const pnpmNodeModules = path.resolve(realPkgPath, "../..");
            const depPkgJsonResolved = path.join(pnpmNodeModules, dep, "package.json");
            if (isSubpathOnlyPackage(depPkgJsonResolved)) continue;

            const depPkgJsonFallback = path.join(
              pkgDir,
              "node_modules",
              ...pkgParts,
              "node_modules",
              dep,
              "package.json",
            );
            if (isSubpathOnlyPackage(depPkgJsonFallback)) continue;

            nestedDepsToInclude.push(`${pkg} > ${dep}`);
          }
        } catch {
          // package.json 읽기 실패 시 스킵
        }
      }

      return {
        optimizeDeps: {
          force: true,
          exclude: excluded,
          include: [...new Set(nestedDepsToInclude)],
        },
      };
    },
    async configureServer(server) {
      const watchPaths: string[] = [];

      for (const pkg of replaceDeps) {
        const pkgParts = pkg.split("/");
        const pkgRoot = path.join(pkgDir, "node_modules", ...pkgParts);
        if (!fs.existsSync(pkgRoot)) continue;

        const distDir = path.join(pkgRoot, "dist");
        if (fs.existsSync(distDir)) {
          watchPaths.push(distDir);
        }

        for (const file of fs.readdirSync(pkgRoot)) {
          if (
            file.endsWith(".css") ||
            file === "tailwind.config.ts" ||
            file === "tailwind.config.js"
          ) {
            watchPaths.push(path.join(pkgRoot, file));
          }
        }
      }

      if (watchPaths.length === 0) return;

      const scopeWatcher = await FsWatcher.watch(watchPaths);
      scopeWatcher.onChange({ delay: 300 }, (changeInfos) => {
        for (const { path: changedPath } of changeInfos) {
          let realPath: string;
          try {
            realPath = fs.realpathSync(changedPath);
          } catch {
            continue;
          }
          server.watcher.emit("change", realPath);
        }
        onScopeRebuild?.();
      });

      server.httpServer?.on("close", () => void scopeWatcher.close());
    },
  };
}

/**
 * Vite 설정 생성 옵션
 */
export interface ViteConfigOptions {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  mode: "build" | "dev";
  /** dev 모드일 때 서버 포트 (0이면 자동 할당) */
  serverPort?: number;
  /** replaceDeps 패키지명 배열 (resolve 완료된 상태) */
  replaceDeps?: string[];
  /** replaceDeps 패키지 dist 변경 감지 시 콜백 */
  onScopeRebuild?: () => void;
}

/**
 * Vite 설정 생성
 *
 * SolidJS + TailwindCSS 기반의 client 패키지 빌드/개발 서버용 설정입니다.
 * - build 모드: production 빌드 (logLevel: silent)
 * - dev 모드: dev server (define으로 env 치환, server 설정)
 */
export function createViteConfig(options: ViteConfigOptions): ViteUserConfig {
  const { pkgDir, name, tsconfigPath, compilerOptions, env, mode, serverPort, replaceDeps } =
    options;

  // Read package.json to extract app name for PWA manifest
  const pkgJsonPath = path.join(pkgDir, "package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as { name: string };
  const appName = pkgJson.name.replace(/^@[^/]+\//, "");

  // process.env 치환 (build/dev 모두 적용)
  const envDefine: Record<string, string> = {};
  if (env != null) {
    envDefine["process.env"] = JSON.stringify(env);
  }

  const config: ViteUserConfig = {
    root: pkgDir,
    base: `/${name}/`,
    plugins: [
      tsconfigPaths({ projects: [tsconfigPath] }),
      solidPlugin(),
      VitePWA({
        registerType: "prompt",
        injectRegister: "script",
        manifest: {
          name: appName,
          short_name: appName,
          display: "standalone",
          theme_color: "#ffffff",
          background_color: "#ffffff",
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
      }),
      ...(replaceDeps != null && replaceDeps.length > 0
        ? [sdTailwindConfigDepsPlugin(pkgDir, replaceDeps)]
        : []),
      ...(replaceDeps != null && replaceDeps.length > 0
        ? [sdScopeWatchPlugin(pkgDir, replaceDeps, options.onScopeRebuild)]
        : []),
      ...(mode === "dev" ? [sdPublicDevPlugin(pkgDir)] : []),
    ],
    css: {
      postcss: {
        plugins: [tailwindcss({ config: path.join(pkgDir, "tailwind.config.ts") })],
      },
    },
    esbuild: {
      tsconfigRaw: { compilerOptions: compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
    },
  };

  // process.env 치환 (build/dev 모두 적용)
  config.define = envDefine;

  if (mode === "build") {
    config.logLevel = "silent";
  } else {
    // dev 모드
    config.server = {
      // serverPort === 0: 서버 연결 클라이언트 (proxy 대상)
      // → host를 127.0.0.1로 명시하여 IPv4 바인딩 보장
      //   (Windows에서 localhost가 ::1(IPv6)로 해석되면 proxy가 127.0.0.1로 연결 시 ECONNREFUSED 발생)
      host: serverPort === 0 ? "127.0.0.1" : undefined,
      port: serverPort === 0 ? undefined : serverPort,
      strictPort: serverPort !== 0 && serverPort !== undefined,
    };
  }

  return config;
}
