import type { PluginOption, ResolvedConfig } from "vite";
import type { SdPwaConfig } from "../sd-config.types.js";
import { generatePwaIcons } from "./generate-pwa-icons.js";
import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";

export interface SdPwaPluginOptions {
  pkgDir: string;
  pkgName: string;
  pwa?: SdPwaConfig;
}

export function sdPwaPlugin(options: SdPwaPluginOptions): PluginOption {
  const pwaConfig = options.pwa ?? {};
  let resolvedBase: string;
  let resolvedOutDir: string;

  return {
    name: "sd-pwa",

    configResolved(config: ResolvedConfig) {
      resolvedBase = config.base;
      resolvedOutDir = config.build.outDir;
    },

    transformIndexHtml() {
      return [
        {
          tag: "link",
          attrs: { rel: "manifest", href: "manifest.webmanifest" },
          injectTo: "head" as const,
        },
        {
          tag: "script",
          children: generateRegistrationScript(),
          injectTo: "body" as const,
        },
      ];
    },

    async closeBundle() {
      // Read version from package.json
      const pkgJsonPath = path.join(options.pkgDir, "package.json");
      const pkgJson = JSON.parse(
        fs.readFileSync(pkgJsonPath, "utf-8"),
      ) as Record<string, unknown>;
      const version = pkgJson["version"] as string;

      // Icons
      let iconsField: Record<string, unknown> = {};
      if (pwaConfig.manifest?.icons != null) {
        iconsField = { icons: pwaConfig.manifest.icons };
      } else {
        const generated = await generatePwaIcons(options.pkgDir);
        if (generated.length > 0) {
          iconsField = { icons: generated };
        }
      }

      // Manifest
      const manifest = {
        name: pwaConfig.manifest?.name ?? options.pkgName,
        short_name: pwaConfig.manifest?.short_name ?? options.pkgName,
        display: pwaConfig.manifest?.display ?? "standalone",
        theme_color: pwaConfig.manifest?.theme_color ?? "#ffffff",
        background_color: pwaConfig.manifest?.background_color ?? "#ffffff",
        start_url: ".",
        scope: ".",
        ...iconsField,
      };

      fs.writeFileSync(
        path.join(resolvedOutDir, "manifest.webmanifest"),
        JSON.stringify(manifest, null, 2),
      );

      // Precache file list
      const globPatterns = pwaConfig.workbox?.globPatterns ?? [
        "**/*.{js,css,html,ico,png,svg,woff2}",
      ];
      const globResults = await Promise.all(
        globPatterns.map((pattern) => glob(pattern, { cwd: resolvedOutDir })),
      );
      const precacheUrls = [...new Set(globResults.flat())]
        .filter((f) => f !== "sw.js" && f !== "manifest.webmanifest")
        .map((f) => f.replace(/\\/g, "/"));

      // Service Worker
      const swContent = generateSwContent(version, resolvedBase, precacheUrls);
      fs.writeFileSync(path.join(resolvedOutDir, "sw.js"), swContent);
    },
  };
}

function generateRegistrationScript(): string {
  return `(function(){
  if(!("serviceWorker" in navigator))return;
  navigator.serviceWorker.register("sw.js").then(function(reg){
    if(reg.waiting){d(reg.waiting);return}
    reg.addEventListener("updatefound",function(){
      var w=reg.installing;
      if(!w)return;
      w.addEventListener("statechange",function(){
        if(w.state==="installed"&&navigator.serviceWorker.controller)d(w);
      });
    });
  });
  var r=false;
  navigator.serviceWorker.addEventListener("controllerchange",function(){
    if(!r){r=true;window.location.reload()}
  });
  function d(w){
    window.dispatchEvent(new CustomEvent("sd-pwa-update-ready",{
      detail:{update:function(){w.postMessage({type:"SKIP_WAITING"})}}
    }));
  }
})();`;
}

function generateSwContent(
  version: string,
  base: string,
  precacheUrls: string[],
): string {
  const urlsArray = JSON.stringify(precacheUrls, null, 2);
  return `const APP_VERSION = ${JSON.stringify(version)};
const CACHE_NAME = "precache-" + APP_VERSION;
const BASE_URL = ${JSON.stringify(base)};
const PRECACHE_URLS = ${urlsArray};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("precache-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        return caches.match(BASE_URL + "index.html").then((resp) => resp || fetch(event.request));
      }
      return fetch(event.request);
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
`;
}
