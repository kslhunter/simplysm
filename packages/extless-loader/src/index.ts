import {isBuiltin} from "module";
import path from "path";
import resolveCallback from "resolve";
import {fileURLToPath, pathToFileURL} from "url";

const baseURL = pathToFileURL(process.cwd() + '/').href;

export async function resolve(specifier: string, context: { parentURL: URL }, next: Function) {
  const {parentURL = baseURL} = context;

  if (isBuiltin(specifier)) {
    return next(specifier, context);
  }

  if (specifier.startsWith('file://')) {
    specifier = fileURLToPath(specifier);
  }
  const parentPath = fileURLToPath(parentURL);

  try {
    const resolution = await new Promise<string>((promiseResolve, promiseReject) => {
      resolveCallback(specifier, {
        basedir: path.dirname(parentPath),
        extensions: ['.js', '.json', '.node', '.mjs', '.cjs'],
      }, (err, resolved) => {
        if (err) {
          promiseReject(err);
          return;
        }
        promiseResolve(resolved!);
      });
    });

    return pathToFileURL(resolution).href;
  }
  catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      // Match Node's error code
      error.code = 'ERR_MODULE_NOT_FOUND';
    }
    throw error;
  }
}