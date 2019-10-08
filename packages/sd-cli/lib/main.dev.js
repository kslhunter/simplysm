require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");

const ApplicationRef = require("@angular/core").ApplicationRef;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const AppModule = require("SD_APP_MODULE").AppModule;

let ngModuleRef;

function start() {
  module["hot"].accept();

  platformBrowserDynamic().bootstrapModule(AppModule)
    .then(mod => {
      ngModuleRef = mod;
    })
    .catch(err => {
      console.error(err);
    });

  module["hot"].dispose(() => {
    // console.clear();
    const appRef = ngModuleRef.injector.get(ApplicationRef);

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

if (process.env.SD_PLATFORM) {
  window.addEventListener = function () {
    EventTarget.prototype.addEventListener.apply(this, arguments);
  };
  window.removeEventListener = function () {
    EventTarget.prototype.removeEventListener.apply(this, arguments);
  };
  document.addEventListener = function () {
    EventTarget.prototype.addEventListener.apply(this, arguments);
  };
  document.removeEventListener = function () {
    EventTarget.prototype.removeEventListener.apply(this, arguments);
  };

  start();
}
else {
  start();
}