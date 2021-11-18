import { createMatchPath, loadConfig } from "tsconfig-paths";
import * as hooks from "ts-node/esm";
import * as path from "path";

export const resolve = async (specifier, ctx, fn) => {
  const result = loadConfig(process.cwd());
  if (result.resultType === "failed") throw new Error(result.message);

  const {
    absoluteBaseUrl,
    paths
  } = result;

  const match = createMatchPath(absoluteBaseUrl, paths)(specifier);
  if (match) specifier = "file:///" + match;

  return await hooks.resolve(specifier, ctx, fn);
};

// export const load = async (url, context, defaultLoad) => {
//   const ext = path.extname(url);
//   if (
//     url.startsWith("file://")
//     && (!ext || ext === ".ts")
//   ) {
//     Object.assign(context, { format: "module" });
//   }
//   return await hooks.load(url, context, defaultLoad);
// };

export const load = hooks.load;
export const transformSource = hooks.transformSource;
