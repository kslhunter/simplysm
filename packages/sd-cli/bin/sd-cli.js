#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "../dist/sd-cli.js");

spawn("node", ["--import=specifier-resolution-node/register", cliPath, ...process.argv.slice(2)], {
  stdio: "inherit"
});