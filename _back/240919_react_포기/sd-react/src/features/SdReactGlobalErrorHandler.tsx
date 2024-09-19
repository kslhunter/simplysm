import { component } from "../utils/component";
import { useSdSystemLog } from "../contexts/SdSystemLogContext";

export const SdReactGlobalErrorHandler = component("SdReactGlobalErrorHandler", () => {
  const sdSystemLog = useSdSystemLog();

  window.onunhandledrejection = (event) => {
    const err = event.reason;
    displayError(err);
  };

  window.onerror = (message, source, lineno, colno, error) => {
    displayError(error!);
  };

  function displayError(error: Error) {
    const divEl = document.createElement("div");
    divEl.style.position = "fixed";
    divEl.style.top = "0";
    divEl.style.left = "0";
    divEl.style.width = "100%";
    divEl.style.height = "100%";
    divEl.style.color = "white";
    divEl.style.background = "rgba(0,0,0,.6)";
    divEl.style.zIndex = "9999";
    divEl.style.overflow = "auto";
    divEl.style.padding = "4px";

    divEl.innerHTML = `<pre style="font-size: 12px; font-family: monospace; line-height: 1.4em;">${error.stack ?? error.message}</pre>`;

    try {
      // appRef["_views"][0]["rootNodes"][0].appendChild(divEl);
      document.body.replaceChildren(divEl);
      divEl.onclick = () => {
        location.hash = "/";
        location.reload();
      };

      void sdSystemLog.writeAsync("error", error.stack ?? error.message);
    }
    catch {
    }
  }

  return <></>;
});