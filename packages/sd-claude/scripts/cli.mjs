#!/usr/bin/env node

const command = process.argv[2];

if (command === "postinstall") {
  await import("./postinstall.mjs");
} else {
  console.log("Usage: sd-claude <command>");
  console.log("Commands:");
  console.log("  postinstall   Install Claude Code assets to .claude/");
  process.exit(1);
}
