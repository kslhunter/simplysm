/**
 * postinstall thin wrapper.
 * dist/가 없으면 (모노레포 개발 환경) 건너뛴다.
 */
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, "../dist/sd-claude.js");

if (existsSync(distEntry)) {
  execFileSync("node", [distEntry, "install"], { stdio: "inherit" });
}
