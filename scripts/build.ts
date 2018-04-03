import * as path from "path";
import * as fs from "fs-extra";
import {build} from "./lib/build";

const packageName = process.argv[2];

fs.removeSync(path.resolve(process.cwd(), "packages", packageName, "dist"));

build(packageName);
