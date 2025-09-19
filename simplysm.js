export default () => ({
  packages: {
    "cordova-plugin-auto-update": {
      type: "library",
      publish: "npm",
    },
    "cordova-plugin-usb-storage": {
      type: "library",
      publish: "npm",
    },
    "cordova-plugin-file-system": {
      type: "library",
      publish: "npm",
    },
    "eslint-plugin": {
      type: "library",
      publish: "npm",
    },
    "sd-angular": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-browser"],
    },
    "sd-cli": {
      type: "library",
      noGenIndex: true,
      publish: "npm",
    },
    "sd-core-browser": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-core-common": {
      type: "library",
      publish: "npm",
      polyfills: ["reflect-metadata"],
    },
    "sd-core-node": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-excel": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-orm-common": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-orm-common-ext": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-orm-node": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-service-client": {
      type: "library",
      publish: "npm",
    },
    "sd-service-common": {
      type: "library",
      publish: "npm",
    },
    "sd-service-server": {
      type: "library",
      publish: "npm",
    },
    "sd-storage": {
      type: "library",
      publish: "npm",
    },
  },
});
