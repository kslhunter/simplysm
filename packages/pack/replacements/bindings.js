const Logger = require("@simplism/core").Logger;

module.exports = exports = function (str) {
    if (str.startsWith("bufferutil")) {
        const result = require("bufferutil/build/Release/bufferutil.node");
        result.path = "bufferutil/build/Release/bufferutil.node";
        return result;
    }
    else if (str.startsWith("validation")) {
        const result = require("utf-8-validate/build/Release/validation.node");
        result.path = "utf-8-validate/build/Release/validation.node";
        return result;
    }

    Logger.getLogger("bindings").warn("미지정:", str);
};