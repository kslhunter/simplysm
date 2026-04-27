/**
 * publish/pack 전에 실행되어 .codex/sd-* 에셋을 packages/sd-codex/codex/에 복사한다.
 * package.json의 prepack 스크립트로 등록하여 사용.
 */
import fs from "fs";
import path from "path";
import { collectCodexEntries, shouldCopyCodexAsset } from "./sd-entries.mjs";

const pkgDir = process.cwd();
const projectRoot = path.resolve(pkgDir, "../..");
const codexDir = path.join(projectRoot, ".codex");
const targetDir = path.join(pkgDir, "codex");

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true });
}

if (!fs.existsSync(codexDir)) {
  console.log("[@simplysm/sd-codex] Source .codex directory does not exist.");
  process.exit(0);
}

const allEntries = collectCodexEntries(codexDir).filter(
  (rel) => !rel.replace(/\\/g, "/").startsWith("evals/"),
);

for (const entry of allEntries) {
  const src = path.join(codexDir, entry);
  const dest = path.join(targetDir, entry);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    filter: shouldCopyCodexAsset,
  });
}

console.log(`Synchronized ${allEntries.length} sd-* assets.`);
