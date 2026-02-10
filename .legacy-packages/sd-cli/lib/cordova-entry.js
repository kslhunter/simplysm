/* eslint-disable */

// DS60S에서 onload없이 하니 document.body가 생성되기 전에 호출되서 먹통되버림
window.onload = () => {
  const script = document.createElement("script");
  script.onload = () => {
    console.log("cordova.js Loaded");
  };

  script.onerror = (err) => {
    console.error(err);
  };

  if (process.env["NODE_ENV"] === "production") {
    script.src = "cordova.js";
  } else {
    if (navigator.userAgent.toLowerCase().indexOf("android") !== -1) {
      script.src = "cordova-android/cordova.js";
    } else {
      script.src = "cordova-browser/cordova.js";
    }
  }

  script.defer = true;

  document.body.appendChild(script);
};
