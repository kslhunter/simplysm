require("core-js/es7/reflect");
require("zone.js/dist/zone");

const AppModule = require("SIMPLYSM_CLIENT_APP_MODULE").AppModule;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const ApplicationRef = require("@angular/core").ApplicationRef;

if (process.env.NODE_ENV !== "production") {
  require("zone.js/dist/long-stack-trace-zone");
  Error.stackTraceLimit = Infinity;
}

if (process.env.NODE_ENV === "production") {
  const enableProdMode = require("@angular/core").enableProdMode;
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .then(ngModuleRef => {
    if (module.hot) {
      const appRef = ngModuleRef.injector.get(ApplicationRef);

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

    /*if (process.env.NODE_ENV === "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register('service-worker.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      }
    }*/
  });