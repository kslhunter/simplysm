# 클라이언트 패키지에 ServiceWorker 기능 추가

## @angular/service-worker 의존성 추가

package.json

``` json
{
  ...,
  "dependencies": {
    "@angular/service-worker": "^14.1.1",
    ...
  }
}
```

## 패키지 루트에 ngsw-config.json 파일 추가

```json
{
  "$schema": "../../node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.json",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|jpeg|png|webp|gif|otf|ttf|woff|woff2|ani|csv|xlsx|pptx|docx|zip|xls|ppt|doc)"
        ]
      }
    }
  ]
}
```


## ServiceWorkerModule 추가

AppModule.ts

``` ts
@NgModule({
  imports: [
    ServiceWorkerModule.register("ngsw-worker.js", {
      enabled: process.env["NODE_ENV"] === "production",
      registrationStrategy: "registerWhenStable:30000"
    }),
    ...
  ]
})
export class AppModule implements DoBootstrap {
  ...
}
```

## ServiceWorker 업데이트 체크 로직 추가

AppModule.ts

``` ts
@NgModule({
  ...
})
export class AppModule implements DoBootstrap {
  ...
   
  public constructor(private readonly _swUpdate: SwUpdate) {
  }
  
  public async ngDoBootstrap(appRef: ApplicationRef): Promise<void> {
    ...
    appRef.bootstrap(AppPage);

    // 업데이트 체크 (비동기)
    if (this._swUpdate.isEnabled) {
      if (await this._swUpdate.checkForUpdate()) {
        if (window.confirm("클라이언트가 업데이트되었습니다. 새로고침하시겠습니까?\n\n  - 새로고침하지 않으면 몇몇 기능이 정상적으로 동작하지 않을 수 있습니다.")) {
          await this._swUpdate.activateUpdate();
          window.location.reload();
        }
      }
    }
  }
}
```
