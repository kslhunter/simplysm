require("core-js/es6/array");
require("core-js/es6/date");
require("core-js/es6/function");
require("core-js/es6/index");
require("core-js/es6/map");
require("core-js/es6/math");
require("core-js/es6/number");
require("core-js/es6/object");
require("core-js/es6/parse-float");
require("core-js/es6/parse-int");
require("core-js/es6/promise");
require("core-js/es6/reflect");
require("core-js/es6/regexp");
require("core-js/es6/set");
require("core-js/es6/string");
require("core-js/es6/symbol");
require("core-js/es6/typed");
require("core-js/es6/weak-map");
require("core-js/es6/weak-set");

require("core-js/es7/array");
require("core-js/es7/asap");
require("core-js/es7/error");
require("core-js/es7/global");
require("core-js/es7/index");
require("core-js/es7/map");
require("core-js/es7/math");
require("core-js/es7/object");
require("core-js/es7/observable");
require("core-js/es7/promise");
require("core-js/es7/reflect");
require("core-js/es7/set");
require("core-js/es7/string");
require("core-js/es7/symbol");
require("core-js/es7/system");
require("core-js/es7/weak-map");
require("core-js/es7/weak-set");

require("classlist.js");
require("web-animations-js");

(function () {
  if (Element.prototype.matches) return false; //If not IE

  Element.prototype.matches = Element.prototype.msMatchesSelector;
})();


(function () {
  if (Element.prototype.remove) return false; //If not IE
  Element.prototype.remove = function () {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  };
})();

(function () {
  if (typeof window.CustomEvent === "function") return false; //If not IE

  function CustomEvent(event, params) {
    params = params || {bubbles: false, cancelable: false, detail: undefined};
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();

require("zone.js/dist/zone");

const AppModule = require("SIMPLISM_CLIENT_APP_MODULE").AppModule;
const hmrBootstrap = require("@simplism/angular-hmr").hmrBootstrap;

if (process.env.NODE_ENV !== "production") {
  require("zone.js/dist/long-stack-trace-zone");
  Error.stackTraceLimit = Infinity;
}

if (process.env.NODE_ENV === "production") {
  const enableProdMode = require("@angular/core").enableProdMode;
  enableProdMode();
}

if (process.env.PLATFORM === "android") {
  document.addEventListener("deviceready", () => {
    hmrBootstrap(module, AppModule);
  }, false);
}
else {
  hmrBootstrap(module, AppModule);
}
