#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";

const [cmd, ...args] = process.argv.slice(2);

function run(command, opts) {
  execSync(command, { encoding: "utf-8", stdio: "inherit", ...opts });
}

function getOutput(command) {
  return execSync(command, { encoding: "utf-8" }).trim();
}

// 메인 working tree 경로 (worktree 안에서 실행해도 정확)
const mainWorktree = getOutput("git worktree list --porcelain")
  .split("\n")[0]
  .replace("worktree ", "");

function detectWorktreeName() {
  const cwd = process.cwd();
  const worktreesDir = resolve(mainWorktree, ".worktrees");
  if (cwd.startsWith(worktreesDir + sep)) {
    return cwd.slice(worktreesDir.length + 1).split(sep)[0];
  }
  return undefined;
}

function getMainBranch() {
  return getOutput(`git -C "${mainWorktree}" rev-parse --abbrev-ref HEAD`);
}

switch (cmd) {
  case "add": {
    const name = args[0];
    if (!name) {
      console.error("Usage: sd-worktree.mjs add <kebab-case-name>");
      process.exit(1);
    }
    const worktreePath = resolve(mainWorktree, ".worktrees", name);
    if (existsSync(worktreePath)) {
      console.error(`Already exists: ${worktreePath}`);
      process.exit(1);
    }
    const branch = getMainBranch();
    console.log(`Creating worktree: .worktrees/${name} (from ${branch})`);
    run(`git worktree add "${worktreePath}" -b "${name}"`);
    console.log("Installing dependencies...");
    run("pnpm install", { cwd: worktreePath });
    console.log(`\nReady: ${worktreePath}`);
    break;
  }

  case "merge": {
    const name = args[0] ?? detectWorktreeName();
    if (!name) {
      console.error("Usage: sd-worktree.mjs merge [name]  (or run inside .worktrees/<name>)");
      process.exit(1);
    }
    // uncommitted 변경 확인
    const worktreePath_m = resolve(mainWorktree, ".worktrees", name);
    if (existsSync(worktreePath_m)) {
      const status = getOutput(`git -C "${worktreePath_m}" status --porcelain`);
      if (status) {
        console.error(`Error: worktree '${name}' has uncommitted changes:\n${status}`);
        console.error("Commit or stash changes before merging.");
        process.exit(1);
      }
    }
    const branch = getMainBranch();
    console.log(`Merging '${name}' into '${branch}'...`);
    run(`git merge "${name}" --no-ff`, { cwd: mainWorktree });
    console.log(`\nMerged '${name}' into '${branch}'.`);
    break;
  }

  case "rebase": {
    const name = args[0] ?? detectWorktreeName();
    if (!name) {
      console.error("Usage: sd-worktree.mjs rebase [name]  (or run inside .worktrees/<name>)");
      process.exit(1);
    }
    const worktreePath_r = resolve(mainWorktree, ".worktrees", name);
    if (!existsSync(worktreePath_r)) {
      console.error(`Error: worktree '${name}' does not exist.`);
      process.exit(1);
    }
    // uncommitted 변경 확인
    const statusR = getOutput(`git -C "${worktreePath_r}" status --porcelain`);
    if (statusR) {
      console.error(`Error: worktree '${name}' has uncommitted changes:\n${statusR}`);
      console.error("Commit or stash changes before rebasing.");
      process.exit(1);
    }
    const branchR = getMainBranch();
    console.log(`Rebasing '${name}' onto '${branchR}'...`);
    run(`git rebase "${branchR}"`, { cwd: worktreePath_r });
    console.log(`\nRebased '${name}' onto '${branchR}'.`);
    break;
  }

  case "clean": {
    const name = args[0] ?? detectWorktreeName();
    if (!name) {
      console.error("Usage: sd-worktree.mjs clean [name]  (or run inside .worktrees/<name>)");
      process.exit(1);
    }
    // worktree 안에서 실행 시 차단
    const worktreePath = resolve(mainWorktree, ".worktrees", name);
    const cwd = process.cwd();
    if (cwd === worktreePath || cwd.startsWith(worktreePath + "/")) {
      console.error(`Error: Cannot clean '${name}' from inside its worktree.`);
      console.error(
        `Run: cd "${mainWorktree}" && node .claude/skills/sd-worktree/sd-worktree.mjs clean ${name}`,
      );
      process.exit(1);
    }
    if (existsSync(worktreePath)) {
      console.log(`Removing worktree: .worktrees/${name}`);
      run(`git worktree remove "${worktreePath}"`, { cwd: mainWorktree });
    }
    console.log(`Deleting branch: ${name}`);
    run(`git branch -d "${name}"`, { cwd: mainWorktree });
    console.log(`\nCleaned up '${name}'.`);
    break;
  }

  default:
    console.error("Usage: sd-worktree.mjs <add|merge|rebase|clean> [name]");
    process.exit(1);
}
