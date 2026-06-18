#!/usr/bin/env node

const subcommand = process.argv[2];
const action = process.argv[3];

if (subcommand === "auth") {
  const auth = await import("./auth.mjs");
  if (action === "save") {
    await auth.save();
  } else if (action === "switch") {
    await auth.switch_();
  } else {
    printUsage();
    process.exit(1);
  }
} else {
  printUsage();
  process.exit(1);
}

function printUsage() {
  console.log("사용법: sd-claude <command>");
  console.log("");
  console.log("Commands:");
  console.log("  auth save     현재 계정을 저장합니다");
  console.log("  auth switch   저장된 계정 목록에서 선택하여 전환합니다");
}
