module.exports = exports = function (str) {
  if (str.includes("bufferutil")) {
    const result = require("bufferutil/prebuilds/win32-x64/node-napi.node");
    result.path = "bufferutil/prebuilds/win32-x64/node-napi.node";
    return result;
  }
  else if (str.includes("utf-8-validate")) {
    const result = require("utf-8-validate/prebuilds/win32-x64/node-napi.node");
    result.path = "utf-8-validate/prebuilds/win32-x64/node-napi.node";
    return result;
  }

  throw new Error("미지정: " + str);
};
