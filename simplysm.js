export default (dev, opt) => ({
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
    "sd-tabler-icons": {
      type: "library",
      publish: "npm",
      noBuild: true,
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
    "sd-orm-node-mssql": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-orm-node-mysql": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-orm-node-sqlite": {
      type: "library",
      publish: "npm",
      polyfills: ["@simplysm/sd-core-common"],
    },
    "sd-pop3": {
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
    "ts-transformer-keys": {
      type: "library",
      publish: "npm",
    },
    "types-cordova-plugin-ionic-webview": {
      type: "library",
      publish: "npm",
      noGenIndex: true,
    },
    ...(opt.includes("withTest")
      ? {
          "cordova-test": {
            type: "client",
            server: "server-test",
            builder: {
              cordova: {
                appId: "kr.co.simplysm.cordova.test",
                appName: "Simplysm Cordova Test",
                plugins: [
                  "../../../packages/cordova-plugin-auto-update",
                  "../../../packages/cordova-plugin-file-system",
                  "../../../packages/cordova-plugin-usb-storage",
                ],
                icon: "res/icon.png",
                debug: true,
                platform: {
                  android: {
                    ...(dev
                      ? {}
                      : {
                          sign: {
                            keystore: "res/simplysm.keystore",
                            storePassword: "12tlavmf#$",
                            alias: "simplysm",
                            password: "12tlavmf#$",
                            keystoreType: "pkcs12",
                          },
                        }),
                  },
                },
              },
            },
          },
          "server-test": {
            type: "server",
          },
        }
      : {}),
  },
});
