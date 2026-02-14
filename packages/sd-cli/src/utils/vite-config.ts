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

/**
 * Tailwind config의 scope 패키지 의존성을 watch하는 Vite 플러그인.
 *
 * Tailwind CSS의 내장 의존성 추적은 상대 경로 import만 처리하므로,
 * preset 등으로 참조하는 scope 패키지의 config 변경을 감지하지 못한다.
 * 이 플러그인이 해당 파일들을 watch하고, 변경 시 Tailwind 캐시를 무효화한다.
 */
function sdTailwindConfigDepsPlugin(pkgDir: string): Plugin {
  return {
    name: "sd-tailwind-config-deps",
    configureServer(server) {
      const configPath = path.join(pkgDir, "tailwind.config.ts");
      if (!fs.existsSync(configPath)) return;

      // 현재 패키지의 scope + @simplysm 을 항상 포함
      const pkgJsonPath = path.join(pkgDir, "package.json");
      const pkgName = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")).name as string;
      const pkgScope = pkgName.match(/^(@[^/]+)\//)?.[1];
      const scopes = new Set(["@simplysm"]);
      if (pkgScope != null) {
        scopes.add(pkgScope);
      }

      const allDeps = getTailwindConfigDeps(configPath, [...scopes]);
      const configAbsolute = path.resolve(configPath);
      const externalDeps = allDeps.filter((d) => d !== configAbsolute);
      if (externalDeps.length === 0) return;

      for (const dep of externalDeps) {
        server.watcher.add(dep);
      }

      server.watcher.on("change", (changed) => {
        if (externalDeps.some((d) => path.normalize(d) === path.normalize(changed))) {
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
 * scope 패키지의 dist 디렉토리 변경을 감지하는 Vite 플러그인.
 *
 * Vite는 node_modules를 기본적으로 watch에서 제외하므로,
 * scope 패키지의 dist 파일이 변경되어도 HMR/리빌드가 트리거되지 않는다.
 * 이 플러그인은 scope 패키지의 dist 디렉토리를 watcher에 명시적으로 추가하고,
 * optimizeDeps에서 제외하여 pre-bundled 캐시로 인한 변경 무시를 방지한다.
 */
function sdScopeWatchPlugin(pkgDir: string, scopes: string[]): Plugin {
  return {
    name: "sd-scope-watch",
    config() {
      const excluded: string[] = [];
      const nestedDepsToInclude: string[] = [];

      for (const scope of scopes) {
        // scope 패키지를 pre-bundling에서 제외하여 소스 코드로 취급
        const scopeDir = path.join(pkgDir, "node_modules", scope);
        if (!fs.existsSync(scopeDir)) continue;

        for (const name of fs.readdirSync(scopeDir)) {
          excluded.push(`${scope}/${name}`);

          // excluded 패키지의 dependencies를 nested include로 추가하여 pre-bundling 보장
          // Vite nested dependency 구문: "excluded-pkg > dep"
          // (pnpm strict 모듈 격리에서 transitive dep을 resolve하기 위해 필요)
          const depPkgJsonPath = path.join(scopeDir, name, "package.json");
          try {
            const depPkgJson = JSON.parse(fs.readFileSync(depPkgJsonPath, "utf-8")) as {
              dependencies?: Record<string, string>;
            };
            const excludedPkg = `${scope}/${name}`;
            for (const dep of Object.keys(depPkgJson.dependencies ?? {})) {
              // 같은 scope 내 패키지는 이미 excluded이므로 제외
              if (scopes.some((s) => dep.startsWith(`${s}/`))) continue;
              // SolidJS 관련 패키지는 solid 플러그인 transform이 필요하므로 pre-bundling 불가
              if (dep === "solid-js" || dep.startsWith("@solidjs/") || dep.startsWith("solid-")) continue;
              // PostCSS/빌드 도구는 브라우저 pre-bundling 대상 아님
              if (dep === "tailwindcss") continue;

              // subpath-only 패키지 필터링 (exports에 "."이 없는 패키지는 pre-bundling 불가)
              // 예: @tiptap/pm은 "./state", "./view" 등 subpath만 export
              // pnpm 구조: realpath 따라가서 sibling node_modules에서 dep 찾기
              try {
                const realPkgPath = fs.realpathSync(path.join(scopeDir, name));
                // @scope/name → 2단계 위 = .pnpm/.../node_modules/
                const pnpmNodeModules = path.resolve(realPkgPath, "../..");
                const depPkgJsonResolved = path.join(pnpmNodeModules, dep, "package.json");
                const depPkg = JSON.parse(fs.readFileSync(depPkgJsonResolved, "utf-8")) as {
                  exports?: Record<string, unknown> | string;
                  main?: string;
                  module?: string;
                };
                if (
                  depPkg.exports != null &&
                  typeof depPkg.exports === "object" &&
                  !("." in depPkg.exports) &&
                  depPkg.main == null &&
                  depPkg.module == null
                ) {
                  continue;
                }
              } catch {
                // dep package.json을 읽을 수 없으면 일단 포함 (Vite가 알아서 처리)
              }

              nestedDepsToInclude.push(`${excludedPkg} > ${dep}`);
            }
          } catch {
            // package.json 읽기 실패 시 스킵
          }
        }
      }

      return {
        optimizeDeps: {
          exclude: excluded,
          include: [...new Set(nestedDepsToInclude)],
        },
      };
    },
    configureServer(server) {
      for (const scope of scopes) {
        const scopeDir = path.join(pkgDir, "node_modules", scope);
        if (!fs.existsSync(scopeDir)) continue;

        for (const pkgName of fs.readdirSync(scopeDir)) {
          const distDir = path.join(scopeDir, pkgName, "dist");
          if (fs.existsSync(distDir)) {
            server.watcher.add(distDir);
          }
        }
      }
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
  /** watch 대상 scope 목록 (예: ["@myapp", "@simplysm"]) */
  watchScopes?: string[];
}

/**
 * Vite 설정 생성
 *
 * SolidJS + TailwindCSS 기반의 client 패키지 빌드/개발 서버용 설정입니다.
 * - build 모드: production 빌드 (logLevel: silent)
 * - dev 모드: dev server (define으로 env 치환, server 설정)
 */
export function createViteConfig(options: ViteConfigOptions): ViteUserConfig {
  const { pkgDir, name, tsconfigPath, compilerOptions, env, mode, serverPort, watchScopes } = options;

  // Read package.json to extract app name for PWA manifest
  const pkgJsonPath = path.join(pkgDir, "package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as { name: string };
  const appName = pkgJson.name.replace(/^@[^/]+\//, "");

  // process.env 치환 (dev 모드에서만 사용, build 모드는 inline으로 처리됨)
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
      sdTailwindConfigDepsPlugin(pkgDir),
      ...(watchScopes != null && watchScopes.length > 0 ? [sdScopeWatchPlugin(pkgDir, watchScopes)] : []),
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

  if (mode === "build") {
    config.logLevel = "silent";
  } else {
    // dev 모드
    config.define = envDefine;
    config.server = {
      port: serverPort === 0 ? undefined : serverPort,
      strictPort: serverPort !== 0 && serverPort !== undefined,
    };
  }

  return config;
}
