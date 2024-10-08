const tsx = require("tsx/cjs/api");
const { workerData } = require("piscina");

tsx.register();
module.exports = require(workerData.__file__);
