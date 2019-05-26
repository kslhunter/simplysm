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
      const prevEls = appRef.components.map(cmp => cmp.location.nativeElement);
      for (const prevEl of prevEls) {
        const newEl = document.createElement(prevEl.tagName);
        prevEl.parentNode.insertBefore(newEl, prevEl);
      }
      ngModuleRef.destroy();
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
