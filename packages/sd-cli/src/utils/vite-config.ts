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
 * Vite plugin that watches scope package dependencies of a Tailwind config.
 *
 * Tailwind CSS's built-in dependency tracking only handles relative path imports,
 * so it cannot detect config changes in scope packages referenced via presets.
 * This plugin watches those files and invalidates the Tailwind cache on change.
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
          // Clear require cache used by jiti (Tailwind's config loader)
          // so changed files are re-read on config reload
          const _require = createRequire(import.meta.url);
          for (const dep of allDeps) {
            delete _require.cache[dep];
          }

          // Invalidate Tailwind cache: update config mtime to trigger reload
          const now = new Date();
          fs.utimesSync(configPath, now, now);
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}

/**
 * Check if a package is subpath-only export (no "." in exports field)
 *
 * e.g., @tiptap/pm only exports "./state", "./view" etc., so pre-bundling is not possible.
 * Tries two paths in pnpm structure:
 * 1. Follow realpath to find in .pnpm node_modules
 * 2. Fallback to symlinked workspace package's node_modules
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
    // Return false on read failure (include in pre-bundling)
  }
  return false;
}

/**
 * Vite plugin that serves files from public-dev/ directory with priority over public/ in dev mode.
 * Keeps Vite's default publicDir (public/) while giving precedence to public-dev/ files at the same path.
 */
function sdPublicDevPlugin(pkgDir: string): Plugin {
  const publicDevDir = path.join(pkgDir, "public-dev");

  return {
    name: "sd-public-dev",
    configureServer(server) {
      if (!fs.existsSync(publicDevDir)) return;

      // Check public-dev/ files before Vite's default static serving
      server.middlewares.use((req, res, next) => {
        if (req.url == null) {
          next();
          return;
        }

        // Strip base path
        const base = server.config.base || "/";
        let urlPath = req.url.split("?")[0];
        if (urlPath.startsWith(base)) {
          urlPath = urlPath.slice(base.length);
        }
        if (urlPath.startsWith("/")) {
          urlPath = urlPath.slice(1);
        }

        // Path traversal defense: block access to files outside publicDevDir
        const decodedPath = decodeURIComponent(urlPath);
        const filePath = path.resolve(publicDevDir, decodedPath);
        const normalizedRoot = path.resolve(publicDevDir);
        if (!filePath.startsWith(normalizedRoot + path.sep) && filePath !== normalizedRoot) {
          next();
          return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // Respond with file stream instead of sirv
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
 * Vite plugin that detects changes in scope packages' dist directories.
 *
 * Vite excludes node_modules from watch by default, so dist file changes
 * in scope packages do not trigger HMR/rebuild.
 * This plugin uses a separate FsWatcher to monitor scope packages' dist directories
 * and triggers Vite's internal HMR pipeline on change.
 * Excludes from optimizeDeps to prevent changes being ignored due to pre-bundled cache.
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
          // Skip on package.json read failure
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
 * Vite config generation options
 */
export interface ViteConfigOptions {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  mode: "build" | "dev";
  /** Server port in dev mode (0 for auto-assign) */
  serverPort?: number;
  /** Array of replaceDeps package names (resolved state) */
  replaceDeps?: string[];
  /** Callback when replaceDeps package dist changes */
  onScopeRebuild?: () => void;
}

/**
 * Create Vite config
 *
 * Configuration for building/dev server for client packages based on SolidJS + TailwindCSS.
 * - build mode: production build (logLevel: silent)
 * - dev mode: dev server (env substitution via define, server configuration)
 */
export function createViteConfig(options: ViteConfigOptions): ViteUserConfig {
  const { pkgDir, name, tsconfigPath, compilerOptions, env, mode, serverPort, replaceDeps } =
    options;

  // Read package.json to extract app name for PWA manifest
  const pkgJsonPath = path.join(pkgDir, "package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as { name: string };
  const appName = pkgJson.name.replace(/^@[^/]+\//, "");

  // Process.env substitution (applied to both build and dev modes)
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

  // Process.env substitution (applied to both build and dev modes)
  config.define = envDefine;

  if (mode === "build") {
    config.logLevel = "silent";
  } else {
    // Dev mode
    config.server = {
      // serverPort === 0: server-connected client (proxy target)
      // → explicitly set host to 127.0.0.1 to ensure IPv4 binding
      //   (On Windows, if localhost resolves to ::1 (IPv6), proxy connection to 127.0.0.1 causes ECONNREFUSED)
      host: serverPort === 0 ? "127.0.0.1" : undefined,
      port: serverPort === 0 ? undefined : serverPort,
      strictPort: serverPort !== 0 && serverPort !== undefined,
    };
  }

  return config;
}
