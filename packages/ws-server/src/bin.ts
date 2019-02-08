#!/usr/bin/env node

import "@simplysm/common";
import * as fs from "fs";
import * as path from "path";

fs.copyFileSync(path.resolve(__dirname, "../lib/app.js"), path.resolve(process.cwd(), "app.js"));
fs.writeFileSync(
  "pm2.json",
  JSON.stringify({
    apps: [
      {
        name: process.cwd().replace(/\//g, "\\").split("\\").last(),
        script: "./app.js",
        args: [process.argv[2]],
        watch: [
          path.resolve(process.cwd(), "node_modules"),
          "pm2.json",
          "package.json",
          "app.js"
        ],
        env: {
          "NODE_ENV": "production"
        }
      }
    ]
  }, undefined, 2)
);