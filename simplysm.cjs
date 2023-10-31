/** @type {import('@simplysm/sd-cli').TSdCliConfigFn} */
module.exports = () => ({
  packages: {
    "eslint-plugin": {
      type: "library",
      publish: "npm"
    },
    "extless-loader": {
      type: "library",
      publish: "npm"
    },
    "sd-angular": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-browser"
      ]
    },
    "sd-cli": {
      type: "library",
      publish: "npm"
    },
    "sd-core-browser": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-common"
      ]
    },
    "sd-core-common": {
      type: "library",
      publish: "npm",
      polyfills: [
        "reflect-metadata"
      ]
    },
    "sd-core-node": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-common"
      ]
    },
    "sd-excel": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-common"
      ]
    },
    "sd-orm-common": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-common"
      ]
    },
    "sd-orm-node": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-common"
      ]
    },
    "sd-orm-node-mssql": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-common"
      ]
    },
    "sd-orm-node-mysql": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-common"
      ]
    },
    "sd-orm-node-sqlite": {
      type: "library",
      publish: "npm",
      polyfills: [
        "@simplysm/sd-core-common"
      ]
    },
    "sd-service-client": {
      type: "library",
      publish: "npm"
    },
    "sd-service-common": {
      type: "library",
      publish: "npm"
    },
    "sd-service-server": {
      type: "library",
      publish: "npm"
    },
    "sd-storage": {
      type: "library",
      publish: "npm"
    }
  }
});
