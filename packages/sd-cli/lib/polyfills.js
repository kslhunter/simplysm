"use strict";

if (
  (navigator.appName === "Netscape" && navigator.userAgent.search("Trident") !== -1) ||
  (navigator.userAgent.toLowerCase().indexOf("msie") !== -1)
) { // IE 일 경우
  require("eventsource-polyfill");
}