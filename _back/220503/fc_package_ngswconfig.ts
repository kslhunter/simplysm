export const fc_package_ngswconfig = (): string => JSON.stringify({
  $schema: "../../node_modules/@angular/service-worker/config/schema.json",
  index: "/index.html",
  assetGroups: [
    {
      name: "app",
      installMode: "prefetch",
      resources: {
        files: [
          "/favicon.ico",
          "/index.html",
          "/manifest.json",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      name: "assets",
      installMode: "lazy",
      updateMode: "prefetch",
      resources: {
        files: [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|jpeg|png|webp|gif|otf|ttf|woff|woff2|ani|xlsx|pptx|docx|zip|xls|ppt|doc)"
        ]
      }
    }
  ]
}, undefined, 2);
