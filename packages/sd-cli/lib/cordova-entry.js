/* eslint-disable */

const script = document.createElement("script");
script.onload = () => {
  console.log("cordova.js Loaded");
};

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

script.defer = true;

document.body.appendChild(script);
