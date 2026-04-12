import { fsx, pathx } from "@simplysm/core-node";
import type { SdCapacitorConfig } from "../sd-config.types.js";

/**
 * capacitor.config.ts를 생성한다.
 */
export async function writeCapacitorConfig(
  capPath: string,
  config: SdCapacitorConfig,
): Promise<void> {
  const confPath = pathx.posixResolve(capPath, "capacitor.config.ts");

  const pluginOptions: Record<string, Record<string, unknown>> = {};
  for (const [pluginName, options] of Object.entries(config.plugins ?? {})) {
    if (options !== true) {
      const configKey = toPascalCase(pluginName.split("/").at(-1)!);
      pluginOptions[configKey] = options;
    }
  }

  const pluginsConfigStr =
    Object.keys(pluginOptions).length > 0
      ? JSON.stringify(pluginOptions, null, 2).replace(/^/gm, "  ").trim()
      : "{}";

  const configContent = `import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "${config.appId}",
  appName: "${config.appName}",
  server: {
    androidScheme: "http",
    cleartext: true
  },
  android: {},
  plugins: ${pluginsConfigStr},
};

export default config;
`;

  await fsx.write(confPath, configContent);
}

/**
 * capacitor.config.ts의 server.url을 업데이트한다.
 * WebView가 이 URL에서 웹 에셋을 로드하여 Hot Reload가 동작한다.
 */
export async function updateServerUrl(capPath: string, url: string): Promise<void> {
  const configPath = pathx.posixResolve(capPath, "capacitor.config.ts");
  let content = await fsx.read(configPath);

  if (content.includes("url:")) {
    content = content.replace(/url:\s*"[^"]*"/, `url: "${url}"`);
  } else if (content.includes("server:")) {
    content = content.replace(/server:\s*\{/, `server: {\n    url: "${url}",`);
  }

  await fsx.write(configPath, content);
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase());
}
