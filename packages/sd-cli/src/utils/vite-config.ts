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
import { FsWatcher } from "@simplysm/core-node";

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
function sdScopeWatchPlugin(pkgDir: string, scopes: string[], onScopeRebuild?: () => void): Plugin {
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

              // subpath-only 패키지 필터링: 두 경로를 시도하여 확인
              // pnpm 구조에서 realpath를 따라 .pnpm node_modules에서 먼저 찾기
              const realPkgPath = fs.realpathSync(path.join(scopeDir, name));
              const pnpmNodeModules = path.resolve(realPkgPath, "../..");
              const depPkgJsonResolved = path.join(pnpmNodeModules, dep, "package.json");
              if (isSubpathOnlyPackage(depPkgJsonResolved)) {
                continue;
              }

              // workspace 패키지는 realpath가 소스 디렉토리로 해석되어 .pnpm 구조가 아님
              // symlink 경로의 node_modules에서 fallback 시도
              const depPkgJsonFallback = path.join(scopeDir, name, "node_modules", dep, "package.json");
              if (isSubpathOnlyPackage(depPkgJsonFallback)) {
                continue;
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
          force: true,
          exclude: excluded,
          include: [...new Set(nestedDepsToInclude)],
        },
      };
    },
    async configureServer(server) {
      const watchPaths: string[] = [];

      for (const scope of scopes) {
        const scopeDir = path.join(pkgDir, "node_modules", scope);
        if (!fs.existsSync(scopeDir)) continue;

        for (const pkgName of fs.readdirSync(scopeDir)) {
          const pkgRoot = path.join(scopeDir, pkgName);

          // dist 디렉토리 watch (JS/TS 빌드 결과물)
          const distDir = path.join(pkgRoot, "dist");
          if (fs.existsSync(distDir)) {
            watchPaths.push(distDir);
          }

          // 패키지 루트의 CSS/config 파일 watch (tailwind.css, tailwind.config.ts 등)
          for (const file of fs.readdirSync(pkgRoot)) {
            if (file.endsWith(".css") || file === "tailwind.config.ts" || file === "tailwind.config.js") {
              watchPaths.push(path.join(pkgRoot, file));
            }
          }
        }
      }

      if (watchPaths.length === 0) return;

      // Vite의 기본 watcher는 **/node_modules/**를 ignore하고
      // server.watcher.add()로는 이 패턴을 override할 수 없다.
      // 별도의 FsWatcher로 scope 패키지의 dist 디렉토리를 감시한다.
      const scopeWatcher = await FsWatcher.watch(watchPaths);
      scopeWatcher.onChange({ delay: 300 }, (changeInfos) => {
        for (const { path: changedPath } of changeInfos) {
          // pnpm symlink → real path 변환 (Vite module graph은 real path 사용)
          let realPath: string;
          try {
            realPath = fs.realpathSync(changedPath);
          } catch {
            continue; // 삭제된 파일
          }

          // Vite의 내부 HMR 파이프라인 트리거
          server.watcher.emit("change", realPath);
        }

        onScopeRebuild?.();
      });

      // 서버 종료 시 watcher 정리
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
  /** watch 대상 scope 목록 (예: ["@myapp", "@simplysm"]) */
  watchScopes?: string[];
  /** scope 패키지 dist 변경 감지 시 콜백 */
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
  const { pkgDir, name, tsconfigPath, compilerOptions, env, mode, serverPort, watchScopes } = options;

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
      sdTailwindConfigDepsPlugin(pkgDir),
      ...(watchScopes != null && watchScopes.length > 0
        ? [sdScopeWatchPlugin(pkgDir, watchScopes, options.onScopeRebuild)]
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
      port: serverPort === 0 ? undefined : serverPort,
      strictPort: serverPort !== 0 && serverPort !== undefined,
    };
  }

  return config;
}
