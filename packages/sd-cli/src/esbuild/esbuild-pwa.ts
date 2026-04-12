import type { IndexHtmlTransform } from "@angular/build/private";
import type { SdPwaConfig } from "../sd-config.types.js";
import { augmentAppWithServiceWorker } from "@angular/build/private";
import { generatePwaIcons } from "../utils/generate-pwa-icons.js";
import fs from "node:fs";
import path from "path";

export interface ApplyPwaOptions {
  /** 패키지 디렉토리 경로 */
  pkgDir: string;
  /** 패키지 표시명 */
  pkgName: string;
  /** 모노레포 루트 (workspaceRoot) */
  cwd: string;
  /** 빌드 출력 디렉토리 (dist/) */
  outdir: string;
  /** base href (기본: "/") */
  baseHref: string;
  /** 빌드 모드 */
  mode: "dev" | "build";
  /** PWA 설정. false이면 비활성화 */
  pwa?: false | SdPwaConfig;
}

export function createPwaHtmlTransform(): IndexHtmlTransform {
  return (content: string) => {
    const manifestLink = '<link rel="manifest" href="manifest.webmanifest">';
    const registrationScript = `<script>${generateRegistrationScript()}</script>`;

    content = content.replace("</head>", `${manifestLink}\n</head>`);
    content = content.replace("</body>", `${registrationScript}\n</body>`);

    return Promise.resolve(content);
  };
}

export async function applyPwa(options: ApplyPwaOptions): Promise<void> {
  if (options.mode !== "build") return;
  if (options.pwa === false) return;

  const pwaConfig = options.pwa ?? {};

  // 1. Icons
  let iconsField: Record<string, unknown> = {};
  if (pwaConfig.manifest?.icons != null) {
    iconsField = { icons: pwaConfig.manifest.icons };
  } else {
    const generated = await generatePwaIcons(options.pkgDir);
    if (generated.length > 0) {
      // Copy generated icons from public/icons/ to dist/icons/
      const srcIconsDir = path.join(options.pkgDir, "public", "icons");
      const dstIconsDir = path.join(options.outdir, "icons");
      fs.mkdirSync(dstIconsDir, { recursive: true });
      for (const icon of generated) {
        const srcPath = path.join(srcIconsDir, path.basename(icon.src));
        const dstPath = path.join(dstIconsDir, path.basename(icon.src));
        fs.copyFileSync(srcPath, dstPath);
      }
      iconsField = { icons: generated };
    }
  }

  // 2. Manifest
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
    path.join(options.outdir, "manifest.webmanifest"),
    JSON.stringify(manifest, null, 2),
  );

  // 3. Ensure ngsw-config.json exists
  const ngswConfigPath = path.join(options.pkgDir, "ngsw-config.json");
  if (!fs.existsSync(ngswConfigPath)) {
    const defaultConfig = {
      $schema: "./node_modules/@angular/service-worker/config/schema.json",
      index: "/index.html",
      assetGroups: [
        {
          name: "app",
          installMode: "prefetch",
          resources: {
            files: ["/*.html", "/*.css", "/*.js"],
          },
        },
        {
          name: "assets",
          installMode: "lazy",
          updateMode: "prefetch",
          resources: {
            files: ["/**/*.{png,jpg,svg,ico,woff2,webmanifest}"],
          },
        },
      ],
    };
    fs.writeFileSync(ngswConfigPath, JSON.stringify(defaultConfig, null, 2) + "\n");
  }

  // 4. augmentAppWithServiceWorker
  await augmentAppWithServiceWorker(
    options.pkgDir,
    options.cwd,
    options.outdir,
    options.baseHref,
  );
}

function generateRegistrationScript(): string {
  return `(function(){
  if(!("serviceWorker" in navigator))return;
  navigator.serviceWorker.register("ngsw-worker.js").then(function(reg){
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
