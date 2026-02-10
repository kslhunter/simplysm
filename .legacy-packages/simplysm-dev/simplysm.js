/** @type {import("@simplysm/sd-cli").TSdProjectConfigFn} */
export default () => ({
  localUpdates: {
    "@simplysm/*": "../simplysm/packages/*",
  },
  packages: {
    "client-devtool": {
      type: "client",
      server: "server",
      builder: {
        electron: {
          appId: "심플리즘 개발자 도구",
          installerIcon: "res/icon.png",
          reinstallDependencies: ["cpu-features"],
        },
      },
      publish: getPublishConfig("client-devtool"),
    },
    "server": {
      type: "server",
      pm2: {
        ignoreWatchPaths: ["_logs"],
      },
      publish: getPublishConfig(),
    },
  },
});

/** @returns {import("@simplysm/sd-cli").ISdFtpPublishConfig} */
function getPublishConfig(clientName = undefined) {
  return {
    type: "sftp",
    host: "simplysm.co.kr",
    port: 22,
    path: `/srv/pm2/simplysm-dev${clientName ? `/www/${clientName}` : ""}`,
    user: "root",
    pass: "12tlavmf#$",
  };
}
