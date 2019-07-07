require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");
require("zone.js/dist/long-stack-trace-zone");
const ngCore = require("@angular/core");
const {platformBrowserDynamic} = require("@angular/platform-browser-dynamic");
const {AppModule} = require("SIMPLYSM_CLIENT_APP_MODULE");

Error.stackTraceLimit = Infinity;

platformBrowserDynamic().bootstrapModule(AppModule).then(ngModuleRef => {
  if (module.hot) {
    const appRef = ngModuleRef.injector.get(ngCore.ApplicationRef);

    module.hot.accept();
    module.hot.dispose(() => {
      console.clear();
      // 새 엘리먼트 넣기
      const prevEls = appRef.components.map(cmp => cmp.location.nativeElement);
      for (const prevEl of prevEls) {
        const newEl = document.createElement(prevEl.tagName);
        prevEl.parentNode.insertBefore(newEl, prevEl);
      }

      // 이전 스타일 삭제
      const prevNgStyleEls = document.head.findAll("> style")
        .filter(styleEl => styleEl.innerText.indexOf("_ng") !== -1);

      for (const prevNgStyleEl of prevNgStyleEls) {
        document.head.removeChild(prevNgStyleEl);
      }

      // 이전 ngModule 지우기
      ngModuleRef.destroy();

      // 이전 엘리먼트 삭제
      for (const prevEl of prevEls) {
        try {
          prevEl.parentNode.removeChild(prevEl);
        }
        catch (err) {
        }
      }
    });
  }
}).catch(err => console.error(err));
