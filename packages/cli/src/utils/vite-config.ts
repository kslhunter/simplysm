import path from "path";
import type { UserConfig as ViteUserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "tailwindcss";
import type esbuild from "esbuild";

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
}

/**
 * Vite 설정 생성
 *
 * SolidJS + TailwindCSS 기반의 client 패키지 빌드/개발 서버용 설정입니다.
 * - build 모드: production 빌드 (logLevel: silent)
 * - dev 모드: dev server (define으로 env 치환, server 설정)
 */
export function createViteConfig(options: ViteConfigOptions): ViteUserConfig {
  const { pkgDir, name, tsconfigPath, compilerOptions, env, mode, serverPort } = options;

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
