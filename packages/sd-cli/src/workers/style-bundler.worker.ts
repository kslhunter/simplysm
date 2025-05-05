import { createSdWorker, SdLogger, SdLoggerSeverity, TNormPath } from "@simplysm/sd-core-node";
import { TStyleBundlerWorkerType } from "../types/worker.types";
import { EventEmitter } from "events";
import {
  ComponentStylesheetBundler,
} from "@angular/build/src/tools/esbuild/angular/component-stylesheets";
import { transformSupportedBrowsersToTargets } from "@angular/build/src/tools/esbuild/utils";
import browserslist from "browserslist";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

if (process.env["SD_DEBUG"] != null) {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.debug,
    },
  });
}
else {
  SdLogger.setConfig({
    dot: true,
  });
}

let stylesheetBundler: ComponentStylesheetBundler;

createSdWorker<TStyleBundlerWorkerType>({
  prepare(rootPath: string, dev: boolean) {
    //-- stylesheetBundler
    stylesheetBundler = new ComponentStylesheetBundler(
      {
        workspaceRoot: rootPath,
        optimization: !dev,
        inlineFonts: true,
        preserveSymlinks: false,
        sourcemap: dev ? "inline" : false,
        outputNames: { bundles: "[name]", media: "media/[name]" },
        includePaths: [],
        // sass:
        externalDependencies: [],
        target: transformSupportedBrowsersToTargets(browserslist(["Chrome > 78"])),
        tailwindConfiguration: undefined,
        postcssConfiguration: {
          plugins: [["css-has-pseudo"]],
        },
        // publicPath:
        cacheOptions: {
          enabled: true,
          path: ".cache/angular",
          basePath: ".cache",
        },
      },
      "scss",
      dev,
    );
  },
  async bundle(
    data: string,
    containingFile: TNormPath,
    resourceFile: TNormPath | null = null,
  ) {
    return resourceFile != null
      ? await stylesheetBundler!.bundleFile(resourceFile)
      : await stylesheetBundler!.bundleInline(data, containingFile, "scss");
  },
  invalidate(fileNPathSet: Set<TNormPath>) {
    stylesheetBundler.invalidate(fileNPathSet);
  },
});
