export default {
  extends: ["stylelint-config-standard", "stylelint-config-tailwindcss"],
  plugins: ["stylelint-no-unsupported-browser-features", "stylelint-no-unresolved-module"],
  rules: {
    // Chrome 84+ compatibility check
    "plugin/no-unsupported-browser-features": [
      true,
      {
        severity: "error",
        browsers: ["chrome >= 84"],
        ignore: ["css-cascade-layers", "css-nesting", "css-overflow"],
      },
    ],
    // inset requires Chrome 87+, so enforce shorthand is disabled
    "declaration-block-no-redundant-longhand-properties": [true, { ignoreShorthands: ["inset"] }],
    // Check for file existence in @import and url()
    "plugin/no-unresolved-module": true,
  },
};
