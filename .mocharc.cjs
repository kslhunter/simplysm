process.env.TS_NODE_PROJECT = "tests/tsconfig.json";
process.env.TS_NODE_TRANSPILE_ONLY = "true";

module.exports = {
  "timeout": 10000,
  "node-option": [
    "experimental-specifier-resolution=node",
    "experimental-import-meta-resolve",
    "loader=./packages/sd-cli/lib/ts-node-esm-paths.mjs"
  ]
}
