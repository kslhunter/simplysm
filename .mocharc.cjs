process.env.TS_NODE_PROJECT = "tests/tsconfig.json";
process.env.TS_NODE_TRANSPILE_ONLY = "true";

module.exports = {
  "timeout": 10 * 60 * 1000,
  "node-option": [
    "experimental-specifier-resolution=node",
    "experimental-import-meta-resolve",
    "loader=./lib/ts-node-esm-paths.mjs",
    "max-old-space-size=8192"
  ]
}
