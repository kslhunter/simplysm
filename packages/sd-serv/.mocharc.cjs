process.env.TS_NODE_PROJECT = "tsconfig.json";
process.env.TS_NODE_TRANSPILE_ONLY = "true";

module.exports = {
  "timeout": 10 * 60 * 1000,
  "node-option": ["import=tsx"],
};
