import {publish} from "./lib/publish";

const packageName = process.argv[2];
publish(packageName);