import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const isProd = here.includes(`${path.sep}dist${path.sep}`);
const pkgRoot = path.resolve(here, isProd ? "../../.." : "../../..");

export const TEMPLATES_ROOT = path.join(pkgRoot, "src", "commands", "init", "templates");
