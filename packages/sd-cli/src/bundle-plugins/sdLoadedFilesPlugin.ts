import esbuild from "esbuild";

export function sdLoadedFilesPlugin(conf: {
  loadedFileSet: Set<string>;
}): esbuild.Plugin {
  return {
    name: "sd-loaded-files",
    setup: (build: esbuild.PluginBuild) => {
      build.onStart(() => {
        conf.loadedFileSet.clear();
      });

      build.onLoad({filter: /.*/}, (args) => {
        conf.loadedFileSet.add(args.path);
        return null;
      });
    }
  };
}