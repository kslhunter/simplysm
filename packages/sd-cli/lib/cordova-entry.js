/* eslint-disable */

const script = document.createElement("script");
script.defer = true;

if (process.env["NODE_ENV"] === "production") {
  script.src = "cordova.js";
}
else {
  if (navigator.userAgent.toLowerCase().indexOf("android") !== -1) {
    script.src = "cordova-android/cordova.js";
  }
  else {
    script.src = "cordova-browser/cordova.js";
  }
}

document.body.appendChild(script);
