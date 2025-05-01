#!/usr/bin/env node

// dist의 ESM CLI 파일로 위임
import('../dist/sd-cli.js').catch((err) => {
  console.error(err);
  process.exit(1);
});