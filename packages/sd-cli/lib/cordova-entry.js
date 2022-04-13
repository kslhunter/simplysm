/* eslint-disable */

const script = document.createElement("script");
script.type = "text/javascript";

if (process.env["NODE_ENV"] === "development") {
  if (navigator.userAgent.toLowerCase().indexOf("android") !== -1) {
    script.src = "cordova-android/cordova.js";
  }
  else {
    script.src = "cordova-browser/cordova.js";
  }
}
else {
  script.src = "cordova.js";
}

document.body.appendChild(script);
