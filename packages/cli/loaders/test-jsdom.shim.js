const {JSDOM} = require("jsdom");

const jsdom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", JSON.parse(process.env.JSDOM_CONFIG));

global.XMLHttpRequest = jsdom.window.XMLHttpRequest;
global.window = jsdom.window;
global.document = jsdom.window.document;
global.location = jsdom.window.location;
global.navigator = jsdom.window.navigator;
global.localStorage = {
  getItem: function (key) {
    return this[key];
  },
  setItem: function (key, value) {
    this[key] = value;
  }
};

global.Event = jsdom.window.Event;
global.FocusEvent = jsdom.window.FocusEvent;
global.KeyboardEvent = jsdom.window.KeyboardEvent;

global.File = jsdom.window.File;
global.FileReader = jsdom.window.FileReader;

global.WebSocket = jsdom.window.WebSocket;

global.Node = jsdom.window.Node;
global.Element = jsdom.window.Element;
global.HTMLElement = jsdom.window.HTMLElement;

global.confirm = () => true;

global.window = jsdom.window;
global.window.ResizeObserver = function () {
};
global.window.ResizeObserver.prototype.observe = function () {
};
global.window.ResizeObserver.prototype.disconnect = function () {
};

global.CSS = null;