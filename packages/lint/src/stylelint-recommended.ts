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
      },
    ],
    // @import, url() 파일 존재 체크
    "plugin/no-unresolved-module": true,
  },
};
