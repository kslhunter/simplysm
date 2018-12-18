const os = require('os');

module.exports = exports = function (str) {
  if (str.includes("bufferutil")) {
    const result = os.arch() === 'ia32'
      ? require("bufferutil/prebuilds/win32-ia32/node-napi.node")
      : require("bufferutil/prebuilds/win32-x64/node-napi.node");
    result.path = "bufferutil/prebuilds/win32-" + os.arch() + "/node-napi.node";
    return result;
  }
  else if (str.includes("utf-8-validate")) {
    const result = os.arch() === 'ia32'
      ? require("utf-8-validate/prebuilds/win32-ia32/node-napi.node")
      : require("utf-8-validate/prebuilds/win32-x64/node-napi.node");
    result.path = "utf-8-validate/prebuilds/win32-" + os.arch() + "/node-napi.node";
    return result;
  }

  throw new Error("미지정: " + str);
};
