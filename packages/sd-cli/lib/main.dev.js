require("@simplysm/sd-core-common");
require("element-qsa-scope");
require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");

require("events").EventEmitter.defaultMaxListeners = 0;

const ApplicationRef = require("@angular/core").ApplicationRef;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const AppModule = require("SD_APP_MODULE").AppModule;

let ngModuleRef;

function start() {
  // TODO: IE 에서 새로고침 반응이 너무 느린 현상 수정 필요
  module.hot.accept();

  platformBrowserDynamic().bootstrapModule(AppModule)
    .then(mod => {
      ngModuleRef = mod;
    })
    .catch(err => {
      console.error(err);
    });

  module.hot.dispose(() => {
    const appRef = ngModuleRef.injector.get(ApplicationRef);

    // 새 엘리먼트 넣기
    console.log("새 엘리먼트 넣기");
    const prevEls = appRef.components.map(cmp => cmp.location.nativeElement);
    for (const prevEl of prevEls) {
      const newEl = document.createElement(prevEl.tagName);
      prevEl.parentNode.insertBefore(newEl, prevEl);
    }

    // 이전 스타일 삭제
    console.log("이전 스타일 삭제");
    const prevNgStyleEls = Array.from(document.head.querySelectorAll(":scope > style"))
      .filter(styleEl => styleEl.innerText.indexOf("_ng") !== -1);

    for (const prevNgStyleEl of prevNgStyleEls) {
      document.head.removeChild(prevNgStyleEl);
    }

    // 이전 ngModule 지우기
    console.log("이전 ngModule 지우기");
    try {
      ngModuleRef.destroy();
    }
    catch (err) {
      console.error(err);
    }

    // 이전 엘리먼트 삭제
    console.log("이전 엘리먼트 삭제");
    for (const prevEl of prevEls) {
      if (prevEl.parentNode) {
        prevEl.parentNode.removeChild(prevEl);
      }
    }
    console.log("작업 완료");
  });
}

start();
