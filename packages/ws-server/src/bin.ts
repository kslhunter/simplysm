#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

fs.copyFileSync(path.resolve(__dirname, "../lib/app.js"), process.cwd());
fs.writeFileSync(
  "pm2.json",
  JSON.stringify({
    apps: [
      {
        name: process.cwd().replace(/\//g, "\\").split("\\").last(),
        script: "app.js " + process.argv[2],
        watch: [
          path.resolve(require.resolve("@simplysm/ws-server"), "dist"),
          "pm2.json",
          "app.js"
        ],
        env: {
          "NODE_ENV": "production"
        }
      }
    ]
  }, undefined, 2)
);