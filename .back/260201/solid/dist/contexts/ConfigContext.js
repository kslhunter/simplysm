import { createContext, useContext } from "solid-js";
const ConfigContext = createContext();
const ConfigProvider = (props) => {
  return /* @__PURE__ */ React.createElement(ConfigContext.Provider, { value: { clientName: props.staticClientName } }, props.children);
};
function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error(
      '[useConfig] ConfigProvider \uB0B4\uBD80\uC5D0\uC11C \uC0AC\uC6A9\uD574\uC57C \uD569\uB2C8\uB2E4.\nConfigProvider\uB294 \uC571\uC758 \uB8E8\uD2B8\uC5D0 \uBC30\uCE58\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4.\n\uC608: <ConfigProvider staticClientName="my-app">...</ConfigProvider>'
    );
  }
  return ctx;
}
export {
  ConfigProvider,
  useConfig
};
//# sourceMappingURL=ConfigContext.js.map
