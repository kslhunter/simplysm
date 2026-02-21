export default {
  extends: ["stylelint-config-standard", "stylelint-config-tailwindcss"],
  plugins: ["stylelint-no-unsupported-browser-features", "stylelint-no-unresolved-module"],
  rules: {
    // Chrome 84+ 호환성 체크
    "plugin/no-unsupported-browser-features": [
      true,
      {
        severity: "error",
        browsers: ["chrome >= 84"],
        ignore: ["css-cascade-layers", "css-nesting", "css-overflow"],
      },
    ],
    // inset은 Chrome 87+이므로 shorthand 강제 비활성화
    "declaration-block-no-redundant-longhand-properties": [true, { ignoreShorthands: ["inset"] }],
    // @import, url() 파일 존재 체크
    "plugin/no-unresolved-module": true,
  },
};
